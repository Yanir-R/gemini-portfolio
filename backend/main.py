from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from hmac import compare_digest
from dotenv import load_dotenv
from gemini_helper import Answer, get_gemini_response
from context import get_knowledge
from selection import Selection, select
from docs_helper import (
    read_markdown_file, PROFILE_DIR,
    get_all_projects, get_project_by_slug, get_featured_projects,
    get_all_writing, get_writing_by_slug
)
from rate_limit import chat_limiter, contact_limiter, enforce_rate_limit
from pydantic import BaseModel, EmailStr, Field
from typing import Dict, List, Optional
import os
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
# an address cannot drift into three different voices. The site answers in
# Yanir's first person and its whole argument is that it does not overstate. A
# confirmation is the one message a visitor is guaranteed to read, so it is the
# worst place to sound like a different product.
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

# Detecting an intent to make contact, in two parts.
#
# Matching a bare "contact"/"email"/"newsletter" anywhere in the message would
# intercept it before it ever reached the model, so "how does your backend send
# email?" would be answered with a request for the visitor's address instead of
# an answer about the backend. On a site whose argument is that it answers from
# its sources, silently refusing a legitimate question is the most expensive
# failure available. Hence phrases that express the intent itself.
#
# A message can still contain a contact phrase and be a question about the work:
# "how does your email integration work?" holds "your email" but asks about a
# system. _TOPIC_QUESTION vetoes those. The discriminator is grammatical rather
# than a list of technical nouns, which would need extending forever: a question
# *about* something is third person or addressed to Yanir's practice ("how
# does...", "how do you...", "what did you learn..."), while a contact request is
# first person and addressed at him ("how do I reach you", "can I contact you").
# Note "how do you" is excluded and "how do I" is not - that single word is the
# difference.
_TOPIC_QUESTION = re.compile(
    r"\bhow (?:does|did|is|are|was|do you|would you|should you)\b"
    r"|\bwhat (?:did|do) you (?:learn|use|build|do|run|choose)\b"
    r"|\bwhy (?:does|did|is|are|do you)\b",
    re.IGNORECASE,
)

# An address on its own, versus one embedded in a sentence. Both are deliberately
# loose: `validate_email` is the authority on whether an address is real, and
# these only decide which part of the message to hand it.
_EMAIL_ONLY_RE = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
_EMAIL_IN_TEXT_RE = re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}')

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

FRONTEND_PROD_URL = os.getenv("FRONTEND_PROD_URL", "")
FRONTEND_DEV_URL = os.getenv("FRONTEND_DEV_URL", "http://localhost:3000")
FRONTEND_VITE_URL = os.getenv("FRONTEND_VITE_URL", "http://127.0.0.1:3000")

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
    configured += os.getenv("ALLOWED_ORIGINS", "").split(",")

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
# endpoints, not how *large* a single call may be: without these, one request
# could carry an arbitrarily long message and an unbounded history array, all of
# which is read, iterated and partly forwarded upstream. Declaring the limits on
# the schema means FastAPI answers 422 before any of that happens.
MAX_MESSAGE_CHARS = 2_000
MAX_HISTORY_MESSAGES = 40
MAX_HISTORY_CONTENT_CHARS = 4_000

# Frontend message types that represent something the visitor actually said.
# Anything not listed here is UI chrome - 'system' and 'initial' are the greeting
# and error banners, and replaying them as conversation turns would teach the
# model that its own greeting was part of the dialogue. 'quick' is a canned
# question the visitor clicked, so it counts as a user turn.
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
    # EmailStr rather than str, matching the chat paths, and a length ceiling on
    # the message. Both are declared here rather than checked in the handler so
    # a malformed request is answered 422 before it reaches one - which also
    # means it never spends a rate-limit slot, since FastAPI validates the body
    # before the endpoint runs.
    email: EmailStr
    message: str = Field(max_length=MAX_MESSAGE_CHARS)


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


def _chat_reply(
    response: str,
    email_collected: bool = False,
    is_email_collection: bool = False,
    trace: Optional[Dict[str, object]] = None,
) -> Dict[str, object]:
    """One shape for every chat reply.

    The two flags drive the frontend's collection state, so a reply that omits
    one leaves the client guessing at it.

    `trace` is present only when a model produced the answer. The contact flow
    replies here without calling Gemini at all, and a rail under those would be
    describing a request that never happened.
    """
    return {
        "response": response,
        "email_collected": email_collected,
        "is_email_collection": is_email_collection,
        "trace": trace,
    }


def _answer_trace(answer: Answer, selection: Selection) -> Optional[Dict[str, object]]:
    """What the answer cost, for the rail the site draws beneath it.

    Deliberately only what the system can back. The counts come from the SDK's
    own usage metadata and the document figures from the selection, so every
    number here is measured rather than derived.

    What is *not* here is as considered as what is. There is no confidence
    score, because nothing verifies an answer against the corpus - and a site
    whose argument is that its AI can be caught out would be making exactly the
    claim it warns about. Nor is there a claim about which document an answer
    came *out of*: selection decides what the model was given, and no step
    afterwards records which of those it leaned on. The distinction is the
    difference between a receipt and a guess.

    `outcome` travels with the counts because "these documents were chosen for
    your question" and "nothing distinguished one document from another, so all
    of them went" are different facts. Rendering both as a bare number would
    collapse them into a claim of selectivity the second case cannot support.

    `Knowledge.approx_tokens` is deliberately absent. It is a chars-over-four
    estimate of the same quantity `prompt_tokens` reports exactly, and showing a
    guess beside the measurement of the same thing only invites a reader to work
    out which one to believe. It stays a server-side signal for deciding when
    the corpus needs trimming.
    """
    if not answer.from_model:
        return None

    return {
        "model": answer.model,
        "prompt_tokens": answer.prompt_tokens,
        "thinking_tokens": answer.thinking_tokens,
        "output_tokens": answer.output_tokens,
        "total_tokens": answer.total_tokens,
        "finish_reason": answer.finish_reason,
        "latency_ms": answer.latency_ms,
        # Counts, not names. The kind of document is safe to state; which one an
        # answer leaned on is not knowable here. Pluralisation is left to the
        # frontend, which is where the site's copy lives.
        "context": [
            {"kind": kind, "count": count}
            for kind, count in selection.knowledge.source_counts
        ],
        "context_outcome": selection.outcome,
        "context_available": selection.available,
    }


async def _deliver_collected_email(
    email: str, message_content: str, context: str
) -> Dict[str, object]:
    """Emails an address collected in chat and returns the reply to show for it.

    Both places that accept an address route through here so a delivery failure
    reads the same either way.
    """
    try:
        await _send_contact_email(email, message_content)
    except HTTPException:
        # A delivery failure is ours, not the visitor's. Reporting it as a 500
        # would leave them staring at a generic error with no idea their message
        # went nowhere.
        logger.exception("Contact delivery failed for %s", context)
        return _chat_reply(EMAIL_SEND_FAILED_MESSAGE)

    # The address is delivered by email, which is the record. There is no reason
    # for it to sit in log storage as well.
    logger.info("Email notification sent for %s", context)
    return _chat_reply(EMAIL_RECEIVED_MESSAGE, email_collected=True)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = FastAPI()

# Shared secret proving a request arrived through Cloudflare rather than by
# calling the run.app URL directly.
#
# CORS does not do this job: it is enforced by browsers, on browsers, so curl, a
# script, or anything that omits an Origin header is unaffected. The allowlist
# above stops another website's JavaScript using this API, but does nothing about
# the case that actually costs something - somebody pointing a loop at
# /chat-with-files and burning the Gemini quota, or saturating the global limiter
# so real visitors get 429s.
#
# The edge injects this header on every request it forwards. The value has to be
# unguessable, because any client can send an arbitrary header: the header is not
# a secret channel, the VALUE is the secret. Cloudflare's own docs make the same
# point about forwarded client-certificate headers.
#
# Unset means unenforced, deliberately. That lets the header be introduced at the
# edge and the frontend be repointed before enforcement begins, so no ordering of
# those deploys can strand the site talking to an API that has started rejecting
# it. Setting the variable is the last step, not the first.
ORIGIN_SHARED_SECRET = os.getenv("ORIGIN_SHARED_SECRET", "").strip()

# Paths that must stay reachable without the header. Cloud Run's own health
# probing and any uptime check call these, and they neither cost quota nor
# disclose anything.
_UNGUARDED_PATHS = frozenset({"/", "/health"})


@app.middleware("http")
async def require_edge_secret(request: Request, call_next):
    # Whether this request is *proven* to have arrived through our Cloudflare
    # Worker. Only a valid secret establishes that, so it starts false and is
    # never assumed - when the secret is unset the API is reachable directly and
    # nothing about the forwarding chain can be trusted.
    #
    # rate_limit.client_key reads this to decide whether CF-Connecting-IP is
    # believable. That header is trivially forgeable by anyone talking to the
    # origin, and worthless on its own; it is only meaningful once the request
    # has proved it came through the edge that set it.
    request.state.edge_verified = False

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
            request.state.edge_verified = True
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

    One boolean, because that is all the frontend needs to decide whether to show
    its "no content available" banner. Reporting filesystem paths, the working
    directory or the document filenames would hand an anonymous caller a map of
    the container for no gain.
    """
    knowledge = get_knowledge()
    return {"knowledge_ready": not knowledge.is_empty}

@app.post("/chat-with-files")
async def chat_with_files(chat_request: ChatRequest, request: Request):
    # Shape only. The visitor's message is their words, not ours to retain in
    # log storage.
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

        # A message that is nothing but an address: the visitor is leaving it,
        # whatever the conversation was doing before.
        message = chat_request.message.strip()
        if _EMAIL_ONLY_RE.match(message):
            try:
                email = validate_email(message).email
            except EmailNotValidError:
                return _chat_reply(EMAIL_INVALID_MESSAGE, is_email_collection=True)

            return await _deliver_collected_email(
                email,
                "Address submitted in chat with no accompanying message",
                "direct email submission",
            )

        # An address inside a sentence only counts while the previous turns were
        # asking for one, so a message that merely mentions an address is not
        # mistaken for the visitor leaving theirs.
        in_email_collection = any(
            msg.is_email_collection and not msg.email_collected
            for msg in (chat_request.conversation_history or [])[-2:]
        )

        if in_email_collection:
            email_match = _EMAIL_IN_TEXT_RE.search(chat_request.message)
            if email_match:
                try:
                    email = validate_email(email_match.group(0)).email
                except EmailNotValidError:
                    return _chat_reply(EMAIL_INVALID_MESSAGE, is_email_collection=True)

                # Whatever they wrote around the address is the message itself.
                message_content = chat_request.message.replace(email, '').strip()
                if not message_content:
                    message_content = "Email provided during chat interaction"

                return await _deliver_collected_email(
                    email, message_content, "chat-collected address"
                )

        # Asking for an address, rather than receiving one. Matching on intent
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
            return _chat_reply(EMAIL_REQUEST_MESSAGE, is_email_collection=True)

        # Normal chat flow - answer from the cached corpus (profile, projects,
        # writing).
        #
        # Which documents this question needs, rather than all of them. The
        # selection is held in a local so the trace describes the request that
        # was actually made - calling select() again for the trace could
        # describe a different one if the corpus rebuilt in between.
        turns = _to_model_turns(chat_request.conversation_history)
        selection = select(
            chat_request.message,
            get_knowledge(),
            history=[turn["content"] for turn in turns],
        )
        answer = get_gemini_response(
            GEMINI_API_KEY,
            chat_request.message,
            selection.knowledge,
            turns,
        )

        return _chat_reply(answer.text, trace=_answer_trace(answer, selection))

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

async def _send_contact_email(email: str, message: str) -> None:
    """Delivers a collected address to Yanir's inbox.

    Raises HTTPException on a configuration or SMTP failure; callers decide how
    that reads to the visitor. The chat flow answers with a message offering the
    address directly, while the HTTP route surfaces the status.
    """
    try:
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
        
        User Email: {email}
        Message: {message}
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
            # The raw SMTP error names the sender account and the server, so it
            # stays server-side: returning it would reflect both back to anyone
            # who can make a send fail.
            logger.exception("SMTP send failed")
            raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)

    except HTTPException:
        raise
    except Exception:
        logger.exception("Contact delivery error")
        raise HTTPException(status_code=500, detail=INTERNAL_ERROR_DETAIL)


@app.post("/api/contact")
async def contact(request: ContactRequest, http_request: Request):
    """Sends a contact message. Rate limited per client and globally."""
    enforce_rate_limit(http_request, contact_limiter, "contact")
    await _send_contact_email(request.email, request.message)
    return {"status": "success", "message": "Email sent successfully"}


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

