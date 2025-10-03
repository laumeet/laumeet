# Import necessary modules and libraries
from flask import Flask, request, jsonify, url_for  # Flask web framework and request/response handling
from flask_sqlalchemy import SQLAlchemy  # SQLAlchemy for database ORM
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, or_, and_  # SQLAlchemy column types
from sqlalchemy.orm import mapped_column, Mapped, relationship  # SQLAlchemy ORM features
from sqlalchemy.sql.expression import func  # SQL functions for random ordering
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask import request as flask_request
from werkzeug.security import generate_password_hash, check_password_hash  # Password hashing utilities
from flask_jwt_extended import (  # JWT authentication utilities
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    set_access_cookies, set_refresh_cookies, unset_jwt_cookies
)
from datetime import datetime, timedelta, timezone  # Date and time handling
import re  # Regular expressions for validation
import uuid  # UUID generation for unique identifiers
import base64  # Base64 encoding/decoding for image data
from functools import wraps  # Decorator utilities
from flask_cors import CORS  # Cross-Origin Resource Sharing support
import time  # Time functions for rate limiting
import os  # Operating system interface for environment variables
from PIL import Image

# Initialize Flask application
app = Flask(__name__)

# Enhanced CORS configuration for both production and local development
# Allows frontend from Vercel and local development servers to communicate with backend
CORS(
    app,
    supports_credentials=True,  # Enable cookies and authentication
    resources={r"/*": {"origins": [
        "https://laumeet.vercel.app",  # Production frontend
        "http://localhost:3000",  # Local development
        "http://127.0.0.1:3000"  # Alternative localhost
    ]}}
)

# Application configuration settings
# Use environment variable for database URL, fallback to SQLite for development
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    "DB_URL", "sqlite:///lausers.db"  # Use DB_URL env var or default to SQLite
)

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Disable modification tracking for better performance

# JWT configuration for authentication
app.config['JWT_SECRET_KEY'] = os.environ.get("JWT_SECRET_KEY") or "dev-secret-key-please-change"
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)  # Access token expires in 24 hours
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=14)  # Refresh token expires in 14 days
app.config['JWT_TOKEN_LOCATION'] = ['cookies', 'headers']  # Accept tokens from cookies and headers

# Cookie settings for JWT tokens
app.config['JWT_COOKIE_SECURE'] = not app.debug  # Secure cookies in production, HTTP in development
app.config['JWT_COOKIE_SAMESITE'] = "None"  # Required for cross-site cookies
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # Disable CSRF for simplicity (enable in production)
app.config['JWT_SESSION_COOKIE'] = False  # Persistent cookies, not session-only

# Initialize database and JWT manager
db = SQLAlchemy(app)  # Database instance for ORM operations
jwt = JWTManager(app)  # JWT manager for authentication

# Rate limiting storage - in-memory dictionary (replace with Redis in production)
# Tracks failed login attempts to prevent brute force attacks
reset_attempts = {}












# Initialize SocketIO after your app configuration
socketio = SocketIO(app, cors_allowed_origins=[
    "https://laumeet.vercel.app",
    "http://localhost:3000", 
    "http://127.0.0.1:3000"
], async_mode='eventlet')

# Store online users (in production, use Redis instead)
online_users = {}

# SocketIO Authentication Middleware
@socketio.on('connect')
def handle_connect():
    """
    Handle user connection with JWT authentication
    Update user's online status
    """
    try:
        # Get token from query string or headers
        token = flask_request.args.get('token') or flask_request.headers.get('Authorization')
        
        if not token:
            print("DEBUG: No token provided for SocketIO connection")
            return False
        
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        # Verify JWT token
        from flask_jwt_extended import decode_token
        try:
            decoded_token = decode_token(token)
            user_public_id = decoded_token['sub']
            
            # Find user in database
            user = User.query.filter_by(public_id=user_public_id).first()
            if not user:
                print(f"DEBUG: User not found for public_id: {user_public_id}")
                return False
            
            # Store user connection info
            online_users[user.id] = {
                'public_id': user.public_id,
                'username': user.username,
                'sid': flask_request.sid,
                'is_online': True
            }
            
            # Join user to their personal room for private notifications
            join_room(f"user_{user.id}")
            
            # Broadcast online status to user's conversations
            broadcast_online_status(user.id, True)
            
            print(f"DEBUG: User {user.username} connected with SID: {flask_request.sid}")
            
        except Exception as e:
            print(f"DEBUG: JWT decode error: {str(e)}")
            return False
            
    except Exception as e:
        print(f"DEBUG: Connection error: {str(e)}")
        return False
    
    return True


@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle user disconnection
    Update user's online status
    """
    try:
        # Find user by socket ID
        user_id = None
        for uid, user_data in online_users.items():
            if user_data['sid'] == flask_request.sid:
                user_id = uid
                break
        
        if user_id:
            # Remove from online users
            user_data = online_users.pop(user_id, None)
            
            if user_data:
                # Broadcast offline status to user's conversations
                broadcast_online_status(user_id, False)
                
                print(f"DEBUG: User {user_data['username']} disconnected")
                
    except Exception as e:
        print(f"DEBUG: Disconnect error: {str(e)}")


def broadcast_online_status(user_id, is_online):
    """
    Broadcast user's online status to all their conversations
    """
    try:
        # Find all conversations for this user
        conversations = Conversation.query.filter(
            or_(
                Conversation.user1_id == user_id,
                Conversation.user2_id == user_id
            )
        ).all()
        
        for conversation in conversations:
            # Determine the other user in the conversation
            other_user_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id
            
            # Emit online status to the other user
            emit('user_online_status', {
                'user_id': user_id,
                'is_online': is_online,
                'timestamp': datetime.utcnow().isoformat() + "Z"
            }, room=f"user_{other_user_id}")
            
    except Exception as e:
        print(f"DEBUG: Online status broadcast error: {str(e)}")


@socketio.on('join_conversation')
def handle_join_conversation(data):
    """
    Join a specific conversation room
    Room name: conversation_<conversation_id>
    """
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'})
            return
        
        # Get user from online users
        user_id = None
        for uid, user_data in online_users.items():
            if user_data['sid'] == flask_request.sid:
                user_id = uid
                break
        
        if not user_id:
            emit('error', {'message': 'User not authenticated'})
            return
        
        # Verify user has access to this conversation
        conversation = Conversation.query.get(conversation_id)
        if not conversation:
            emit('error', {'message': 'Conversation not found'})
            return
        
        if user_id not in [conversation.user1_id, conversation.user2_id]:
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Join the conversation room
        room_name = f"conversation_{conversation_id}"
        join_room(room_name)
        
        # Mark messages as read when joining conversation
        unread_messages = Message.query.filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.is_read == False
        ).all()
        
        for msg in unread_messages:
            msg.is_read = True
        
        if unread_messages:
            db.session.commit()
            
            # Notify sender that messages were read
            for msg in unread_messages:
                emit('messages_read', {
                    'conversation_id': conversation_id,
                    'message_ids': [msg.id],
                    'read_by': user_id,
                    'timestamp': datetime.utcnow().isoformat() + "Z"
                }, room=f"user_{msg.sender_id}")
        
        print(f"DEBUG: User {user_id} joined conversation room: {room_name}")
        emit('joined_conversation', {
            'conversation_id': conversation_id,
            'message': 'Successfully joined conversation'
        })
        
    except Exception as e:
        print(f"DEBUG: Join conversation error: {str(e)}")
        emit('error', {'message': 'Failed to join conversation'})


@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    """
    Leave a specific conversation room
    """
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'})
            return
        
        room_name = f"conversation_{conversation_id}"
        leave_room(room_name)
        
        print(f"DEBUG: User left conversation room: {room_name}")
        emit('left_conversation', {
            'conversation_id': conversation_id,
            'message': 'Successfully left conversation'
        })
        
    except Exception as e:
        print(f"DEBUG: Leave conversation error: {str(e)}")
        emit('error', {'message': 'Failed to leave conversation'})


@socketio.on('send_message')
def handle_send_message(data):
    """
    Send a message in real-time
    Save to database and broadcast to conversation room
    """
    try:
        conversation_id = data.get('conversation_id')
        content = data.get('content', '').strip()
        
        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'})
            return
        
        if not content:
            emit('error', {'message': 'Message content cannot be empty'})
            return
        
        if len(content) > 1000:
            emit('error', {'message': 'Message too long (max 1000 characters)'})
            return
        
        # Get sender from online users
        sender_id = None
        sender_data = None
        for uid, user_data in online_users.items():
            if user_data['sid'] == flask_request.sid:
                sender_id = uid
                sender_data = user_data
                break
        
        if not sender_id:
            emit('error', {'message': 'User not authenticated'})
            return
        
        # Verify conversation exists and user has access
        conversation = Conversation.query.get(conversation_id)
        if not conversation:
            emit('error', {'message': 'Conversation not found'})
            return
        
        if sender_id not in [conversation.user1_id, conversation.user2_id]:
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Determine recipient
        recipient_id = conversation.user2_id if conversation.user1_id == sender_id else conversation.user1_id
        
        # Create and save message
        new_message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
            is_read=False,
            timestamp=datetime.utcnow()
        )
        
        # Update conversation's last message
        conversation.last_message = content
        conversation.last_message_at = datetime.utcnow()
        
        db.session.add(new_message)
        db.session.commit()
        
        # Prepare message data for broadcast
        message_data = {
            'id': new_message.id,
            'conversation_id': conversation_id,
            'sender_id': sender_data['public_id'],
            'sender_username': sender_data['username'],
            'content': content,
            'is_read': False,
            'timestamp': new_message.timestamp.isoformat() + "Z"
        }
        
        # Broadcast to conversation room
        room_name = f"conversation_{conversation_id}"
        emit('new_message', message_data, room=room_name)
        
        # Also send to recipient's personal room if they're not in conversation room
        emit('new_message', message_data, room=f"user_{recipient_id}")
        
        print(f"DEBUG: Message sent in conversation {conversation_id} by user {sender_id}")
        
    except Exception as e:
        print(f"DEBUG: Send message error: {str(e)}")
        emit('error', {'message': 'Failed to send message'})


@socketio.on('typing')
def handle_typing(data):
    """
    Notify other users in conversation that someone is typing
    """
    try:
        conversation_id = data.get('conversation_id')
        is_typing = data.get('is_typing', True)
        
        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'})
            return
        
        # Get sender from online users
        sender_id = None
        sender_data = None
        for uid, user_data in online_users.items():
            if user_data['sid'] == flask_request.sid:
                sender_id = uid
                sender_data = user_data
                break
        
        if not sender_id:
            emit('error', {'message': 'User not authenticated'})
            return
        
        # Verify conversation exists and user has access
        conversation = Conversation.query.get(conversation_id)
        if not conversation:
            emit('error', {'message': 'Conversation not found'})
            return
        
        if sender_id not in [conversation.user1_id, conversation.user2_id]:
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Determine recipient
        recipient_id = conversation.user2_id if conversation.user1_id == sender_id else conversation.user1_id
        
        # Broadcast typing indicator to conversation room (excluding sender)
        room_name = f"conversation_{conversation_id}"
        emit('user_typing', {
            'conversation_id': conversation_id,
            'user_id': sender_data['public_id'],
            'username': sender_data['username'],
            'is_typing': is_typing,
            'timestamp': datetime.utcnow().isoformat() + "Z"
        }, room=room_name, include_self=False)
        
        # Also send to recipient's personal room
        emit('user_typing', {
            'conversation_id': conversation_id,
            'user_id': sender_data['public_id'],
            'username': sender_data['username'],
            'is_typing': is_typing,
            'timestamp': datetime.utcnow().isoformat() + "Z"
        }, room=f"user_{recipient_id}")
        
    except Exception as e:
        print(f"DEBUG: Typing indicator error: {str(e)}")
        emit('error', {'message': 'Failed to send typing indicator'})


@socketio.on('read_messages')
def handle_read_messages(data):
    """
    Mark messages as read in real-time
    """
    try:
        conversation_id = data.get('conversation_id')
        message_ids = data.get('message_ids', [])
        
        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'})
            return
        
        # Get reader from online users
        reader_id = None
        for uid, user_data in online_users.items():
            if user_data['sid'] == flask_request.sid:
                reader_id = uid
                break
        
        if not reader_id:
            emit('error', {'message': 'User not authenticated'})
            return
        
        # Verify conversation exists and user has access
        conversation = Conversation.query.get(conversation_id)
        if not conversation:
            emit('error', {'message': 'Conversation not found'})
            return
        
        if reader_id not in [conversation.user1_id, conversation.user2_id]:
            emit('error', {'message': 'Access denied to conversation'})
            return
        
        # Mark specific messages as read, or all unread messages in conversation
        if message_ids:
            messages = Message.query.filter(
                Message.id.in_(message_ids),
                Message.conversation_id == conversation_id,
                Message.sender_id != reader_id  # Only mark others' messages as read
            ).all()
        else:
            messages = Message.query.filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != reader_id,
                Message.is_read == False
            ).all()
        
        message_ids_updated = []
        for msg in messages:
            msg.is_read = True
            message_ids_updated.append(msg.id)
        
        if message_ids_updated:
            db.session.commit()
            
            # Notify sender that messages were read
            for msg in messages:
                emit('messages_read', {
                    'conversation_id': conversation_id,
                    'message_ids': message_ids_updated,
                    'read_by': reader_id,
                    'timestamp': datetime.utcnow().isoformat() + "Z"
                }, room=f"user_{msg.sender_id}")
            
            print(f"DEBUG: User {reader_id} marked {len(message_ids_updated)} messages as read in conversation {conversation_id}")
        
        emit('messages_read_success', {
            'conversation_id': conversation_id,
            'message_ids': message_ids_updated,
            'count': len(message_ids_updated)
        })
        
    except Exception as e:
        print(f"DEBUG: Read messages error: {str(e)}")
        emit('error', {'message': 'Failed to mark messages as read'})


# Update your main application entry point to use SocketIO
if __name__ == "__main__":
    # Ensure database tables are created before running the app
    with app.app_context():
        db.create_all()
    
    # Use SocketIO instead of app.run() for WebSocket support
    socketio.run(
        app,
        debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        allow_unsafe_werkzeug=True
    )








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


# Database Models

class Picture(db.Model):
    """
    Picture model for storing user profile images
    Each user can have multiple profile pictures
    """
    __tablename__ = "pictures"  # Database table name

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Foreign key to users table with cascade delete (pictures deleted when user is deleted)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    # Image data (URL or base64 encoded string)
    image: Mapped[str] = mapped_column(String(500), nullable=False)
    # Relationship to User model (back reference)
    user = relationship("User", back_populates="pictures")


class User(db.Model):
    """
    Main User model for storing user information
    Contains all user profile data and authentication information
    """
    __tablename__ = "users"  # Database table name

    # Primary key (auto-incrementing integer)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Public unique identifier (UUID) for external use (more secure than exposing database ID)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    # Username (must be unique and not null)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    # Hashed password (never store plain text passwords!)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    # Security question for password recovery
    security_question: Mapped[str] = mapped_column(String(255), nullable=False)
    # Hashed security answer (never store plain text!)
    security_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    # User's full name (optional)
    name: Mapped[str] = mapped_column(String(100), nullable=True)
    # User's age (must be provided)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    # Department/field of study (optional)
    department: Mapped[str] = mapped_column(String(100), nullable=True)
    # Gender (must be provided)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    # Blood genotype (optional)
    genotype: Mapped[str] = mapped_column(String(5), nullable=True)
    # Academic level (optional)
    level: Mapped[str] = mapped_column(String(20), nullable=True)
    # What the user is interested in (dating, friends, etc.)
    interested_in: Mapped[str] = mapped_column(String(50), nullable=True)
    # Religious affiliation (optional)
    religious: Mapped[str] = mapped_column(String(50), nullable=True)
    # Whether user wants to remain anonymous
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    # User category (hookup, friend, dating, etc.)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    # User biography/description
    bio: Mapped[str] = mapped_column(String(500), nullable=True)
    # Account creation timestamp (automatically set to current UTC time)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    # Admin flag for privileged access
    is_admin = db.Column(db.Boolean, default=False)
    # Last password reset timestamp (for security cooldown)
    last_password_reset: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationship to Picture model - one user can have many pictures
    pictures = relationship("Picture", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)

    def set_password(self, password: str):
        """Hash and set the user's password using werkzeug security"""
        self.password = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify if the provided password matches the stored hash"""
        return check_password_hash(self.password, password)

    def set_security_answer(self, answer: str):
        """Hash and set the security answer (normalize to lowercase and strip whitespace)"""
        self.security_answer = generate_password_hash(answer.lower().strip())

    def check_security_answer(self, answer: str) -> bool:
        """Verify if the provided security answer matches the stored hash"""
        return check_password_hash(self.security_answer, answer.lower().strip())

    def to_dict(self, include_security=False):
        """
        Convert User object to dictionary for JSON response
        Args:
            include_security: Whether to include security-related fields
        Returns:
            Dictionary representation of the user
        """
        data = {
            "id": self.public_id,  # Use public_id instead of database ID for security
            "username": self.username,
            "name": self.name,
            "age": str(self.age),  # Convert to string for consistency with frontend
            "gender": self.gender,
            "department": self.department,
            "genotype": self.genotype,
            "level": self.level,
            "interestedIn": self.interested_in,  # CamelCase for frontend compatibility
            "religious": self.religious,
            "isAnonymous": self.is_anonymous,  # CamelCase for frontend compatibility
            "category": self.category,
            "bio": self.bio,
            "is_admin": self.is_admin,
            "pictures": [build_image_url(picture.image) for picture in self.pictures],
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None  # ISO format with Zulu time
        }
        # Only include security question if explicitly requested (rarely needed)
        if include_security:
            data["security_question"] = self.security_question
            # Never include security_answer in responses!
        return data

    def __repr__(self):
        """String representation of User object for debugging"""
        return f"<User {self.username}>"


class Swipe(db.Model):
    """
    Swipe model for tracking user interactions (likes and passes)
    Used for matching algorithm and explore functionality
    """
    __tablename__ = "swipes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)  # who swiped
    target_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)  # on whom
    action = db.Column(db.String(10), nullable=False)  # "like" or "pass"
    timestamp = db.Column(db.DateTime, default=db.func.now())  # when the swipe occurred


class TokenBlocklist(db.Model):
    """
    Token blacklist model for storing revoked JWT tokens
    Provides token revocation functionality for logout and security
    """
    __tablename__ = "token_blacklist"  # Database table name

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # JWT ID (unique identifier for each token)
    jti: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    # Type of token (access or refresh)
    token_type: Mapped[str] = mapped_column(String(10), nullable=False)
    # Foreign key to users table
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    # When the token was revoked
    revoked_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # When the token expires (for automatic cleanup)
    expires: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    # Relationship to User model
    user = db.relationship('User', lazy='joined')





class Conversation(db.Model):
    """
    Conversation model for managing chat conversations between two users
    Each conversation represents a unique chat between two users
    """
    __tablename__ = "conversations"  # Database table name

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    
    # Foreign keys to users table - represents the two users in the conversation
    user1_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    user2_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Timestamp when conversation was created
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Optional: Store the latest message content for quick access
    last_message: Mapped[str] = mapped_column(String(500), nullable=True)
    
    # Timestamp when the last message was sent
    last_message_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    # Relationship to User model for user1
    user1 = relationship("User", foreign_keys=[user1_id], backref="conversations_as_user1")
    
    # Relationship to User model for user2  
    user2 = relationship("User", foreign_keys=[user2_id], backref="conversations_as_user2")
    
    # Relationship to Message model - one conversation can have many messages
    # cascade="all, delete-orphan" ensures messages are deleted when conversation is deleted
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", passive_deletes=True)

    def to_dict(self, current_user_id=None):
        """
        Convert Conversation object to dictionary for JSON response
        Args:
            current_user_id: The ID of the current user to determine the other participant
        Returns:
            Dictionary representation of the conversation
        """
        # Determine the other participant in the conversation
        other_user = self.user2 if self.user1_id == current_user_id else self.user1
        
        return {
            "id": self.id,
            "user1_id": self.user1_id,
            "user2_id": self.user2_id,
            "other_user": {
                "id": other_user.public_id,
                "username": other_user.username,
                "name": other_user.name,
                "avatar": build_image_url(other_user.pictures[0].image) if other_user.pictures else None
            },
            "last_message": self.last_message,
            "last_message_at": self.last_message_at.isoformat() + "Z" if self.last_message_at else None,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "unread_count": len([msg for msg in self.messages if not msg.is_read and msg.sender_id != current_user_id]) if current_user_id else 0
        }

    def __repr__(self):
        """String representation of Conversation object for debugging"""
        return f"<Conversation {self.id} between User{self.user1_id} and User{self.user2_id}>"


class Message(db.Model):
    """
    Message model for storing individual chat messages
    Each message belongs to a conversation and has a sender
    """
    __tablename__ = "messages"  # Database table name

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    
    # Foreign key to conversations table
    conversation_id: Mapped[int] = mapped_column(Integer, ForeignKey('conversations.id', ondelete='CASCADE'), nullable=False)
    
    # Foreign key to users table - who sent the message
    sender_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Message content
    content: Mapped[str] = mapped_column(String(1000), nullable=False)
    
    # Whether the message has been read by the recipient
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # When the message was sent
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    # Relationship to Conversation model
    conversation = relationship("Conversation", back_populates="messages")
    
    # Relationship to User model - who sent the message
    sender = relationship("User", backref="sent_messages")

    def to_dict(self):
        """
        Convert Message object to dictionary for JSON response
        Returns:
            Dictionary representation of the message
        """
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender_id": self.sender.public_id,  # Use public_id for security
            "sender_username": self.sender.username,
            "content": self.content,
            "is_read": self.is_read,
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None
        }

    def __repr__(self):
        """String representation of Message object for debugging"""
        return f"<Message {self.id} in Conversation {self.conversation_id} from User{self.sender_id}>"






# Validation Functions

def is_valid_username(username):
    """
    Validate username format
    Rules:
    - Must not be empty
    - Must be between 3 and 50 characters
    - Can only contain letters, numbers, and underscores
    """
    return bool(username) and 3 <= len(username) <= 50 and re.match(r'^[a-zA-Z0-9_]+$', username)


def is_strong_password(password):
    """
    Validate password strength
    Rules:
    - Must not be empty
    - Must be at least 8 characters long
    - Must contain at least one digit
    - Must contain at least one uppercase letter
    """
    if not password or len(password) < 8:
        return False
    return any(c.isdigit() for c in password) and any(c.isupper() for c in password)


def validate_gender(gender):
    """
    Validate gender value
    Allowed values: "male", "female", "other" (case-insensitive)
    """
    return bool(gender) and gender.lower() in ["male", "female", "other"]


def get_opposite_gender(gender):
    """
    Get opposite gender for matching logic in explore feature
    Enhanced to handle "other" gender by returning both male and female
    Args:
        gender: User's gender as string
    Returns:
        String or list of genders to show in explore
    """
    gender_lower = gender.lower()
    if gender_lower == "male":
        return "Female"
    elif gender_lower == "female":
        return "Male"
    else:  # "other" or any other value
        # For "other" gender, show both male and female profiles
        return ["Male", "Female"]


def is_valid_image_data(image_data, max_size_kb=500):
    """
    Validate image data (either URL or base64 encoded)
    Args:
        image_data: The image data to validate
        max_size_kb: Maximum allowed size in kilobytes (for base64 images)
    Returns:
        Tuple of (is_valid, message)
    """
    # Check if it's a URL (http:// or https://)
    if image_data.startswith(('http://', 'https://')):
        return True, "url"

    # Check if it's base64 encoded image data
    if image_data.startswith('data:image/'):
        try:
            # Split data URI header from base64 data
            header, data = image_data.split(',', 1)
            # Verify it's valid base64
            base64.b64decode(data)

            # Calculate approximate size (base64 is about 33% larger than binary)
            size_kb = len(data) * 3 / 4 / 1024
            if size_kb > max_size_kb:
                return False, f"Image size exceeds {max_size_kb}KB limit"

            return True, "base64"
        except Exception:
            # Catch any errors in base64 decoding
            return False, "Invalid base64 image data"

    # Not a URL or valid base64
    return False, "Image must be a valid URL or base64 data URI"


# JWT Configuration Callbacks

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """
    Check if a JWT token has been revoked (added to blacklist)
    This is called automatically by flask_jwt_extended on every protected request
    """
    jti = jwt_payload["jti"]  # Get JWT ID from payload
    return TokenBlocklist.query.filter_by(jti=jti).first() is not None


@jwt.user_identity_loader
def user_identity_lookup(user):
    """
    Specify what data to use as identity in JWT tokens
    Handles both User objects and string public_ids for flexibility
    """
    if isinstance(user, User):
        return user.public_id  # Use public_id for User objects
    return user  # Return as-is if already a string (public_id)





def build_image_url(image_path: str) -> str:
    """
    Convert stored image string into a proper URL or base64 string
    - If it's already base64 (starts with 'data:image/'), return as is
    - If it's a full http/https URL, return as is
    - If it's just a filename/path, build a full URL
    """
    if not image_path:
        return None

    if image_path.startswith(("http://", "https://", "data:image/")):
        return image_path

    # Assume it's a local file in static/uploads
    return url_for("static", filename=f"uploads/{image_path}", _external=True)




import base64
from PIL import Image
import io

def process_image(image_data, max_size_kb=500, resize_to=(800, 800)):
    """
    Validate and compress image data (base64 or URL).
    Returns (is_valid, message, processed_image_string)
    """
    # Handle base64
    if image_data.startswith('data:image/'):
        try:
            header, data = image_data.split(',', 1)
            raw = base64.b64decode(data)

            size_kb = len(raw) / 1024
            if size_kb > max_size_kb:
                # Compress with Pillow
                img = Image.open(io.BytesIO(raw))
                img.thumbnail(resize_to, Image.LANCZOS)

                output = io.BytesIO()
                img.save(output, format="JPEG", quality=85)
                output.seek(0)

                # Convert back to base64 string for DB
                compressed_base64 = "data:image/jpeg;base64," + base64.b64encode(output.read()).decode("utf-8")
                return True, "compressed", compressed_base64

            return True, "valid", image_data  # original is fine

        except Exception as e:
            return False, f"Invalid base64: {str(e)}", None

    # Handle URL (don’t compress, just return as is)
    if image_data.startswith(('http://', 'https://')):
        return True, "url", image_data

    return False, "Image must be a valid URL or base64", None




@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    """
    Load user from database based on JWT identity
    This is called automatically when we use @jwt_required()
    """
    identity = jwt_data["sub"]  # Get identity from JWT payload
    return User.query.filter_by(public_id=identity).first()


# Initialize database tables
with app.app_context():
    db.create_all()  # Create all tables if they don't exist


# Route Handlers

@app.route("/")
def home():
    """Root endpoint - API information"""
    return jsonify({
        "message": "Dating App API",
        "version": "1.0",
        "status": "running"
    })


@app.route("/signup", methods=["POST"])
def signup():
    """
    User registration endpoint
    Creates a new user account with provided information
    Validates all inputs and returns JWT tokens for immediate login
    """
    # Get JSON data from request body, default to empty dict if None
    data = request.json or {}

    # Extract all fields from request data
    username = data.get("username")
    password = data.get("password")
    security_question = data.get("security_question")
    security_answer = data.get("security_answer")
    name = data.get("name")  # Optional field
    age = data.get("age")
    department = data.get("department")  # Optional field
    gender = data.get("gender")
    genotype = data.get("genotype")  # Optional field
    level = data.get("level")  # Optional field
    interested_in = data.get("interestedIn")  # camelCase input → snake_case db field
    religious = data.get("religious")  # Optional field
    is_anonymous = data.get("isAnonymous", False)  # Default to False
    category = data.get("category", "friend")  # Default to "friend"
    bio = data.get("bio")  # Optional field
    pictures = data.get("pictures", [])  # List of images, default to empty list

    # Required fields validation
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password are required"}), 400

    # Security question validation
    if not security_question or len(security_question.strip()) < 5:
        return jsonify({"success": False, "message": "Security question must be at least 5 characters long"}), 400

    # Security answer validation
    if not security_answer or len(security_answer.strip()) < 2:
        return jsonify({"success": False, "message": "Security answer must be at least 2 characters long"}), 400

    # Username format validation
    if not is_valid_username(username):
        return jsonify({"success": False, "message": "Invalid username format"}), 400

    # Password strength validation
    if not is_strong_password(password):
        return jsonify({"success": False, "message": "Weak password"}), 400

    # Age validation
    try:
        age = int(age)  # Convert to integer
        if age < 18 or age > 100:  # Reasonable age range for dating app
            return jsonify({"success": False, "message": "Age must be between 18 and 100"}), 400
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Age must be a valid number"}), 400

    # Gender validation
    if not validate_gender(gender):
        return jsonify({"success": False, "message": "Gender must be male, female, or other"}), 400

    # isAnonymous must be boolean
    if not isinstance(is_anonymous, bool):
        return jsonify({"success": False, "message": "isAnonymous must be boolean"}), 400

    # Category is required
    if not category:
        return jsonify({"success": False, "message": "Category is required"}), 400

    # Limit number of pictures to prevent abuse
    if len(pictures) > 10:
        return jsonify({"success": False, "message": "Max 10 pictures allowed"}), 400

    # Validate each picture
    for img in pictures:
        valid, msg = is_valid_image_data(img)
        if not valid:
            return jsonify({"success": False, "message": f"Invalid image: {msg}"}), 400

    # Check if username already exists in database
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "Username already taken"}), 400

    # Create new user object with all provided data
    new_user = User(
        username=username,
        security_question=security_question.strip(),  # Remove extra whitespace
        age=age,
        department=department or "",  # Provide empty string if None
        gender=gender.lower(),  # Store in lowercase for consistency
        genotype=genotype or "",  # Provide empty string if None
        level=level or "",  # Provide empty string if None
        interested_in=interested_in or "",  # Provide empty string if None
        religious=religious or "",  # Provide empty string if None
        is_anonymous=is_anonymous,
        category=category,
        bio=bio or "",  # Provide empty string if None
        name=name or ""  # Provide empty string if None
    )

    # Set hashed password and security answer
    new_user.set_password(password)
    new_user.set_security_answer(security_answer)

    processed_pictures = []
    for img in pictures:
        valid, msg, processed = process_image(img)
        if not valid:
            return jsonify({"success": False, "message": f"Invalid image: {msg}"}), 400
        processed_pictures.append(processed)

    # Add user to database session and commit
    db.session.add(new_user)
    db.session.commit()

    # Create JWT tokens for immediate login after signup
    # Pass User object to create_access_token - JWT callbacks will handle conversion
    access_token = create_access_token(identity=new_user)
    refresh_token = create_refresh_token(identity=new_user)

    # Prepare success response
    response = jsonify({
        "success": True,
        "message": "User created successfully",
        "user": new_user.to_dict(),  # Return user data without sensitive fields
        "access_token": access_token,
        "refresh_token": refresh_token
    })

    # Set JWT tokens as HTTP cookies (for browser-based clients)
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)

    return response, 201  # HTTP 201 Created


@app.route("/login", methods=["POST"])
@rate_limit(max_attempts=5, window_seconds=900)  # Rate limiting: 5 attempts per 15 minutes
def login():
    """
    User authentication endpoint
    Verifies credentials and returns JWT tokens if valid
    Includes rate limiting to prevent brute force attacks
    """
    data = request.json or {}  # Get request data
    username = data.get("username")
    password = data.get("password")

    # Basic validation
    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    # Find user by username
    user = User.query.filter_by(username=username).first()

    # Check if user exists and password is correct
    if not user or not user.check_password(password):
        return jsonify({"success": False, "message": "Invalid username or password"}), 401

    # Create JWT tokens - pass User object, JWT callbacks handle conversion to public_id
    access_token = create_access_token(identity=user)
    refresh_token = create_refresh_token(identity=user)

    # Prepare success response
    response = jsonify({
        "success": True,
        "message": "Login successful",
        "user": user.to_dict(),  # Return user profile data
        "access_token": access_token,
        "refresh_token": refresh_token
    })

    # Set JWT cookies for browser clients
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)

    # Set "is_logged_in" cookie for Next.js middleware
    response.set_cookie(
        "is_logged_in",
        "true",
        httponly=False,  # Accessible by frontend JavaScript
        secure=True,  # Required for HTTPS in production
        samesite="None"  # Allow cross-site requests
    )

    return response, 200


@app.route("/logout", methods=["POST"])
@jwt_required(verify_type=False)  # Allow both access and refresh tokens
def logout():
    """
    Logout endpoint
    Revokes the current JWT token and clears authentication cookies
    Adds token to blocklist to prevent further use
    """
    jwt_data = get_jwt()
    jti = jwt_data["jti"]  # Unique token ID
    token_type = jwt_data["type"]  # "access" or "refresh"
    user_public_id = get_jwt_identity()  # Current user public_id from JWT

    # Find user by public_id
    user = User.query.filter_by(public_id=user_public_id).first()

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Add token to blocklist to revoke it
    db.session.add(TokenBlocklist(
        jti=jti,
        token_type=token_type,
        user_id=user.id,  # Use database ID for foreign key relationship
        revoked_at=datetime.utcnow(),
        expires=datetime.fromtimestamp(jwt_data["exp"], tz=timezone.utc)
    ))
    db.session.commit()

    # Build response
    response = jsonify({
        "success": True,
        "message": "Successfully logged out"
    })

    # Remove JWT cookies (for browser-based clients)
    unset_jwt_cookies(response)

    # Remove the "is_logged_in" cookie for Next.js middleware
    response.set_cookie(
        "is_logged_in",
        "false",
        httponly=False,  # Accessible by frontend
        secure=True,  # Required in production for HTTPS
        samesite="None"  # Allow cross-site
    )

    return response, 200


@app.route("/forgot-password", methods=["POST"])
@rate_limit(max_attempts=3, window_seconds=3600)  # 3 attempts per hour
def forgot_password():
    """
    Step 1 of password reset process
    User submits username, system returns their security question
    Includes rate limiting to prevent user enumeration attacks
    """
    data = request.json or {}
    username = data.get("username")

    if not username:
        return jsonify({"success": False, "message": "Username required"}), 400

    # Find user by username
    user = User.query.filter_by(username=username).first()

    if not user:
        # Security best practice: don't reveal if username exists
        # Return success but with null question to avoid user enumeration
        return jsonify({"success": True, "question": None}), 200

    # Return the user's security question
    return jsonify({
        "success": True,
        "question": user.security_question
    }), 200


@app.route("/reset-password", methods=["POST"])
@rate_limit(max_attempts=3, window_seconds=3600)  # 3 attempts per hour
def reset_password():
    """
    Step 2 of password reset process
    User submits username, security answer, and new password
    If answer is correct, password is reset
    """
    data = request.json or {}
    username = data.get("username")
    answer = data.get("security_answer")
    new_password = data.get("new_password")

    # Validate all required fields are present
    if not username or not answer or not new_password:
        return jsonify({"success": False, "message": "All fields are required"}), 400

    # Find user by username
    user = User.query.filter_by(username=username).first()

    if not user:
        # Security best practice: don't reveal if username exists
        return jsonify({"success": False, "message": "Invalid credentials"}), 400

    # Verify security answer
    if not user.check_security_answer(answer):
        return jsonify({"success": False, "message": "Security answer is incorrect"}), 401

    # Validate new password strength
    if not is_strong_password(new_password):
        return jsonify({"success": False, "message": "New password is too weak"}), 400

    # Reset password and update timestamp
    user.set_password(new_password)
    user.last_password_reset = datetime.utcnow()
    db.session.commit()

    return jsonify({"success": True, "message": "Password reset successfully"}), 200


@app.route("/profile", methods=["GET"])
@jwt_required()  # Require valid JWT token to access this endpoint
def get_my_profile():
    """
    Get current user's profile information
    Requires authentication via JWT
    Returns complete user profile without sensitive data
    """
    # Get user identity from JWT token (public_id)
    public_id = get_jwt_identity()

    # Find user by public_id
    user = User.query.filter_by(public_id=public_id).first()

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Return user profile data
    return jsonify({
        "success": True,
        "user": user.to_dict()
    }), 200


@app.route("/profile", methods=["PUT"])
@jwt_required()  # Require valid JWT token to access this endpoint
def update_my_profile():
    """
    Update current user's profile information
    Requires authentication via JWT
    Allows users to update their profile information
    """
    # Get user identity from JWT token
    public_id = get_jwt_identity()

    # Find user by public_id
    user = User.query.filter_by(public_id=public_id).first()

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    data = request.json or {}  # Get update data from request

    # Update allowed fields with new values or keep existing ones
    user.username = data.get("username", user.username)
    user.bio = data.get("bio", user.bio)
    user.department = data.get("department", user.department)
    user.category = data.get("category", user.category)
    user.gender = data.get("gender", user.gender)
    user.interested_in = data.get("interestedIn", user.interested_in)
    user.level = data.get("level", user.level)
    user.is_anonymous = data.get("isAnonymous", user.is_anonymous)

    # Validate bio length (prevent excessively long bios)
    if user.bio and len(user.bio) > 500:
        return jsonify({"success": False, "message": "Bio too long (max 500 chars)"}), 400

    # Validate gender value
    if user.gender and not validate_gender(user.gender):
        return jsonify({"success": False, "message": "Invalid gender"}), 400

    # Save changes to database
    db.session.commit()

    # Return updated user data
    return jsonify({
        "success": True,
        "message": "Profile updated successfully",
        "user": user.to_dict()
    }), 200


@app.route("/explore", methods=["GET"])
@jwt_required()
def explore():
    """
    Explore endpoint for discovering potential matches
    Returns users based on the current user's 'interested_in' preference
    Excludes users already swiped on by current user
    Includes pagination for performance
    """
    # Get current user's public_id from JWT
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Get IDs of users already swiped by current user (liked or passed)
    swiped_ids = db.session.query(Swipe.target_user_id).filter_by(user_id=current_user.id).all()
    swiped_ids = [s[0] for s in swiped_ids]  # Extract IDs from tuples

    # Pagination parameters
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))

    # Base query (exclude self and already swiped users)
    query = User.query.filter(User.id != current_user.id)
    if swiped_ids:
        query = query.filter(~User.id.in_(swiped_ids))

    # Match logic based on 'interested_in'
    if current_user.interested_in == "Male":
        query = query.filter(User.gender == "Male")
    elif current_user.interested_in == "Female":
        query = query.filter(User.gender == "Female")
    elif current_user.interested_in == "Both":
        query = query.filter(User.gender.in_(["Male", "Female"]))
    else:
        # Default fallback: show all users (excluding self + swiped)
        query = query.filter(User.gender.in_(["Male", "Female"]))

    # Get paginated random users
    candidates = (
        query.order_by(func.random())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    # Fallback: if no candidates found, still exclude swiped users
    if not candidates:
        query = User.query.filter(User.id != current_user.id)
        if swiped_ids:
            query = query.filter(~User.id.in_(swiped_ids))

        candidates = (
            query.order_by(func.random())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )

    # Format response data
    result = [
        {
            "id": user.public_id,
            "username": user.username,
            "bio": user.bio,
            "gender": user.gender,
            "interestedIn": user.interested_in,
            "avatar": build_image_url(user.pictures[0].image) if user.pictures else None
        }
        for user in candidates
    ]

    return jsonify({
        "success": True,
        "page": page,
        "limit": limit,
        "profiles": result
    }), 200


@app.route("/swipe", methods=["POST"])
@jwt_required()
def swipe():
    """
    Swipe endpoint for user interactions
    Records likes and passes, checks for mutual matches
    Returns match notification if both users like each other
    """
    # Get current user's identity
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        print("DEBUG: Current user not found for public_id:", public_id)
        return jsonify({"success": False, "message": "User not found"}), 404

    data = request.get_json()
    print("DEBUG: Raw request data:", data)

    target_public_id = data.get("target_user_id")  # Expecting public_id from frontend
    action = data.get("action")

    print("DEBUG: Current user public_id:", current_user.public_id)
    print("DEBUG: Target public_id from request:", target_public_id)
    print("DEBUG: Swipe action:", action)

    # Validate action type
    if action not in ["like", "pass"]:
        print("DEBUG: Invalid action received:", action)
        return jsonify({"success": False, "message": "Invalid action"}), 400

    # Find target user by public_id
    target_user = User.query.filter_by(public_id=target_public_id).first()
    if not target_user:
        print("DEBUG: Target user not found in DB for public_id:", target_public_id)
        return jsonify({"success": False, "message": "Target user not found"}), 404

    print("DEBUG: Found target user -> ID:", target_user.id, "Public ID:", target_user.public_id)

    # Save swipe action to database
    swipe = Swipe(
        user_id=current_user.id,
        target_user_id=target_user.id,
        action=action
    )
    db.session.add(swipe)
    db.session.commit()

    # If it's a "like", check if target user also liked back
    if action == "like":
        mutual_like = Swipe.query.filter_by(
            user_id=target_user.id,
            target_user_id=current_user.id,
            action="like"
        ).first()

        if mutual_like:
            print("DEBUG: Mutual match detected between", current_user.public_id, "and", target_user.public_id)
            return jsonify({
                "success": True,
                "message": "It's a match! 🎉",
                "matched_with": target_user.public_id
            }), 200

    print("DEBUG: Swipe saved successfully")
    return jsonify({"success": True, "message": f"You swiped {action}"}), 200



@app.route("/matches", methods=["GET"])
@jwt_required()
def get_matches():
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Step 1: Find all users current_user has liked
    liked_users = db.session.query(Swipe.target_user_id).filter_by(
        user_id=current_user.id, action="like"
    ).subquery()

    # Step 2: Find users who liked current_user back
    mutual_users = (
        db.session.query(User)
        .join(Swipe, Swipe.user_id == User.id)
        .filter(
            Swipe.target_user_id == current_user.id,
            Swipe.action == "like",
            User.id.in_(liked_users),         # Ensure mutual like
            User.id != current_user.id        # Exclude self
        )
        .all()
    )

    result = [
        {
            "id": user.public_id,
            "username": user.username,
            "bio": user.bio,
            "avatar": user.pictures[0].image if user.pictures else None
        }
        for user in mutual_users
    ]

    return jsonify({
        "success": True,
        "count": len(result),
        "matches": result
    }), 200










# Chat System Routes

@app.route("/conversations", methods=["GET"])
@jwt_required()
def get_conversations():
    """
    Get all conversations for the current user
    Returns conversations with other user info, last message, and unread count
    """
    # Get current user's identity from JWT
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Find all conversations where current user is either user1 or user2
    conversations = Conversation.query.filter(
        or_(
            Conversation.user1_id == current_user.id,
            Conversation.user2_id == current_user.id
        )
    ).order_by(Conversation.last_message_at.desc()).all()  # Sort by most recent activity

    # Format response with conversation details
    conversations_data = []
    for conv in conversations:
        # Determine the other user in the conversation
        other_user = conv.user2 if conv.user1_id == current_user.id else conv.user1
        
        # Count unread messages for current user
        unread_count = Message.query.filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user.id,  # Messages from other user
            Message.is_read == False               # That are unread
        ).count()

        conversations_data.append({
            "id": conv.id,
            "other_user": {
                "id": other_user.public_id,
                "username": other_user.username,
                "name": other_user.name,
                "avatar": build_image_url(other_user.pictures[0].image) if other_user.pictures else None,
                "isOnline": False  # You can implement online status later
            },
            "last_message": conv.last_message,
            "last_message_at": conv.last_message_at.isoformat() + "Z" if conv.last_message_at else None,
            "unread_count": unread_count,
            "created_at": conv.created_at.isoformat() + "Z" if conv.created_at else None
        })

    return jsonify({
        "success": True,
        "conversations": conversations_data,
        "total": len(conversations_data)
    }), 200


@app.route("/conversations", methods=["POST"])
@jwt_required()
def create_conversation():
    """
    Create a new conversation between two users
    Typically triggered after a mutual match in dating app
    """
    # Get current user's identity from JWT
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    data = request.json or {}
    target_public_id = data.get("target_user_id")

    if not target_public_id:
        return jsonify({"success": False, "message": "Target user ID is required"}), 400

    # Find target user
    target_user = User.query.filter_by(public_id=target_public_id).first()
    if not target_user:
        return jsonify({"success": False, "message": "Target user not found"}), 404

    # Check if conversation already exists between these users
    existing_conversation = Conversation.query.filter(
        or_(
            and_(Conversation.user1_id == current_user.id, Conversation.user2_id == target_user.id),
            and_(Conversation.user1_id == target_user.id, Conversation.user2_id == current_user.id)
        )
    ).first()

    if existing_conversation:
        return jsonify({
            "success": True,
            "message": "Conversation already exists",
            "conversation_id": existing_conversation.id,
            "existing": True
        }), 200

    # Create new conversation
    new_conversation = Conversation(
        user1_id=current_user.id,
        user2_id=target_user.id,
        last_message=None,
        last_message_at=None
    )

    db.session.add(new_conversation)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Conversation created successfully",
        "conversation_id": new_conversation.id,
        "existing": False
    }), 201


@app.route("/messages/<int:conversation_id>", methods=["GET"])
@jwt_required()
def get_messages(conversation_id):
    """
    Get messages for a specific conversation
    Marks messages as read if current user is the recipient
    Supports pagination for performance
    """
    # Get current user's identity from JWT
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Verify conversation exists and user has access
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"success": False, "message": "Conversation not found"}), 404

    # Check if current user is part of this conversation
    if current_user.id not in [conversation.user1_id, conversation.user2_id]:
        return jsonify({"success": False, "message": "Access denied"}), 403

    # Pagination parameters
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 50))
    offset = (page - 1) * limit

    # Get messages for this conversation
    messages_query = Message.query.filter_by(conversation_id=conversation_id)
    total_messages = messages_query.count()
    
    messages = messages_query.order_by(Message.timestamp.desc()).offset(offset).limit(limit).all()
    
    # Reverse to get chronological order (oldest first)
    messages.reverse()

    # Mark unread messages as read (only messages sent to current user)
    unread_messages = Message.query.filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != current_user.id,
        Message.is_read == False
    ).all()

    for msg in unread_messages:
        msg.is_read = True

    if unread_messages:
        db.session.commit()

    # Format response
    messages_data = [message.to_dict() for message in messages]

    return jsonify({
        "success": True,
        "messages": messages_data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total_messages": total_messages,
            "has_next": (page * limit) < total_messages,
            "has_prev": page > 1
        },
        "conversation": {
            "id": conversation.id,
            "user1_id": conversation.user1.public_id,
            "user2_id": conversation.user2.public_id,
            "other_user": conversation.user2.to_dict() if conversation.user1_id == current_user.id else conversation.user1.to_dict()
        }
    }), 200


@app.route("/messages/<int:conversation_id>", methods=["POST"])
@jwt_required()
def send_message(conversation_id):
    """
    Send a message in a conversation
    Saves message to database and updates conversation last_message
    """
    # Get current user's identity from JWT
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Verify conversation exists and user has access
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"success": False, "message": "Conversation not found"}), 404

    # Check if current user is part of this conversation
    if current_user.id not in [conversation.user1_id, conversation.user2_id]:
        return jsonify({"success": False, "message": "Access denied"}), 403

    data = request.json or {}
    content = data.get("content", "").strip()

    if not content:
        return jsonify({"success": False, "message": "Message content cannot be empty"}), 400

    if len(content) > 1000:
        return jsonify({"success": False, "message": "Message too long (max 1000 characters)"}), 400

    # Create new message
    new_message = Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=content,
        is_read=False,  # Initially unread
        timestamp=datetime.utcnow()
    )

    # Update conversation's last message and timestamp
    conversation.last_message = content
    conversation.last_message_at = datetime.utcnow()

    db.session.add(new_message)
    db.session.commit()

    # Prepare real-time event data (you can integrate WebSocket here)
    message_data = new_message.to_dict()
    
    # Determine the recipient
    recipient_id = conversation.user2_id if conversation.user1_id == current_user.id else conversation.user1_id
    recipient = User.query.get(recipient_id)

    # WebSocket event data structure (for future integration)
    websocket_event = {
        "type": "new_message",
        "conversation_id": conversation_id,
        "message": message_data,
        "sender": {
            "id": current_user.public_id,
            "username": current_user.username
        },
        "recipient_id": recipient.public_id
    }

    # TODO: Integrate with WebSocket (Socket.IO or similar)
    # socketio.emit('new_message', websocket_event, room=f"user_{recipient_id}")

    return jsonify({
        "success": True,
        "message": "Message sent successfully",
        "message_id": new_message.id,
        "message_data": message_data,
        "websocket_event": websocket_event  # For debugging, remove in production
    }), 201


@app.route("/conversations/<int:conversation_id>/mark_read", methods=["POST"])
@jwt_required()
def mark_conversation_read(conversation_id):
    """
    Mark all messages in a conversation as read for current user
    Useful when user opens a conversation
    """
    # Get current user's identity from JWT
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Verify conversation exists and user has access
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        return jsonify({"success": False, "message": "Conversation not found"}), 404

    # Check if current user is part of this conversation
    if current_user.id not in [conversation.user1_id, conversation.user2_id]:
        return jsonify({"success": False, "message": "Access denied"}), 403

    # Mark all unread messages from other user as read
    unread_messages = Message.query.filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != current_user.id,
        Message.is_read == False
    ).all()

    for msg in unread_messages:
        msg.is_read = True

    if unread_messages:
        db.session.commit()
        return jsonify({
            "success": True,
            "message": f"Marked {len(unread_messages)} messages as read",
            "marked_count": len(unread_messages)
        }), 200
    else:
        return jsonify({
            "success": True,
            "message": "No unread messages to mark",
            "marked_count": 0
        }), 200


@app.route("/conversations/unread_count", methods=["GET"])
@jwt_required()
def get_total_unread_count():
    """
    Get total unread message count across all conversations
    Useful for showing badge count in UI
    """
    # Get current user's identity from JWT
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Find all conversations where current user is either user1 or user2
    conversations = Conversation.query.filter(
        or_(
            Conversation.user1_id == current_user.id,
            Conversation.user2_id == current_user.id
        )
    ).all()

    # Calculate total unread count across all conversations
    total_unread = 0
    for conv in conversations:
        unread_count = Message.query.filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user.id,
            Message.is_read == False
        ).count()
        total_unread += unread_count

    return jsonify({
        "success": True,
        "total_unread": total_unread
    }), 200









@app.route("/admin/users", methods=["GET"])
@jwt_required()  # Require JWT token
def get_all_users():
    """
    Admin endpoint: Fetch all registered users
    Only accessible if the current user is an admin
    Used for administrative purposes and user management
    """
    # Get current user's identity from JWT
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Check if the current user is admin
    if not current_user.is_admin:
        return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

    # Query all users
    users = User.query.all()

    # Convert each user object to dictionary
    users_data = [user.to_dict() for user in users]

    return jsonify({
        "success": True,
        "total_users": len(users_data),
        "users": users_data
    }), 200


@app.route("/protected")
@jwt_required()  # Require valid JWT token to access this endpoint
def protected():
    """
    Protected endpoint example - requires authentication
    Useful for testing if JWT authentication is working
    Returns current user's profile data
    """
    public_id = get_jwt_identity()
    user = User.query.filter_by(public_id=public_id).first()

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    return jsonify({"success": True, "user": user.to_dict()})


# Application entry point
if __name__ == "__main__":
    # Ensure database tables are created before running the app
    with app.app_context():
        db.create_all()

    # Start the Flask development server
    # debug=True enables auto-reload and detailed error pages (disable in production!)
    app.run(
        debug=os.environ.get("FLASK_DEBUG", "false").lower() == "true",
        host="0.0.0.0",  # Allow connections from all network interfaces
        port=int(os.environ.get("PORT", 5000))  # Use PORT environment variable or default to 5000
    )