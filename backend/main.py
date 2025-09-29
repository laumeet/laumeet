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

# Enhanced CORS Configuration
CORS(
    app,
    supports_credentials=True,
    origins=["https://laumeet.vercel.app", "http://localhost:3000"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    expose_headers=["Set-Cookie"],
    max_age=86400
)

# Application configuration settings
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get("DB_URL", "sqlite:///lausers.db")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get("JWT_SECRET_KEY", "dev-secret") 
app.config['JWT_TOKEN_LOCATION'] = ['cookies']
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=14)

# Fixed JWT Cookie Configuration
app.config['JWT_COOKIE_SAMESITE'] = "None"
app.config['JWT_COOKIE_CSRF_PROTECT'] = False
app.config['JWT_SESSION_COOKIE'] = False
app.config['JWT_COOKIE_SECURE'] = True
app.config['JWT_ACCESS_COOKIE_NAME'] = 'access_token_cookie'
app.config['JWT_REFRESH_COOKIE_NAME'] = 'refresh_token_cookie'
app.config['JWT_COOKIE_PATH'] = '/'
app.config['JWT_COOKIE_DOMAIN'] = None

# Initialize database and JWT manager
db = SQLAlchemy(app)
jwt = JWTManager(app)

# Rate limiting storage
reset_attempts = {}

def rate_limit(max_attempts=5, window_seconds=300):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            ip = request.remote_addr
            username = request.json.get('username') if request.json else None
            key = f"{ip}:{username}" if username else ip

            now = time.time()

            if key in reset_attempts:
                reset_attempts[key] = [t for t in reset_attempts[key] if now - t < window_seconds]

            if len(reset_attempts.get(key, [])) >= max_attempts:
                return jsonify({
                    "success": False,
                    "message": f"Too many attempts. Please try again in {window_seconds // 60} minutes."
                }), 429

            if key not in reset_attempts:
                reset_attempts[key] = []
            reset_attempts[key].append(now)

            return f(*args, **kwargs)

        return decorated_function
    return decorator

# Database Models
class Picture(db.Model):
    __tablename__ = "pictures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    image: Mapped[str] = mapped_column(String(500), nullable=False)
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
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    last_password_reset: Mapped[datetime] = mapped_column(DateTime, nullable=True)

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
        data = {
            "id": self.public_id,
            "username": self.username,
            "name": self.name,
            "age": str(self.age),
            "gender": self.gender,
            "department": self.department,
            "genotype": self.genotype,
            "level": self.level,
            "interestedIn": self.interested_in,
            "religious": self.religious,
            "isAnonymous": self.is_anonymous,
            "category": self.category,
            "bio": self.bio,
            "is_admin": self.is_admin,
            "pictures": [picture.image for picture in self.pictures],
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None
        }
        if include_security:
            data["security_question"] = self.security_question
        return data

    def __repr__(self):
        return f"<User {self.username}>"

class TokenBlocklist(db.Model):
    __tablename__ = "token_blacklist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jti: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    token_type: Mapped[str] = mapped_column(String(10), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    user = relationship('User', lazy='joined')

# Validation Functions
def is_valid_username(username):
    return bool(username) and 3 <= len(username) <= 50 and re.match(r'^[a-zA-Z0-9_]+$', username)

def is_strong_password(password):
    if not password or len(password) < 8:
        return False
    return any(c.isdigit() for c in password) and any(c.isupper() for c in password)

def validate_gender(gender):
    return bool(gender) and gender.lower() in ["male", "female", "other"]

def is_valid_image_data(image_data, max_size_kb=500):
    if image_data.startswith(('http://', 'https://')):
        return True, "url"

    if image_data.startswith('data:image/'):
        try:
            header, data = image_data.split(',', 1)
            base64.b64decode(data)

            size_kb = len(data) * 3 / 4 / 1024
            if size_kb > max_size_kb:
                return False, f"Image size exceeds {max_size_kb}KB limit"

            return True, "base64"
        except Exception:
            return False, "Invalid base64 image data"

    return False, "Image must be a valid URL or base64 data URI"

# JWT Configuration Callbacks
@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    jti = jwt_payload["jti"]
    return TokenBlocklist.query.filter_by(jti=jti).first() is not None

@jwt.user_identity_loader
def user_identity_lookup(user):
    return user.public_id if isinstance(user, User) else user

@jwt.user_lookup_loader
def user_lookup_callback(_jwt_header, jwt_data):
    identity = jwt_data["sub"]
    return User.query.filter_by(public_id=identity).first()

# Initialize database tables
with app.app_context():
    db.create_all()

# CORS headers middleware
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Route Handlers
@app.route("/")
def home():
    return jsonify({"message": "Dating App API"})

@app.route("/signup", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
def signup():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        data = request.json or {}
        username = data.get("username")
        password = data.get("password")
        security_question = data.get("security_question")
        security_answer = data.get("security_answer")
        name = data.get("name")
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
        pictures = data.get("pictures", [])

        if not username or not password:
            return jsonify({"success": False, "message": "Username and password are required"}), 400

        if not security_question or len(security_question.strip()) < 5:
            return jsonify({"success": False, "message": "Security question must be at least 5 characters long"}), 400

        if not security_answer or len(security_answer.strip()) < 2:
            return jsonify({"success": False, "message": "Security answer must be at least 2 characters long"}), 400

        if not is_valid_username(username):
            return jsonify({"success": False, "message": "Invalid username format"}), 400

        if not is_strong_password(password):
            return jsonify({"success": False, "message": "Weak password"}), 400

        try:
            age = int(age)
            if age < 18 or age > 100:
                return jsonify({"success": False, "message": "Age must be between 18 and 100"}), 400
        except (ValueError, TypeError):
            return jsonify({"success": False, "message": "Age must be a valid number"}), 400

        if not validate_gender(gender):
            return jsonify({"success": False, "message": "Gender must be male, female, or other"}), 400

        if not isinstance(is_anonymous, bool):
            return jsonify({"success": False, "message": "isAnonymous must be boolean"}), 400

        if not category:
            return jsonify({"success": False, "message": "Category is required"}), 400

        if len(pictures) > 10:
            return jsonify({"success": False, "message": "Max 10 pictures allowed"}), 400

        for img in pictures:
            valid, msg = is_valid_image_data(img)
            if not valid:
                return jsonify({"success": False, "message": f"Invalid image: {msg}"}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({"success": False, "message": "Username already taken"}), 400

        new_user = User(
            username=username,
            security_question=security_question.strip(),
            age=age,
            department=department or "",
            gender=gender.lower(),
            genotype=genotype or "",
            level=level or "",
            interested_in=interested_in or "",
            religious=religious or "",
            is_anonymous=is_anonymous,
            category=category,
            bio=bio or "",
            name=name or ""
        )

        new_user.set_password(password)
        new_user.set_security_answer(security_answer)

        for img in pictures:
            db.session.add(Picture(user=new_user, image=img))

        db.session.add(new_user)
        db.session.commit()

        # FIXED: Use public_id consistently
        access_token = create_access_token(identity=new_user.public_id)
        refresh_token = create_refresh_token(identity=new_user.public_id)

        response = jsonify({
            "success": True,
            "message": "User created successfully",
            "user": new_user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        })

        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)

        return response, 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route("/login", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
def login():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        data = request.json or {}
        username = data.get("username")
        password = data.get("password")

        if not username or not password:
            return jsonify({"success": False, "message": "Username and password required"}), 400

        user = User.query.filter_by(username=username).first()

        if not user or not user.check_password(password):
            return jsonify({"success": False, "message": "Invalid username or password"}), 401

        # FIXED: Use public_id consistently
        access_token = create_access_token(identity=user.public_id)
        refresh_token = create_refresh_token(identity=user.public_id)

        response = jsonify({
            "success": True,
            "message": "Login successful",
            "user": user.to_dict(),
            "access_token": access_token,
            "refresh_token": refresh_token
        })

        set_access_cookies(response, access_token)
        set_refresh_cookies(response, refresh_token)

        return response, 200

    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route("/logout", methods=["POST", "OPTIONS"])
@jwt_required(verify_type=False)
@cross_origin(supports_credentials=True)
def logout():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        jwt_data = get_jwt()
        jti = jwt_data["jti"]
        token_type = jwt_data["type"]
        user_id = get_jwt_identity()

        user = User.query.filter_by(public_id=user_id).first()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        db.session.add(TokenBlocklist(
            jti=jti,
            token_type=token_type,
            user_id=user.id,
            revoked_at=datetime.utcnow(),
            expires=datetime.fromtimestamp(jwt_data["exp"], tz=timezone.utc)
        ))
        db.session.commit()

        response = jsonify({
            "success": True,
            "message": "Successfully logged out"
        })

        unset_jwt_cookies(response)

        return response, 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route("/forgot-password", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
def forgot_password():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        data = request.json or {}
        username = data.get("username")

        if not username:
            return jsonify({"success": False, "message": "Username required"}), 400

        user = User.query.filter_by(username=username).first()

        if not user:
            return jsonify({"success": True, "question": None}), 200

        return jsonify({
            "success": True,
            "question": user.security_question
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route("/reset-password", methods=["POST", "OPTIONS"])
@rate_limit(max_attempts=5, window_seconds=300)
@cross_origin(supports_credentials=True)
def reset_password():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        data = request.json or {}
        username = data.get("username")
        answer = data.get("security_answer")
        new_password = data.get("new_password")

        if not username or not answer or not new_password:
            return jsonify({"success": False, "message": "All fields are required"}), 400

        user = User.query.filter_by(username=username).first()

        if not user:
            return jsonify({"success": False, "message": "Invalid credentials"}), 400

        if not user.check_security_answer(answer):
            return jsonify({"success": False, "message": "Security answer is incorrect"}), 401

        if not is_strong_password(new_password):
            return jsonify({"success": False, "message": "New password is too weak"}), 400

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
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        user_id = get_jwt_identity()
        return jsonify({"success": True, "message": f"Hello user {user_id}, welcome to Explore!"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route("/profile", methods=["GET", "OPTIONS"])
@jwt_required()
@cross_origin(supports_credentials=True)
def get_my_profile():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        public_id = get_jwt_identity()
        user = User.query.filter_by(public_id=public_id).first()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        return jsonify({
            "success": True,
            "user": user.to_dict()
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route("/profile", methods=["PUT", "OPTIONS"])
@jwt_required()
@cross_origin(supports_credentials=True)
def update_my_profile():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        public_id = get_jwt_identity()
        user = User.query.filter_by(public_id=public_id).first()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        data = request.json or {}

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

        if user.bio and len(user.bio) > 500:
            return jsonify({"success": False, "message": "Bio too long (max 500 chars)"}), 400

        if user.gender and not validate_gender(user.gender):
            return jsonify({"success": False, "message": "Invalid gender"}), 400

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Profile updated successfully",
            "user": user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route("/admin/users", methods=["GET", "OPTIONS"])
@jwt_required()
@cross_origin(supports_credentials=True)
def get_all_users():
    if request.method == "OPTIONS":
        return jsonify({"success": True}), 200

    try:
        public_id = get_jwt_identity()
        current_user = User.query.filter_by(public_id=public_id).first()

        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        if not current_user.is_admin:
            return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

        users = User.query.all()
        users_data = [user.to_dict() for user in users]

        return jsonify({
            "success": True,
            "total_users": len(users_data),
            "users": users_data
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": f"Server error: {str(e)}"}), 500

@app.route("/protected", methods=["GET", "OPTIONS"])
@jwt_required()
@cross_origin(supports_credentials=True)
def protected():
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
    with app.app_context():
        db.create_all()
    app.run(debug=False, host="0.0.0.0", port=5000)