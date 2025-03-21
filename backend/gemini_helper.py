from google import genai

def get_gemini_response(api_key: str, user_question: str):
    try:

        client = genai.Client(api_key=api_key)

        MODEL_ID = "gemini-2.0-flash" 
        
        response = client.models.generate_content(
            model=MODEL_ID, contents=user_question
        )
        
        return response.text
    
    except Exception as e:
        return f"Error: {str(e)}" 