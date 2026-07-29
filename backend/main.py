from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from hmac import compare_digest
from dotenv import load_dotenv
from gemini_helper import get_gemini_response
from context import get_knowledge
from docs_helper import (
    read_markdown_file, PROFILE_DIR,
    get_all_projects, get_project_by_slug, get_featured_projects,
    get_all_writing, get_writing_by_slug
)
from rate_limit import chat_limiter, contact_limiter, enforce_rate_limit
from pydantic import BaseModel, EmailStr, Field
from typing import Dict, List, Optional
import os
from os import getenv
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import logging
import re
from email_validator import EmailNotValidError, validate_email  

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Unexpected exceptions are logged server-side with a stack trace and reported to
# clients as this opaque string, so internal paths and configuration details are
# never reflected back in an error response.
INTERNAL_ERROR_DETAIL = "Internal server error"

# Replies for the contact flow, in one place so the three paths that can accept
# an address cannot drift into three different voices. They previously did: one
# opened "✉️ 👱🏻‍♂️ ✉️" and ran four emoji-laden paragraphs, another was a flat
# one-liner, and the prompt that asked for the address opened with "I'd be happy
# to help with that!".
#
# The site answers in Yanir's first person and its whole argument is that it does
# not overstate. A gushing confirmation is the one message a visitor is
# guaranteed to read, so it is the worst place to sound like a different product.
EMAIL_RECEIVED_MESSAGE = (
    "Got it - that's in my inbox and I'll reply from there. "
    "Anything else you want to ask while you're here?"
)

EMAIL_INVALID_MESSAGE = (
    "That address doesn't look right. Check it and send it again, "
    "or write to rotyanir@gmail.com directly."
)

EMAIL_REQUEST_MESSAGE = (
    "Sure. Leave your email address here with a line about what you'd like to "
    "discuss, and I'll get back to you directly."
)

# Sending is best-effort from the visitor's side: if SMTP is down, telling them
# the message vanished is worse than giving them the address to use instead.
EMAIL_SEND_FAILED_MESSAGE = (
    "I couldn't get that through to my inbox just now - something on my side. "
    "Write to rotyanir@gmail.com directly and it will reach me."
)

# Phrases that express an intent to make contact, as opposed to any message that
# happens to contain the word "email".
#
# The previous test was `"contact" in message or "email" in message or
# "newsletter" in message`, which intercepted the question before it ever reached
# the model - so "how does your backend send email?" was answered with a request
# for the visitor's address instead of an answer about the backend. On a site
# whose argument is that it answers from its sources, silently refusing to answer
# a legitimate question is the most expensive bug available.
# A message can contain a contact phrase and still be a question about the work.
# "How does your email integration work?" holds "your email" but is asking about a
# system, not for an address, and answering it with the contact prompt is the same
# class of false positive the phrase list was introduced to remove.
#
# The discriminator is grammatical rather than a list of technical nouns, which
# would need extending forever: a question *about* something is third person or
# addressed to Yanir's practice ("how does...", "how do you...", "what did you
# learn..."), while a contact request is first person and addressed at him
# ("how do I reach you", "can I contact you"). Note "how do you" is excluded and
# "how do I" is not - that single word is the difference.
_TOPIC_QUESTION = re.compile(
    r"\bhow (?:does|did|is|are|was|do you|would you|should you)\b"
    r"|\bwhat (?:did|do) you (?:learn|use|build|do|run|choose)\b"
    r"|\bwhy (?:does|did|is|are|do you)\b",
    re.IGNORECASE,
)

CONTACT_INTENT_PHRASES = (
    "your email",
    "email you",
    "contact you",
    "get in touch",
    "in touch",
    "reach out",
    "reach you",
    "hire you",
    "work with you",
    "work together",
    "email address",
)

load_dotenv()

def validate_email_config():
    required_vars = ["EMAIL_ADDRESS", "EMAIL_PASSWORD", "YOUR_EMAIL"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        return False
    return True

if not validate_email_config():
    logger.warning("Email configuration is incomplete. Email functionality will not work!")

FRONTEND_PROD_URL = getenv("FRONTEND_PROD_URL", "")
FRONTEND_DEV_URL = getenv("FRONTEND_DEV_URL", "http://localhost:3000")
FRONTEND_VITE_URL = getenv("FRONTEND_VITE_URL", "http://127.0.0.1:3000")
BACKEND_URL = getenv("BACKEND_URL", "http://127.0.0.1:8000")

# Local dev hosts are always permitted. Deployed origins are assembled from the
# FRONTEND_* vars above plus a comma-separated ALLOWED_ORIGINS, so pointing the
# API at a new frontend host (Cloudflare Pages, a custom domain) is a config
# change rather than a code change. No wildcard: allow_credentials is enabled.
_DEV_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def _build_allowed_origins() -> List[str]:
    configured = [FRONTEND_PROD_URL, FRONTEND_DEV_URL, FRONTEND_VITE_URL]
    configured += getenv("ALLOWED_ORIGINS", "").split(",")

    origins: List[str] = []
    seen = set()
    for origin in _DEV_ORIGINS + configured:
        origin = origin.strip().rstrip("/")
        if origin and origin not in seen:
            seen.add(origin)
            origins.append(origin)
    return origins


allowed_origins = _build_allowed_origins()
logger.info("CORS allowed origins: %s", allowed_origins)

# Request-size ceilings. Rate limiting caps how *often* a client can call these
# endpoints; nothing capped how *large* a single call could be, so one request
# could carry an arbitrarily long message and an unbounded history array - both
# of which are read, iterated and partly forwarded upstream. Rejecting oversized
# input at the schema means FastAPI answers 422 before any of that happens.
MAX_MESSAGE_CHARS = 2_000
MAX_HISTORY_MESSAGES = 40
MAX_HISTORY_CONTENT_CHARS = 4_000

# Frontend message types that represent something the visitor actually said.
# 'system' and 'initial' are UI chrome (the greeting, error banners); replaying
# them as conversation turns taught the model that its own greeting was part of
# the dialogue. 'quick' is a canned question the visitor clicked, so it is a
# user turn - it was previously mapped to the assistant, which meant every
# quick-reply question arrived attributed to the wrong speaker.
_USER_MESSAGE_TYPES = frozenset({"user", "quick"})
_MODEL_MESSAGE_TYPES = frozenset({"ai"})


class ChatMessage(BaseModel):
    type: str
    content: str = Field(max_length=MAX_HISTORY_CONTENT_CHARS)
    is_email_collection: Optional[bool] = False
    email_collected: Optional[bool] = False

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)
    conversation_history: Optional[List[ChatMessage]] = Field(
        default=None, max_length=MAX_HISTORY_MESSAGES
    )
    collected_email: Optional[EmailStr] = None

class ContactRequest(BaseModel):
    email: str
    message: str


def _to_model_turns(history: Optional[List[ChatMessage]]) -> List[Dict[str, str]]:
    """Maps the frontend's message list to Gemini roles, dropping UI chrome."""
    turns: List[Dict[str, str]] = []
    for message in history or []:
        if message.type in _USER_MESSAGE_TYPES:
            role = "user"
        elif message.type in _MODEL_MESSAGE_TYPES:
            role = "model"
        else:
            continue
        turns.append({"role": role, "content": message.content})
    return turns

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = FastAPI()

# Shared secret proving a request arrived through Cloudflare rather than by
# calling the run.app URL directly.
#
# CORS does not do this job and never did. It is enforced by browsers, on
# browsers - curl, a script, or anything that simply omits an Origin header is
# unaffected by it. So while the allowlist above stops another website's
# JavaScript using this API, it does nothing about the case that actually
# costs something: somebody pointing a loop at /chat-with-files and burning
# the Gemini quota, or saturating the 40/minute global limiter so real
# visitors get 429s.
#
# The edge injects this header on every request it forwards. The value has to
# be unguessable, because any client can send an arbitrary header - the header
# is not a secret channel, the VALUE is the secret. Cloudflare's own docs make
# the same point about forwarded client-certificate headers.
#
# Unset means unenforced, deliberately. It lets the header be introduced at
# the edge and the frontend be repointed before enforcement begins, so no
# ordering of those deploys can strand the site talking to an API that has
# started rejecting it. Setting the variable is the last step, not the first.
ORIGIN_SHARED_SECRET = getenv("ORIGIN_SHARED_SECRET", "").strip()

# Paths that must stay reachable without the header. Cloud Run's own health
# probing and any uptime check call these, and they neither cost quota nor
# disclose anything.
_UNGUARDED_PATHS = frozenset({"/", "/health"})


@app.middleware("http")
async def require_edge_secret(request: Request, call_next):
    if ORIGIN_SHARED_SECRET and request.url.path not in _UNGUARDED_PATHS:
        # Preflights never carry custom headers - the browser sends them to ask
        # whether the real request may. Rejecting them here would break CORS
        # for the legitimate frontend; the request that follows is still
        # checked.
        if request.method != "OPTIONS":
            presented = request.headers.get("x-edge-auth", "")
            # compare_digest rather than == so the comparison does not return
            # early on the first differing byte.
            if not compare_digest(presented, ORIGIN_SHARED_SECRET):
                logger.warning(
                    "Rejected request to %s without a valid edge secret", request.url.path
                )
                return JSONResponse(status_code=403, content={"detail": "Forbidden"})
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    # Response headers are not readable by cross-origin JavaScript unless they
    # are exposed. Without this the frontend can see the 429 status but not the
    # Retry-After value the limiter computed, so it cannot tell the visitor how
    # long to wait.
    expose_headers=["Retry-After"],
)

@app.get("/")
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "backend",
        "message": "FastAPI is running",
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.get("/api/chat/status")
async def chat_status():
    """Whether the chat has anything to ground its answers in.

    Replaces /check-paths, which returned absolute server filesystem paths, the
    working directory and a listing of the document filenames to any anonymous
    caller. The frontend only ever used it to decide whether to show a "no
    content available" banner, which is one boolean.
    """
    knowledge = get_knowledge()
    return {"knowledge_ready": not knowledge.is_empty}

@app.post("/chat-with-files")
async def chat_with_files(chat_request: ChatRequest, request: Request):
    # Shape only. The visitor's message is their words, not ours to retain in
    # log storage; the previous line logged the entire request object verbatim.
    logger.info(
        "Chat request: %d chars, %d history messages",
        len(chat_request.message),
        len(chat_request.conversation_history or []),
    )
    try:
        enforce_rate_limit(request, chat_limiter, "chat-with-files")

        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=500, 
                detail="GEMINI_API_KEY not found in environment variables"
            )
        
        # Check if message contains ONLY an email address
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        message = chat_request.message.strip()
        is_just_email = re.match(email_pattern, message)
        
        if is_just_email:
            try:
                email = message
                valid = validate_email(email)
                email = valid.email
                
                contact_request = ContactRequest(
                    email=email,
                    message="Address submitted in chat with no accompanying message"
                )

                try:
                    await contact(contact_request)
                except HTTPException:
                    # A delivery failure is ours, not the visitor's. Reporting it
                    # as a 500 would leave them staring at a generic error with
                    # no idea their message went nowhere.
                    logger.exception("Contact delivery failed for direct email submission")
                    return {
                        "response": EMAIL_SEND_FAILED_MESSAGE,
                        "email_collected": False,
                        "is_email_collection": False
                    }

                # The address itself is delivered by email, so there is no reason
                # for a visitor's address to also sit in log storage.
                logger.info("Email notification sent for direct email submission")

                return {
                    "response": EMAIL_RECEIVED_MESSAGE,
                    "email_collected": True,
                    "is_email_collection": False
                }
            except EmailNotValidError:
                return {
                    "response": EMAIL_INVALID_MESSAGE,
                    "email_collected": False,
                    "is_email_collection": True
                }

        # Check if we're in email collection mode
        in_email_collection = any(
            msg.is_email_collection and not msg.email_collected
            for msg in (chat_request.conversation_history or [])[-2:]
        )

        if in_email_collection:
            # Extract email using regex
            email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
            email_match = re.search(email_pattern, chat_request.message)
            
            if email_match:
                try:
                    email = email_match.group(0)
                    valid = validate_email(email)
                    email = valid.email
                    
                    message_content = chat_request.message.replace(email, '').strip()
                    if not message_content:
                        message_content = "Email provided during chat interaction"
                    
                    contact_request = ContactRequest(
                        email=email,
                        message=message_content
                    )

                    try:
                        await contact(contact_request)
                    except HTTPException:
                        logger.exception("Contact delivery failed for chat-collected address")
                        return {
                            "response": EMAIL_SEND_FAILED_MESSAGE,
                            "email_collected": False,
                            "is_email_collection": False
                        }

                    logger.info("Email notification sent for chat-collected address")

                    return {
                        "response": EMAIL_RECEIVED_MESSAGE,
                        "email_collected": True,
                        "is_email_collection": False
                    }
                except EmailNotValidError:
                    return {
                        "response": EMAIL_INVALID_MESSAGE,
                        "email_collected": False,
                        "is_email_collection": True
                    }

        # Check if this is a new email collection request. Matching on intent
        # phrases rather than the bare words "contact"/"email"/"newsletter" is
        # what keeps a question *about* the work from being answered with a
        # request for the visitor's address - see CONTACT_INTENT_PHRASES.
        lowered = chat_request.message.lower()
        should_collect_email = (
            not any(msg.email_collected for msg in chat_request.conversation_history or []) and
            any(phrase in lowered for phrase in CONTACT_INTENT_PHRASES) and
            not _TOPIC_QUESTION.search(chat_request.message)
        )

        if should_collect_email:
            return {
                "response": EMAIL_REQUEST_MESSAGE,
                "is_email_collection": True,
                "email_collected": False
            }
        
        # Normal chat flow - answer from the cached corpus (profile + projects).
        response = get_gemini_response(
            GEMINI_API_KEY,
            chat_request.message,
            get_knowledge(),
            _to_model_turns(chat_request.conversation_history),
        )

        return {"response": response}
        
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error in chat_with_files")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

@app.get("/api/content/{file_name}")
async def get_content(file_name: str):
    try:
        # Resolve and confine to PROFILE_DIR. The router already refuses to match
        # "/" inside a path param, but os.path.join() would silently honour an
        # absolute path, so containment is asserted here rather than assumed.
        profile_root = os.path.realpath(PROFILE_DIR)
        file_path = os.path.realpath(os.path.join(profile_root, file_name))

        if os.path.commonpath([profile_root, file_path]) != profile_root:
            raise HTTPException(status_code=404, detail="File not found")

        if not os.path.isfile(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        content = read_markdown_file(file_path)
        return {"content": content}
    except HTTPException:
        raise
    except Exception:
        logger.exception("get_content failed for %r", file_name)
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

@app.post("/api/contact")
async def contact(request: ContactRequest, http_request: Request = None):
    try:
        # Only rate limited when reached over HTTP. chat_with_files calls this
        # directly (http_request is None) and is already limited upstream, so
        # the internal path must not consume a second slot.
        if http_request is not None:
            enforce_rate_limit(http_request, contact_limiter, "contact")

        # Email configuration
        sender_email = os.getenv("EMAIL_ADDRESS")
        sender_password = os.getenv("EMAIL_PASSWORD")
        receiver_email = os.getenv("YOUR_EMAIL")

        logger.info("Preparing contact notification email")

        if not all([sender_email, sender_password, receiver_email]):
            logger.error("Missing email configuration")
            raise HTTPException(
                status_code=500,
                detail="Email configuration is incomplete"
            )

        # Create message
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = receiver_email
        msg['Subject'] = "New Contact from Portfolio Chat"

        body = f"""
        New contact request from your portfolio chat!
        
        User Email: {request.email}
        Message: {request.message}
        Timestamp: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """

        msg.attach(MIMEText(body, 'plain'))

        try:
            # Send email with explicit logging
            logger.info("Attempting to connect to SMTP server...")
            with smtplib.SMTP_SSL('smtp.gmail.com', 465) as server:
                logger.info("Connected to SMTP server, attempting login...")
                server.login(sender_email, sender_password)
                logger.info("Logged in successfully, sending email...")
                server.send_message(msg)
                logger.info("Contact notification email sent")
        except Exception:
            # The raw SMTP error used to be returned to the client, which could
            # reflect the sender account and server details back to anyone who
            # could make the send fail. Every other handler in this file reports
            # INTERNAL_ERROR_DETAIL; this one was the exception.
            logger.exception("SMTP send failed")
            raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

        return {"status": "success", "message": "Email sent successfully"}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Contact endpoint error")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

# `log_collected_email` was removed here. It appended every visitor's address to
# `collected_emails.json` inside the container - a file that Cloud Run's
# scale-to-zero deletes, so it was never readable and never a record of anything.
# The trade it made was the worst available: personal data written to disk in
# exchange for nothing, while the same address was already being delivered by
# email, which is the actual record. The comment three functions above already
# said an address has no reason to sit in log storage; this contradicted it.

# Project endpoints
@app.get("/api/writing")
async def list_writing():
    """Published pieces, newest first.

    Read-only and unauthenticated, like the project endpoints: everything it
    returns is already public on the site it links back to.
    """
    try:
        return {"writing": get_all_writing()}
    except Exception:
        logger.exception("Error listing writing")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)


@app.get("/api/writing/{slug}")
async def get_writing(slug: str):
    try:
        entry = get_writing_by_slug(slug)
        if entry is None:
            raise HTTPException(status_code=404, detail="Not found")
        return {"entry": entry}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching writing %s", slug)
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)


@app.get("/api/projects")
async def get_projects(featured_only: bool = False):
    """Get all projects or only featured projects"""
    try:
        if featured_only:
            projects = get_featured_projects()
        else:
            projects = get_all_projects()
        
        # Remove full content from listing to reduce payload size
        for project in projects:
            if 'content' in project:
                del project['content']
        
        return {"projects": projects}
    except Exception:
        logger.exception("Error fetching projects")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

@app.get("/api/projects/{slug}")
async def get_project(slug: str):
    """Get a specific project by slug"""
    try:
        project = get_project_by_slug(slug)
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        return {"project": project}
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error fetching project %r", slug)
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

