from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from gemini_helper import get_gemini_response
from docs_helper import load_all_files, read_markdown_file, DOCS_DIR, PRIVATE_DIR
from pydantic import BaseModel
from typing import List, Optional
import os
from os import getenv
import datetime

load_dotenv()

FRONTEND_PROD_URL = getenv("FRONTEND_PROD_URL")
FRONTEND_DEV_URL = getenv("FRONTEND_DEV_URL")
FRONTEND_VITE_URL = getenv("FRONTEND_VITE_URL")

allowed_origins = [url for url in [FRONTEND_PROD_URL, FRONTEND_DEV_URL, FRONTEND_VITE_URL] if url]

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
        "private_files": os.listdir(PRIVATE_DIR) if os.path.exists(PRIVATE_DIR) else []
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