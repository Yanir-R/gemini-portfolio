from google import genai
from typing import Optional, List, Dict

def get_gemini_response(
    api_key: str, 
    user_question: str, 
    pdf_content: Optional[str] = None, 
    conversation_history: Optional[List[Dict[str, str]]] = None
):
    """
    1. Rename this file to gemini_helper.py
    2. Add your API key to .env file: GEMINI_API_KEY=your_key_here
    3. Install google-generativeai package: pip install google-generativeai

    Example parameters:
    pdf_content = "Content of your PDF here..."
    conversation_history = [
        {"role": "user", "content": "What is AI?"},
        {"role": "assistant", "content": "AI is..."},
    ]
    """
    try:
        client = genai.Client(api_key=api_key)
        MODEL_ID = "gemini-1.5-flash"
        
        # Format conversation history
        history_text = ""
        if conversation_history:
            history_text = "Previous conversation:\n"
            for msg in conversation_history[-4:]:  # Only use last 4 messages
                role = "User" if msg["role"] == "user" else "Assistant"
                history_text += f"{role}: {msg['content']}\n"
        
        # Construct your prompt
        if pdf_content:
            prompt = f"""
            Previous conversation: {history_text}
            Content: {pdf_content}
            Question: {user_question}
            """
        else:
            prompt = f"""
            Previous conversation: {history_text}
            Question: {user_question}
            """
            
        # Generate response
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt
        )
        
        return response.text if response.text else "Could not generate response"
        
    except Exception as e:
        return f"Error: {str(e)}" 