from google import genai
from typing import Optional, List, Dict

def get_gemini_response(
    api_key: str, 
    user_question: str, 
    pdf_content: Optional[str] = None, 
    conversation_history: Optional[List[Dict[str, str]]] = None
):
    try:
        client = genai.Client(api_key=api_key)
        MODEL_ID = "gemini-1.5-flash"
        
        history_text = ""
        if conversation_history:
            history_text = "Previous conversation:\n"
            for msg in conversation_history[-4:]:  # Only use last 4 messages
                role = "User" if msg["role"] == "user" else "Assistant"
                history_text += f"{role}: {msg['content']}\n"
            history_text += "\n"
        
        if pdf_content:
            prompt = f"""You are a friendly AI assistant. Keep responses short, simple, and conversational unless 
            specifically asked for more detail. Never address the user by name - just be friendly and direct.

            Previous conversation context:
            {history_text}

            CONTENT:
            {pdf_content}

            CURRENT QUESTION:
            {user_question}

            Guidelines:
            1. Keep it simple and avoid repeating information from previous responses
            2. If the user asks to "tell me more" or similar, expand on your previous response with new information
            3. If the user asks about something already discussed, provide new insights or ask for clarification
            4. Keep responses brief but informative
            5. Only share information found in the documents
            6. If information is missing, simply say so
            7. IMPORTANT: End each response naturally with a friendly invitation to continue the conversation.
               Be creative and vary your closing phrases. Some examples:
               - "What else would you like to explore?"
               - "Curious about any specific part of this?"
               - "There's more to this story - what interests you?"
               - "Want to dive deeper into any aspect?"
               - "Anything specific you'd like me to clarify?"
               - "Shall we explore this topic further?"
               - "Which part catches your interest?"
               - "Feel free to ask about any specific details!"
               
               Make your closing question feel natural and connected to the topic discussed.
               Avoid using the same closing phrase repeatedly.
               The invitation should flow smoothly from your response.

            Please provide your response, ensuring it ends with a natural, contextual invitation to continue the conversation:"""
        else:
            prompt = f"""You are a friendly AI assistant. I don't have access to the documents right now, 
            so I'll keep this simple and friendly.

            Previous conversation:
            {history_text}
            
            Current question: {user_question}

            Please provide a brief response and end with a natural, friendly invitation to continue the conversation when the documents are available."""
            
        response = client.models.generate_content(
            model=MODEL_ID,
            contents=prompt
        )

        return response.text if response.text else "I apologize, but I couldn't generate a response. Please try rephrasing your question."
    
    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        return f"I encountered an error while processing your request: {str(e)}" 