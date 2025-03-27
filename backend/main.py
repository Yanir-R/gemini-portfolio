from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from gemini_helper import get_gemini_response
from docs_helper import load_all_files, read_markdown_file, DOCS_DIR, PRIVATE_DIR
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import os
from os import getenv
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
import json
import logging
import re
from email_validator import validate_email, EmailNotValidError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

FRONTEND_PROD_URL = getenv("FRONTEND_PROD_URL", "https://frontend-240663900746.me-west1.run.app")
FRONTEND_DEV_URL = getenv("FRONTEND_DEV_URL", "http://localhost:3000")
FRONTEND_VITE_URL = getenv("FRONTEND_VITE_URL", "http://127.0.0.1:3000")
BACKEND_URL = getenv("BACKEND_URL", "http://127.0.0.1:8000")

allowed_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://frontend-240663900746.me-west1.run.app"
]

class ChatMessage(BaseModel):
    type: str
    content: str
    is_email_collection: Optional[bool] = False
    email_collected: Optional[bool] = False

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = None
    collected_email: Optional[EmailStr] = None

class ContactRequest(BaseModel):
    email: str
    message: str

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/check-paths")
async def check_paths():
    """Debug endpoint to check paths"""
    return {
        "docs_dir": DOCS_DIR,
        "private_dir": PRIVATE_DIR,
        "docs_exists": os.path.exists(DOCS_DIR),
        "private_exists": os.path.exists(PRIVATE_DIR),
        "private_files": os.listdir(PRIVATE_DIR) if os.path.exists(PRIVATE_DIR) else [],
        "current_working_dir": os.getcwd(),
        "absolute_docs_path": os.path.abspath(DOCS_DIR),
        "absolute_private_path": os.path.abspath(PRIVATE_DIR)
    }

@app.post("/generate-text")
async def chat(chat_request: ChatRequest):
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not found in environment variables")
            
        response = get_gemini_response(GEMINI_API_KEY, chat_request.message)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat-with-files")
async def chat_with_files(chat_request: ChatRequest):
    logger.info(f"Received chat request: {chat_request}")
    try:
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
                    message="User submitted email via chat without context"
                )
                
                await contact(contact_request)
                logger.info(f"Email notification sent for direct email submission: {email}")
                
                return {
                    "response": "✉️ 👱🏻‍♂️ ✉️\n\nHey there 👋,\n\nThanks so much for reaching out! I got your email and wanted to let you know I saw it. ✨\n\nI appreciate you getting in touch. 🙏\n\nDo you have any other questions I can help with? Don't hesitate to ask – I'm happy to chat more! 💬",
                    "email_collected": True,
                    "is_email_collection": False
                }
            except EmailNotValidError:
                return {
                    "response": "That doesn't look like a valid email address. Could you please try again with a valid email? 📧",
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
                    
                    await contact(contact_request)
                    logger.info(f"Email sent successfully for {email}")
                    
                    return {
                        "response": "Thanks! I've received your email. Feel free to ask me anything else!",
                        "email_collected": True,
                        "is_email_collection": False
                    }
                except EmailNotValidError:
                    return {
                        "response": "That doesn't look like a valid email address. Could you please try again?",
                        "email_collected": False,
                        "is_email_collection": True
                    }

        # Check if this is a new email collection request
        should_collect_email = (
            not any(msg.email_collected for msg in chat_request.conversation_history or []) and
            ("contact" in chat_request.message.lower() or 
             "email" in chat_request.message.lower() or
             "newsletter" in chat_request.message.lower())
        )
        
        if should_collect_email:
            return {
                "response": "I'd be happy to help with that! Could you please share your email address and a brief message about what you'd like to discuss? I'm looking forward to connecting with you!",
                "is_email_collection": True,
                "email_collected": False
            }
        
        # Normal chat flow
        all_content = load_all_files()
        history = []
        if chat_request.conversation_history:
            history = [
                {
                    "role": "user" if msg.type == "user" else "assistant",
                    "content": msg.content,
                    "is_email_collection": msg.is_email_collection,
                    "email_collected": msg.email_collected
                }
                for msg in chat_request.conversation_history
            ]
        
        response = get_gemini_response(
            GEMINI_API_KEY,
            chat_request.message,
            all_content,
            history
        )
        
        return {"response": response}
        
    except Exception as e:
        logger.error(f"Error in chat_with_files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/content/{file_name}")
async def get_content(file_name: str):
    try:
        file_path = os.path.join(PRIVATE_DIR, file_name)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        content = read_markdown_file(file_path)
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/contact")
async def contact(request: ContactRequest):
    try:
        # Email configuration
        sender_email = os.getenv("EMAIL_ADDRESS")
        sender_password = os.getenv("EMAIL_PASSWORD")
        receiver_email = os.getenv("YOUR_EMAIL")

        logger.info(f"Attempting to send email from {sender_email} to {receiver_email}")

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
                logger.info(f"Email sent successfully to {receiver_email}")
        except Exception as e:
            logger.error(f"SMTP Error: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to send email: {str(e)}"
            )

        # Log the collected email
        log_collected_email(str(request.email), request.message)

        return {"status": "success", "message": "Email sent successfully"}
    except Exception as e:
        logger.error(f"Contact endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add this function to handle email logging
def log_collected_email(email: str, context: str):
    try:
        log_entry = {
            "email": email,
            "timestamp": datetime.now().isoformat(),
            "context": context
        }
        
        with open("collected_emails.json", "a") as f:
            json.dump(log_entry, f)
            f.write("\n")
            
        logger.info(f"Email collected: {email}")
        return True
    except Exception as e:
        logger.error(f"Failed to log email: {str(e)}")
        return False