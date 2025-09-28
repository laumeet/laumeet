# Import necessary modules and libraries
from flask import Flask, request, jsonify  # Flask web framework and request/response handling
from flask_sqlalchemy import SQLAlchemy  # SQLAlchemy for database ORM
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey  # SQLAlchemy column types
from sqlalchemy.orm import mapped_column, Mapped, relationship  # SQLAlchemy ORM features
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
from flask_cors import CORS, cross_origin  # Cross-Origin Resource Sharing support
import time  # Time functions for rate limiting
import os

# Initialize Flask application
app = Flask(__name__)

# Application configuration settings
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
    "DB_URL", "sqlite:///lausers.db"
)  # Use DATABASE_URL if set, otherwise fallback to local sqlite

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False  # Disable modification tracking for performance

app.config['JWT_SECRET_KEY'] = os.environ.get("JWT_SECRET_KEY", "dev-secret") 
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=14)
app.config['JWT_COOKIE_SAMESITE'] = "None"
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
app.config['JWT_SESSION_COOKIE'] = False

# Get frontend URL from environment variable with proper default
FRONTEND_URL = os.environ.get("NEXT_PUBLIC_API_URL", "https://laumeet.vercel.app")
app.config['JWT_COOKIE_SECURE'] = True  # Always True for HTTPS

# CORS Configuration
CORS(
    app,
    supports_credentials=True,
    origins=[FRONTEND_URL, "http://localhost:3000"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Set-Cookie"]
)

# Initialize database and JWT manager
db = SQLAlchemy(app)  # Database instance
jwt = JWTManager(app)  # JWT manager instance

# Rate limiting storage - stores attempt timestamps for each IP/username combination
# In production, consider using Redis instead of in-memory dictionary
reset_attempts = {}


def rate_limit(max_attempts=5, window_seconds=300):
    """
    Decorator function to implement rate limiting on routes
    Args:
        max_attempts: Maximum number of allowed attempts
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
            if key in reset_attempts:
                reset_attempts[key] = [t for t in reset_attempts[key] if now - t < window_seconds]

            # Check if user has exceeded the maximum allowed attempts
            if len(reset_attempts.get(key, [])) >= max_attempts:
                return jsonify({
                    "success": False,
                    "message": f"Too many attempts. Please try again in {window_seconds // 60} minutes."
                }), 429  # HTTP 429 Too Many Requests

            # Add current attempt timestamp to the list
            if key not in reset_attempts:
                reset_attempts[key] = []
            reset_attempts[key].append(now)

            # Proceed with the original function if rate limit not exceeded
            return f(*args, **kwargs)

        return decorated_function

    return decorator


# Database Models

# Picture model for storing user profile images
class Picture(db.Model):
    __tablename__ = "pictures"  # Database table name

    # Primary key
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # Foreign key to users table with cascade delete (pictures deleted when user is deleted)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    # Image data (URL or base64 encoded string)
    image: Mapped[str] = mapped_column(String(500), nullable=False)
    # Relationship to User model (back reference)
    user = relationship("User", back_populates="pictures")


# Main User model for storing user information
class User(db.Model):
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
    # Last password reset timestamp (for security cooldown)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    last_password_reset: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationship to Picture model - one user can have many pictures
    # cascade="all, delete-orphan" ensures pictures are deleted when user is deleted
    # passive_deletes=True improves performance for cascade operations
    pictures = relationship("Picture", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)

    def set_password(self, password: str):
        """Hash and set the user's password"""
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
            include_security: Whether to include security-related fields (should be False for most responses)
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
            "pictures": [picture.image for picture in self.pictures],  # List of image URLs/data
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


# Token blacklist model for storing revoked JWT tokens
class TokenBlocklist(db.Model):
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
    user = relationship('User', lazy='joined')


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
    This is called automatically by flask_jwt_extended
    """
    jti = jwt_payload["jti"]  # Get JWT ID from payload
    return TokenBlocklist.query.filter_by(jti=jti).first() is not None


@jwt.user_identity_loader
def user_identity_lookup(user):
    """
    Specify what data to use as identity in JWT tokens
    We use public_id instead of database ID for security
    """
    return user.public_id if isinstance(user, User) else user


@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    """
    Load user from database based on JWT identity
    This is called when we use @jwt_required()
    """
    identity = jwt_data["sub"]
    return User.query.filter_by(public_id=identity).first()


# Initialize database tables
with app.app_context():
    db.create_all()  # Create all tables if they don't exist



# Route Handlers

@app.route("/")
def home():
    return jsonify({"message": "Dating App API"})


@app.route("/signup", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
def signup():
    """
    User registration endpoint
    Creates a new user account with provided information
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
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

        # Add pictures to database
        for img in pictures:
            db.session.add(Picture(user=new_user, image=img))

        # Add user to database session and commit
        db.session.add(new_user)
        db.session.commit()

        # Create JWT tokens for immediate login after signup
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

        # Set JWT tokens as HTTP cookies (optional, for browser-based clients)
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)
        response.set_cookie(
            "access_token_cookie",
            access_token,
            httponly=True,
            secure=True,
            samesite="None",
            path="/", 
            max_age=60*60*24*7  # 1 week
        )
        return response, 201  # HTTP 201 Created
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/login", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
def login():
    """
    User authentication endpoint
    Verifies credentials and returns JWT tokens if valid
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
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

        # Create JWT tokens
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

        # Set JWT cookies for browser
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)

        # Set "is_logged_in" cookie for Next.js middleware
        response.set_cookie(
            "access_token_cookie",
            access_token,
            httponly=True,
            secure=True,
            samesite="None",
            path="/", 
            max_age=60*60*24*7  # 1 week
        )
        return response, 200
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/logout", methods=["POST", "OPTIONS"])
@jwt_required(verify_type=False)  # allow both access and refresh tokens
@cross_origin(supports_credentials=True)
def logout():
    """
    Logout endpoint
    Revokes the current JWT (access or refresh) and clears cookies.
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
        jwt_data = get_jwt()
        jti = jwt_data["jti"]             # Unique token ID
        token_type = jwt_data["type"]     # "access" or "refresh"
        user_id = get_jwt_identity()       # Current user public_id

        # Find user by public_id
        user = User.query.filter_by(public_id=user_id).first()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Add token to blocklist
        db.session.add(TokenBlocklist(
            jti=jti,
            token_type=token_type,
            user_id=user.id,
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
            httponly=False,   # accessible by frontend
            secure=True,      # required in production for HTTPS
            samesite="None",
            expires=0   # allow cross-site
        )

        return response, 200
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/forgot-password", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
def forgot_password():
    """
    Step 1 of password reset process
    User submits username, system returns their security question
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
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
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/reset-password", methods=["POST", "OPTIONS"])
@rate_limit(max_attempts=5, window_seconds=300)  # Apply rate limiting
@cross_origin(supports_credentials=True)
def reset_password():
    """
    Step 2 of password reset process
    User submits username, security answer, and new password
    If answer is correct, password is reset
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
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
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/explore", methods=["GET", "OPTIONS"])
@jwt_required()
@cross_origin(supports_credentials=True)
def explore():
    """
    Explore endpoint - requires authentication
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
        user_id = get_jwt_identity()
        return jsonify({"success": True, "message": f"Hello user {user_id}, welcome to Explore!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/profile", methods=["GET", "OPTIONS"])
@jwt_required()  # Require valid JWT token to access this endpoint
@cross_origin(supports_credentials=True)
def get_my_profile():
    """
    Get current user's profile information
    Requires authentication via JWT
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
        # Get user identity from JWT token
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
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/profile", methods=["PUT", "OPTIONS"])
@jwt_required()  # Require valid JWT token to access this endpoint
@cross_origin(supports_credentials=True)
def update_my_profile():
    """
    Update current user's profile information
    Requires authentication via JWT
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
        # Get user identity from JWT token
        public_id = get_jwt_identity()

        # Find user by public_id
        user = User.query.filter_by(public_id=public_id).first()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        data = request.json or {}  # Get update data from request

        # Update allowed fields with new values or keep existing ones
        if "username" in data:
            user.username = data.get("username")
        if "bio" in data:
            user.bio = data.get("bio")
        if "department" in data:
            user.department = data.get("department")
        if "category" in data:
            user.category = data.get("category")
        if "gender" in data:
            user.gender = data.get("gender")
        if "interestedIn" in data:
            user.interested_in = data.get("interestedIn")
        if "level" in data:
            user.level = data.get("level")
        if "isAnonymous" in data:
            user.is_anonymous = data.get("isAnonymous")

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
    
    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/admin/users", methods=["GET", "OPTIONS"])
@jwt_required()  # Require JWT token
@cross_origin(supports_credentials=True)
def get_all_users():
    """
    Admin: Fetch all registered users
    Only accessible if the current user is an admin
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
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
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/protected", methods=["GET", "OPTIONS"])
@jwt_required()  # Require valid JWT token to access this endpoint
@cross_origin(supports_credentials=True)
def protected():
    """
    Protected endpoint example - requires authentication
    Useful for testing if JWT authentication is working
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
        public_id = get_jwt_identity()
        user = User.query.filter_by(public_id=public_id).first()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        return jsonify({"success": True, "user": user.to_dict()})
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


@app.route("/refresh", methods=["POST", "OPTIONS"])
@jwt_required(refresh=True)
@cross_origin(supports_credentials=True)
def refresh():
    """
    Refresh access token using refresh token
    """
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200
        
    try:
        identity = get_jwt_identity()
        access_token = create_access_token(identity=identity)
        
        response = jsonify({
            "success": True,
            "access_token": access_token
        })
        set_access_cookies(response, access_token)
        return response
    
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500


# Application entry point
if __name__ == "__main__":
    # Ensure database tables are created before running the app
    with app.app_context():
        db.create_all()

    # Start the Flask development server
    # debug=True enables auto-reload and detailed error pages (disable in production!)
    app.run(debug=False, host="0.0.0.0", port=5000)