import time
from functools import wraps
from flask import request, jsonify
from flask_jwt_extended import get_jwt_identity
from models.user import User
from models.chat import Conversation

# Rate limiting storage
reset_attempts = {}


def rate_limit(max_attempts=5, window_seconds=300):
    """
    Decorator function to implement rate limiting on routes
    Args:
        max_attempts: Maximum number of allowed attempts within time window
        window_seconds: Time window in seconds for counting attempts
    Returns:
        Decorator function that applies rate limiting
    """

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client IP address and username from request
            ip = request.remote_addr
            username = request.json.get('username') if request.json else None
            # Create unique key for rate limiting (IP + username if available)
            key = f"{ip}:{username}" if username else ip

            now = time.time()  # Current timestamp

            # Clean old attempts: remove attempts older than the time window
            reset_attempts[key] = [t for t in reset_attempts.get(key, []) if now - t < window_seconds]

            # Check if user has exceeded the maximum allowed attempts
            if len(reset_attempts.get(key, [])) >= max_attempts:
                return jsonify({
                    "success": False,
                    "message": f"Too many attempts. Please try again in {window_seconds // 60} minutes."
                }), 429  # HTTP 429 Too Many Requests

            # Add current attempt timestamp to the list
            reset_attempts.setdefault(key, []).append(now)

            # Proceed with the original function if rate limit not exceeded
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def validate_conversation_access(conversation_id, user_id):
    """
    Validate that a user has access to a conversation
    Returns (is_authorized, conversation, error_message)
    """
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return False, None, "Conversation not found"

    if user_id not in [conversation.user1_id, conversation.user2_id]:
        return False, None, "Access denied to conversation"

    return True, conversation, None


def get_current_user_from_jwt():
    """
    Extract current user from JWT token
    Returns (user, error_response, status_code)
    """
    public_id = get_jwt_identity()
    user = User.query.filter_by(public_id=public_id).first()

    if not user:
        return None, jsonify({"success": False, "message": "User not found"}), 404

    return user, None, None


def get_authenticated_user_from_socket(online_users, flask_request):
    """
    Extract authenticated user from socket connection
    Returns (user_id, user_data, error_message)
    """
    try:
        for uid, user_data in online_users.items():
            if user_data['sid'] == flask_request.sid:
                return uid, user_data, None
        return None, None, "User not authenticated"
    except Exception as e:
        return None, None, f"Authentication error: {str(e)}"


def validate_socket_conversation_access(conversation_id, user_id):
    """
    Validate socket user has access to conversation
    Returns (is_authorized, conversation, error_message)
    """
    return validate_conversation_access(conversation_id, user_id)