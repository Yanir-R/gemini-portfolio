from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from gemini_helper import get_gemini_response
from docs_helper import load_all_files, DOCS_DIR, PRIVATE_DIR, TEMPLATES_DIR
from pydantic import BaseModel
from typing import List, Optional

load_dotenv()

class ChatMessage(BaseModel):
    type: str
    content: str

class ChatRequest(BaseModel):
    message: str
    conversation_history: Optional[List[ChatMessage]] = None

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    max_age=86400,
)

@app.get("/")
def read_root():
    return {"message": "FastAPI is running"}

@app.get("/check-paths")
async def check_paths():
    """Debug endpoint to check paths"""
    return {
        "docs_dir": DOCS_DIR,
        "private_dir": PRIVATE_DIR,
        "templates_dir": TEMPLATES_DIR,
        "docs_exists": os.path.exists(DOCS_DIR),
        "private_exists": os.path.exists(PRIVATE_DIR),
        "templates_exists": os.path.exists(TEMPLATES_DIR),
        "private_files": os.listdir(PRIVATE_DIR) if os.path.exists(PRIVATE_DIR) else [],
        "template_files": os.listdir(TEMPLATES_DIR) if os.path.exists(TEMPLATES_DIR) else []
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
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=500, 
                detail="GEMINI_API_KEY not found in environment variables"
            )
        
        all_content = load_all_files()
        
        # Convert conversation history to a format Gemini can use
        history = []
        if chat_request.conversation_history:
            history = [
                {"role": "user" if msg.type == "user" else "assistant", 
                 "content": msg.content} 
                for msg in chat_request.conversation_history
            ]
        
        # Get response from Gemini
        response = get_gemini_response(
            GEMINI_API_KEY,
            chat_request.message,
            all_content,
            history
        )
        
        return {"response": response}
        
    except Exception as e:
        print(f"Error in chat_with_files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))