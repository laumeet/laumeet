from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
    set_access_cookies, set_refresh_cookies, unset_jwt_cookies
)
from datetime import datetime, timedelta, timezone
import re
import uuid
import base64
from functools import wraps
from flask_cors import CORS
import time

app = Flask(__name__)
CORS(app) 
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///lausers.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = 'your-secret-key-change-this-in-production'  # Change this!
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=14)  # 14-day refresh tokens
app.config['JWT_TOKEN_LOCATION'] = ['cookies', 'headers']  # Accept both cookies and headers
app.config['JWT_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
app.config['JWT_COOKIE_CSRF_PROTECT'] = False  # Set to True with proper CSRF protection

db = SQLAlchemy(app)
jwt = JWTManager(app)

# Rate limiting storage (in production, use Redis)
reset_attempts = {}


def rate_limit(max_attempts=5, window_seconds=300):
    """Decorator to limit password reset attempts"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip = request.remote_addr
            username = request.json.get('username') if request.json else None

            # Use IP + username as key for rate limiting
            key = f"{ip}:{username}" if username else ip

            now = time.time()

            # Clean old attempts
            reset_attempts[key] = [attempt for attempt in reset_attempts.get(key, [])
                                   if now - attempt < window_seconds]

            # Check if exceeded limit
            if len(reset_attempts.get(key, [])) >= max_attempts:
                return jsonify({
                    "success": False,
                    "message": f"Too many attempts. Please try again in {window_seconds // 60} minutes."
                }), 429

            # Add current attempt
            if key not in reset_attempts:
                reset_attempts[key] = []
            reset_attempts[key].append(now)

            return f(*args, **kwargs)

        return decorated_function

    return decorator


# Picture model for storing user images
class Picture(db.Model):
    __tablename__ = "pictures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    image: Mapped[str] = mapped_column(String(500), nullable=False)  # URL or base64 string

    user = relationship("User", back_populates="pictures")


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    security_question: Mapped[str] = mapped_column(String(255), nullable=False)
    security_answer: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=True)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=True)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    genotype: Mapped[str] = mapped_column(String(5), nullable=True)
    level: Mapped[str] = mapped_column(String(20), nullable=True)
    interested_in: Mapped[str] = mapped_column(String(50), nullable=True)
    religious: Mapped[str] = mapped_column(String(50), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    bio: Mapped[str] = mapped_column(String(500), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_password_reset: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationship with pictures
    pictures = relationship("Picture", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)

    def set_password(self, password: str):
        self.password = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password, password)

    def set_security_answer(self, answer: str):
        self.security_answer = generate_password_hash(answer.lower().strip())

    def check_security_answer(self, answer: str) -> bool:
        return check_password_hash(self.security_answer, answer.lower().strip())

    def to_dict(self, include_security=False):
        """Convert user object to dictionary with all fields"""
        data = {
            "id": self.public_id,  # Using public_id as frontend ID
            "username": self.username,
            "name": self.name,
            "age": str(self.age),  # Convert to string as per frontend expectation
            "gender": self.gender,
            "department": self.department,
            "genotype": self.genotype,
            "level": self.level,
            "interestedIn": self.interested_in,
            "religious": self.religious,
            "isAnonymous": self.is_anonymous,
            "category": self.category,
            "bio": self.bio,
            "pictures": [picture.image for picture in self.pictures],
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None
        }

        if include_security:
            data["security_question"] = self.security_question
            # Never include security_answer in response

        return data

    def __repr__(self):
        return f"<User {self.username}>"


# Token blacklist model (for logout functionality)
class TokenBlocklist(db.Model):
    __tablename__ = "token_blacklist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jti: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    token_type: Mapped[str] = mapped_column(String(10), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    user = db.relationship('User', lazy='joined')


# Common security questions (can be extended)
COMMON_SECURITY_QUESTIONS = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your elementary school?",
    "What was your childhood nickname?",
    "What is the name of your favorite childhood friend?",
    "What street did you grow up on?",
    "What was the make of your first car?",
    "What is your favorite movie?",
    "What is your favorite book?"
]


def is_valid_username(username):
    """Validate username format"""
    if len(username) < 3 or len(username) > 50:
        return False
    # Allow only alphanumeric characters and underscores
    return bool(re.match(r'^[a-zA-Z0-9_]+$', username))


def is_strong_password(password):
    """Check if password meets security requirements"""
    if len(password) < 8:
        return False
    # Check for at least one digit and one uppercase letter
    has_digit = any(char.isdigit() for char in password)
    has_upper = any(char.isupper() for char in password)
    return has_digit and has_upper


def validate_gender(gender):
    """Validate gender field"""
    allowed_genders = ["male", "female", "other"]
    return gender.lower() in allowed_genders if gender else False


def is_valid_image_data(image_data, max_size_kb=500):
    """Validate if image data is either a URL or valid base64 and within size limits"""
    # Check if it's a URL
    if image_data.startswith(('http://', 'https://')):
        return True, "url"

    # Check if it's base64
    if image_data.startswith('data:image/'):
        try:
            # Extract the base64 part
            header, data = image_data.split(',', 1)
            # Check if the data is valid base64
            base64.b64decode(data)

            # Check size limit (approx 3/4 of original base64 size)
            size_kb = len(data) * 3 / 4 / 1024
            if size_kb > max_size_kb:
                return False, f"Image size exceeds {max_size_kb}KB limit"

            return True, "base64"
        except (ValueError, base64.binascii.Error):
            return False, "Invalid base64 image data"

    return False, "Image must be a valid URL or base64 data URI"


@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """Check if token is in the blacklist"""
    jti = jwt_payload["jti"]
    token = TokenBlocklist.query.filter_by(jti=jti).first()
    return token is not None


@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    """Handle expired tokens"""
    return jsonify({
        "success": False,
        "message": "Token has expired",
        "error": "token_expired"
    }), 401


@jwt.invalid_token_loader
def invalid_token_callback(error):
    """Handle invalid tokens"""
    return jsonify({
        "success": False,
        "message": "Invalid token",
        "error": "token_invalid"
    }), 401


@jwt.unauthorized_loader
def missing_token_callback(error):
    """Handle missing tokens"""
    return jsonify({
        "success": False,
        "message": "Request does not contain an access token",
        "error": "authorization_required"
    }), 401


@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    """Handle revoked tokens"""
    return jsonify({
        "success": False,
        "message": "Token has been revoked",
        "error": "token_revoked"
    }), 401


@jwt.user_identity_loader
def user_identity_lookup(user):
    """Specify what goes into the JWT token as identity"""
    return user.public_id if isinstance(user, User) else user


@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    """Load user from database based on JWT identity"""
    identity = jwt_data["sub"]
    return User.query.filter_by(public_id=identity).first()


with app.app_context():
    db.create_all()


@app.route('/')
def home():
    return jsonify({"message": "Dating App API"})


@app.route("/security-questions", methods=["GET"])
def get_security_questions():
    """Get list of common security questions"""
    return jsonify({
        "success": True,
        "questions": COMMON_SECURITY_QUESTIONS
    })


@app.route("/signup", methods=["POST"])
def signup():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    security_question = data.get("security_question")
    security_answer = data.get("security_answer")
    age = data.get("age")
    department = data.get("department")
    gender = data.get("gender")
    genotype = data.get("genotype")
    level = data.get("level")
    interested_in = data.get("interestedIn")
    religious = data.get("religious")
    is_anonymous = data.get("isAnonymous", False)
    category = data.get("category", "friend")
    bio = data.get("bio")
    pictures = data.get("pictures", [])  # List of image URLs or base64 strings

    # Required field validation
    required_fields = ["username", "password"]
    for field in required_fields:
        if not data.get(field):
            return jsonify({"success": False, "message": f"{field} is required"}), 400

    # Validate username format
    if not is_valid_username(username):
        return jsonify({"success": False,
                        "message": "Username must be 3-50 characters and contain only letters, numbers, and underscores"}), 400

    # Validate password strength
    if not is_strong_password(password):
        return jsonify({"success": False,
                        "message": "Password must be at least 8 characters with at least one number and one uppercase letter"}), 400

    # Validate security question and answer
    if len(security_question.strip()) < 5:
        return jsonify({"success": False, "message": "Security question must be at least 5 characters long"}), 400

    if len(security_answer.strip()) < 2:
        return jsonify({"success": False, "message": "Security answer must be at least 2 characters long"}), 400

    # Validate age is integer
    try:
        age = int(age)
        if age < 18 or age > 100:
            return jsonify({"success": False, "message": "Age must be between 18 and 100"}), 400
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Age must be a valid number"}), 400
    
    # Validate gender
    if not validate_gender(gender):
        return jsonify({"success": False, "message": "Gender must be one of: male, female, other"}), 400

    # Validate is_anonymous is boolean
    if not isinstance(is_anonymous, bool):
        return jsonify({"success": False, "message": "isAnonymous must be a boolean value"}), 400

    # Validate pictures
    if len(pictures) > 10:
        return jsonify({"success": False, "message": "Maximum 10 pictures allowed"}), 400

    for image_data in pictures:
        is_valid, message = is_valid_image_data(image_data)
        if not is_valid:
            return jsonify({"success": False, "message": f"Invalid image: {message}"}), 400

    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "Username already taken"}), 400

    # Create user
    new_user = User(
        username=username,
        security_question=security_question.strip(),
        
        age=age,
        department=department,
        gender=gender.lower(),  # Store in lowercase for consistency
        genotype=genotype,
        level=level,
        interested_in=interested_in,
        religious=religious,
        is_anonymous=is_anonymous,
        category=category,
        bio=bio
    )
    print(new_user)
    new_user.set_password(password)
    new_user.set_security_answer(security_answer)

    # Add pictures if provided
    for image_url in pictures:
        picture = Picture(user=new_user, image=image_url)
        db.session.add(picture)

    db.session.add(new_user)
    db.session.commit()

    # Create tokens
    access_token = create_access_token(identity=new_user)
    refresh_token = create_refresh_token(identity=new_user)

    response = jsonify({
        "success": True,
        "message": "User created successfully",
        "user": new_user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    })

    # Set cookies if using cookie-based authentication
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)

    return response, 201


@app.route("/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "Username and password required"}), 400

    # Find user by username
    user = User.query.filter_by(username=username).first()

    if user and user.check_password(password):
        # Create tokens
        access_token = create_access_token(identity=user)
        refresh_token = create_refresh_token(identity=user)

        response = jsonify({
            "success": True,
            "message": "Login successful",
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        })

        # Set cookies if using cookie-based authentication
        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)

        return response, 200
    else:
        return jsonify({"success": False, "message": "Invalid username or password"}), 401


@app.route("/password-reset-request", methods=["POST"])
@rate_limit(max_attempts=5, window_seconds=300)  # 5 attempts per 5 minutes
def password_reset_request():
    """Step 1: Request password reset - returns security question"""
    data = request.json
    username = data.get("username")

    if not username:
        return jsonify({"success": False, "message": "Username is required"}), 400

    user = User.query.filter_by(username=username).first()

    # Don't reveal if user exists or not to prevent username enumeration
    if not user:
        # Return generic message to avoid revealing which usernames exist
        return jsonify({
            "success": True,  # Still return success to not reveal user existence
            "message": "If the username exists, a security question will be shown",
            "security_question": "What was the name of your first pet?"  # Generic question
        })

    return jsonify({
        "success": True,
        "message": "Security question retrieved successfully",
        "security_question": user.security_question
    })


@app.route("/password-reset-confirm", methods=["POST"])
@rate_limit(max_attempts=3, window_seconds=900)  # 3 attempts per 15 minutes
def password_reset_confirm():
    """Step 2: Confirm security answer and reset password"""
    data = request.json
    username = data.get("username")
    security_answer = data.get("security_answer")
    new_password = data.get("new_password")

    if not username or not security_answer or not new_password:
        return jsonify({"success": False, "message": "Username, security answer, and new password are required"}), 400

    user = User.query.filter_by(username=username).first()

    # Don't reveal if user exists or not
    if not user:
        return jsonify({"success": False, "message": "Invalid request"}), 400

    # Check if user has attempted too many resets recently
    if user.last_password_reset and (datetime.utcnow() - user.last_password_reset) < timedelta(hours=1):
        return jsonify({
            "success": False,
            "message": "Password reset recently attempted. Please wait 1 hour before trying again."
        }), 429

    # Verify security answer
    if not user.check_security_answer(security_answer):
        return jsonify({"success": False, "message": "Security answer is incorrect"}), 401

    # Validate new password strength
    if not is_strong_password(new_password):
        return jsonify({"success": False,
                        "message": "New password must be at least 8 characters with at least one number and one uppercase letter"}), 400

    # Update password
    user.set_password(new_password)
    user.last_password_reset = datetime.utcnow()
    db.session.commit()

    # Revoke all existing tokens for security
    revoked_tokens = TokenBlocklist.query.filter_by(user_id=user.id).all()
    for token in revoked_tokens:
        db.session.delete(token)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Password reset successfully. Please login with your new password."
    })


@app.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token using a valid refresh token"""
    current_user = get_jwt_identity()
    access_token = create_access_token(identity=current_user)

    response = jsonify({
        "success": True,
        "message": "Token refreshed successfully",
        "access_token": access_token
    })

    set_access_cookies(response, access_token)
    return response, 200


@app.route("/logout", methods=["POST"])
@jwt_required(verify_type=False)
def logout():
    """Revoke access/refresh tokens and clear cookies"""
    jwt_data = get_jwt()
    jti = jwt_data["jti"]
    token_type = jwt_data["type"]
    user_id = jwt_data["sub"]  # Use public_id from JWT

    user = User.query.filter_by(public_id=user_id).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    expires = datetime.fromtimestamp(jwt_data["exp"], tz=timezone.utc)

    # Add token to blacklist
    revoked_token = TokenBlocklist(
        jti=jti,
        token_type=token_type,
        user_id=user.id,
        revoked_at=datetime.now(timezone.utc),
        expires=expires
    )
    db.session.add(revoked_token)
    db.session.commit()

    response = jsonify({
        "success": True,
        "message": "Logged out successfully"
    })

    unset_jwt_cookies(response)
    return response, 200


@app.route("/profile/<public_id>", methods=["GET"])
def get_profile(public_id):
    user = User.query.filter_by(public_id=public_id).first()
    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    return jsonify({
        "success": True,
        "user": user.to_dict()
    })


@app.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    current_user = get_jwt_identity()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    data = request.json

    # Update basic fields
    if "name" in data:
        current_user.name = data.get("name")
    if "age" in data:
        try:
            age = int(data.get("age"))
            if age < 18 or age > 100:
                return jsonify({"success": False, "message": "Age must be between 18 and 100"}), 400
            current_user.age = age
        except (ValueError, TypeError):
            return jsonify({"success": False, "message": "Age must be a valid number"}), 400
    if "department" in data:
        current_user.department = data.get("department")
    if "gender" in data:
        if not validate_gender(data.get("gender")):
            return jsonify({"success": False, "message": "Gender must be one of: male, female, other"}), 400
        current_user.gender = data.get("gender").lower()
    if "genotype" in data:
        current_user.genotype = data.get("genotype")
    if "level" in data:
        current_user.level = data.get("level")
    if "interestedIn" in data:
        current_user.interested_in = data.get("interestedIn")
    if "religious" in data:
        current_user.religious = data.get("religious")
    if "isAnonymous" in data:
        if not isinstance(data.get("isAnonymous"), bool):
            return jsonify({"success": False, "message": "isAnonymous must be a boolean value"}), 400
        current_user.is_anonymous = data.get("isAnonymous")
    if "category" in data:
        current_user.category = data.get("category")
    if "bio" in data:
        current_user.bio = data.get("bio")

    # Update pictures if provided
    if "pictures" in data:
        pictures = data.get("pictures", [])

        # Validate pictures
        if len(pictures) > 10:
            return jsonify({"success": False, "message": "Maximum 10 pictures allowed"}), 400

        for image_data in pictures:
            is_valid, message = is_valid_image_data(image_data)
            if not is_valid:
                return jsonify({"success": False, "message": f"Invalid image: {message}"}), 400

        # Delete existing pictures
        Picture.query.filter_by(user_id=current_user.id).delete()

        # Add new pictures
        for image_url in pictures:
            picture = Picture(user=current_user, image=image_url)
            db.session.add(picture)

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Profile updated successfully",
        "user": current_user.to_dict()
    })


@app.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    current_user = get_jwt_identity()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    data = request.json
    old_password = data.get("old_password")
    new_password = data.get("new_password")

    if not old_password or not new_password:
        return jsonify({"success": False, "message": "Both old and new passwords are required"}), 400

    if not current_user.check_password(old_password):
        return jsonify({"success": False, "message": "Current password is incorrect"}), 401

    # Validate new password strength
    if not is_strong_password(new_password):
        return jsonify({"success": False,
                        "message": "New password must be at least 8 characters with at least one number and one uppercase letter"}), 400

    current_user.set_password(new_password)
    current_user.last_password_reset = datetime.utcnow()
    db.session.commit()

    return jsonify({"success": True, "message": "Password updated successfully"})


@app.route("/protected")
@jwt_required()
def protected():
    current_user = get_jwt_identity()
    return jsonify({
        "success": True,
        "message": "This is a protected route",
        "user": current_user.to_dict()
    })


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True)