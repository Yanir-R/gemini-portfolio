from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
from gemini_helper import get_gemini_response
from pydantic import BaseModel

load_dotenv()

class ChatRequest(BaseModel):
    message: str  

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

@app.post("/generate-text")
async def chat(chat_request: ChatRequest):
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(status_code=500, detail="GEMINI_API_KEY not found in environment variables")
            
        response = get_gemini_response(GEMINI_API_KEY, chat_request.message)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))