from google import genai
from google.genai import errors as genai_errors
from typing import Optional, List, Dict
import logging
import re

logger = logging.getLogger(__name__)

# Status codes that mean "this model is not usable for us right now", so the next
# candidate is worth trying: retired/unknown model, exhausted quota, or a
# transient server-side failure.
RETRYABLE_STATUS_CODES = frozenset({404, 429, 500, 502, 503, 504})

# User-facing copy per failure category, so an auth or configuration problem is
# not reported to visitors as if the service were merely busy.
BUSY_MESSAGE = (
    "I'm sorry, the AI service is busy or over its quota right now. "
    "Please try again in a few moments."
)
MISCONFIGURED_MESSAGE = (
    "I'm sorry, the AI service is not configured correctly at the moment. "
    "Please try again later."
)
GENERIC_ERROR_MESSAGE = (
    "I'm sorry, I couldn't process your request just now. Please try again."
)

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
    # Fallback models in order of preference. The "-latest" aliases track the
    # current generation, so a model retirement upstream does not break chat the
    # way the pinned gemini-1.5-* names did.
    MODELS = [
        "gemini-flash-latest",
        "gemini-3.5-flash",
        "gemini-flash-lite-latest",
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
    last_error: Optional[Exception] = None
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
            last_error = e
            logger.exception("Gemini API error with model %s", model_id)

            # Decide from the SDK's structured status code rather than substring
            # matching, so an unrelated message containing "404" cannot be
            # mistaken for a retired model.
            status_code = e.code if isinstance(e, genai_errors.APIError) else None

            if status_code in RETRYABLE_STATUS_CODES:
                logger.warning(
                    "Model %s unavailable (HTTP %s), trying next model", model_id, status_code
                )
                continue

            # Anything else (auth, malformed request, network) is not a
            # model-availability problem, so trying another model won't help.
            return _failure_message(e)

    # Every candidate model failed; report the category of the last failure.
    return _failure_message(last_error)


def _failure_message(error: Optional[Exception]) -> str:
    """Maps a failure to user-facing copy without leaking the raw error text."""
    if isinstance(error, genai_errors.APIError):
        if error.code in (429, 503):
            return BUSY_MESSAGE
        if error.code in (400, 401, 403, 404):
            return MISCONFIGURED_MESSAGE
    return GENERIC_ERROR_MESSAGE
