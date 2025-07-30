from google import genai
from typing import Optional, List, Dict
import re

def validate_email(email: str) -> tuple[bool, str]:
    """
    Validates email format and returns (is_valid, error_message)
    """
    # Basic format check
    basic_pattern = r'^[\w\.-]+@[\w\.-]+\.\w{2,}$'
    if not re.match(basic_pattern, email):
        return False, "Please provide a complete email address (e.g., nice-try@example.com)"
    
    # Common typos and invalid formats
    invalid_cases = {
        '@gmail': ('@gmail.com', 'Did you mean to type @gmail.com?'),
        '@yahoo': ('@yahoo.com', 'Did you mean to type @yahoo.com?'),
        '@hotmail': ('@hotmail.com', 'Did you mean to type @hotmail.com?'),
        'gmail.': ('gmail.com', 'Did you mean gmail.com?'),
        'yahoo.': ('yahoo.com', 'Did you mean yahoo.com?'),
        'hotmail.': ('hotmail.com', 'Did you mean hotmail.com?'),
        '@.com': ('', 'Please include your username before @'),
        '@': ('', 'Please provide a complete email address'),
    }
    
    for invalid, (correction, message) in invalid_cases.items():
        if invalid in email.lower() and not email.lower().endswith(correction):
            return False, message
            
    return True, ""

def get_gemini_response(
    api_key: str, 
    user_question: str, 
    pdf_content: Optional[str] = None, 
    conversation_history: Optional[List[Dict[str, str]]] = None
):
    # Define fallback models in order of preference
    MODELS = [
        "gemini-1.5-flash",
        "gemini-1.5-pro", 
        "gemini-1.0-pro",
        "gemini-pro"
    ]
    
    client = genai.Client(api_key=api_key)
    
    # context analysis
    def analyze_conversation_context(history: List[Dict[str, str]], current_msg: str) -> dict:
            context = {
                'is_email_context': False,
                'has_valid_email': False,
                'provided_email': None,
                'conversation_stage': 'general',
                'previous_response': None,
                'email_error': None,
                'email_collected': False
            }
            
            #  email pattern
            email_pattern = r'[\w\.-]+@[\w\.-]+\.\w{2,}'
            
            # Check if email was already collected in history
            context['email_collected'] = any(
                msg.get('email_collected', False) 
                for msg in history
            )
            
            # Extract email from current message if present
            email_match = re.search(email_pattern, current_msg)
            if email_match:
                email = email_match.group(0)
                is_valid, error_msg = validate_email(email)
                if is_valid:
                    context['has_valid_email'] = True
                    context['provided_email'] = email
                else:
                    context['email_error'] = error_msg
            
            # Simple logic for quick message follow-up
            if history and len(history) >= 1:
                last_msg = history[-1]
                if last_msg.get('is_quick_message') and not context['email_collected']:
                    context['conversation_stage'] = 'ask_email_friendly'
                elif context['has_valid_email']:
                    context['conversation_stage'] = 'email_provided'
            
            return context

        # Build conversation history text
    history_text = ""
    if conversation_history:
        history_text = "Previous conversation:\n"
        for msg in conversation_history[-4:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            history_text += f"{role}: {msg['content']}\n"
        history_text += "\n"

    # Analyze context
    context = analyze_conversation_context(conversation_history or [], user_question)
    
    # Define response templates
    RESPONSE_TEMPLATES = {
            'ask_email_friendly': """
            Create a friendly, single follow-up response that:
            1. Thanks them for their interest
            2. Politely asks if they'd like to share their email
            3. Makes it clear it's optional
            4. Maintains a warm, conversational tone
            
            Keep it brief and natural.""",
            
            'dismissive': """
            Handle a dismissive response from the user.
            Current message: {user_question}
            
            Create a brief, respectful response that:
            1. Acknowledges their preference
            2. Keeps it short and professional
            3. Leaves the door open for future questions
            4. Maintains a helpful but not pushy tone
            
            Keep it very concise.""",
            
            'thanks': """
            Handle a thank you message from the user.
            Current message: {user_question}
            Previous context: {history_text}
            
            Create a brief, friendly response that:
            1. Acknowledges their thanks
            2. Encourages further questions about my experience/skills
            3. Keeps the tone warm but professional
            4. Doesn't repeat previous responses
            
            Keep it natural and concise."""
    }

    # Try each model until one works
    for model_id in MODELS:
        try:
            # Generate appropriate prompt based on context
            if context['conversation_stage'] in RESPONSE_TEMPLATES:
                prompt = RESPONSE_TEMPLATES[context['conversation_stage']].format(
                    user_question=user_question,
                    history_text=history_text
                )
            elif context['conversation_stage'] == 'invalid_email':
                prompt = f"""The user provided an invalid email: {context['email_error']}.
            Create a helpful response that:
            1. Acknowledges their attempt
            2. Explains the specific issue clearly
            3. Provides the correct format example
            4. Maintains a helpful tone
            5. Indicates they can continue chatting about other topics
            
                Keep it concise and friendly."""
                
            elif context['conversation_stage'] == 'email_provided':
                # Extract username from email
                email = context['provided_email']
                username = email.split('@')[0] if '@' in email else 'there'
                
                # Check if this was a direct email input
                is_direct_email = any(
                    msg['content'].strip() == email.strip() 
                    for msg in conversation_history[-2:] 
                    if msg['role'] == 'user'
                )
                
                if is_direct_email:
                    prompt = f"""Email received: {context['provided_email']}
                    Create a brief, direct confirmation response that:
                    1. Simply confirms receipt
                    2. Keeps it minimal since we'll show the system message after
                    
                    Keep it very short and simple."""
                else:
                    prompt = f"""Email received: {context['provided_email']}
                    Create a friendly response that:
                    1. Confirms receipt warmly
                    2. Shows appreciation
                    3. Encourages further questions
                    4. Maintains a casual tone
                    
                    Keep it natural and engaging."""
                
            elif pdf_content:
                prompt = f"""Previous: {history_text}
                Content: {pdf_content}
                Question: {user_question}
            
            Create a brief response that:
            1. Answers directly
            2. Stays conversational
            3. Encourages follow-up
            
                Keep it concise and natural."""
            else:
                prompt = f"""Previous: {history_text}
                Question: {user_question}
                
                Create a brief response that:
                1. Acknowledges limitations
                2. Stays helpful
                3. Keeps conversation going
                
                Be concise and friendly."""

            response = client.models.generate_content(
                model=model_id,
                contents=prompt
            )

            return response.text if response.text else "I apologize, but I couldn't generate a response. Please try rephrasing your question."
        
        except Exception as e:
            print(f"Gemini API Error with model {model_id}: {str(e)}")
            # Check if this is a 503 or overload error
            if "503" in str(e) or "overloaded" in str(e).lower() or "unavailable" in str(e).lower():
                print(f"Model {model_id} is overloaded, trying next model...")
                continue
            else:
                # For other errors, don't try other models
                return f"I encountered an error while processing your request: {str(e)}"
    
    # If all models failed
    return "I'm sorry, all AI models are currently experiencing high demand. Please try again in a few moments." 