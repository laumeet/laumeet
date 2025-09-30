# app.py
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
import re, uuid, base64, time, os
from functools import wraps
from flask_cors import CORS, cross_origin

# ---------------------------------------------------------
# App & Config
# ---------------------------------------------------------
app = Flask(__name__)
CORS(
    app,
    supports_credentials=True,
    origins=["https://laumeet.vercel.app", "http://localhost:3000"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
    expose_headers=["Set-Cookie"],
)

app.config.update(
    SQLALCHEMY_DATABASE_URI=os.environ.get("DB_URL", "sqlite:///lausers.db"),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    JWT_SECRET_KEY=os.environ.get("JWT_SECRET_KEY", "dev-secret"),
    JWT_TOKEN_LOCATION=['cookies'],
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=24),
    JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=14),
    JWT_COOKIE_SAMESITE="None",
    JWT_COOKIE_CSRF_PROTECT=False,
    JWT_SESSION_COOKIE=True,
    JWT_COOKIE_SECURE=True,  # must be True in production (HTTPS)
)

db = SQLAlchemy(app)
jwt = JWTManager(app)

# ---------------------------------------------------------
# Rate limiting (in-memory, consider Redis for production)
# ---------------------------------------------------------
reset_attempts = {}

def rate_limit(max_attempts=5, window_seconds=300):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            ip = request.remote_addr
            username = request.json.get("username") if request.json else None
            key = f"{ip}:{username}" if username else ip
            now = time.time()

            reset_attempts.setdefault(key, [])
            reset_attempts[key] = [t for t in reset_attempts[key] if now - t < window_seconds]

            if len(reset_attempts[key]) >= max_attempts:
                return jsonify({
                    "success": False,
                    "message": f"Too many attempts. Try again in {window_seconds//60} minutes."
                }), 429

            reset_attempts[key].append(now)
            return f(*args, **kwargs)
        return decorated
    return decorator

# ---------------------------------------------------------
# Models
# ---------------------------------------------------------
class Picture(db.Model):
    __tablename__ = "pictures"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
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
    name: Mapped[str] = mapped_column(String(100))
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    department: Mapped[str] = mapped_column(String(100))
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    genotype: Mapped[str] = mapped_column(String(5))
    level: Mapped[str] = mapped_column(String(20))
    interested_in: Mapped[str] = mapped_column(String(50))
    religious: Mapped[str] = mapped_column(String(50))
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    bio: Mapped[str] = mapped_column(String(500))
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    last_password_reset: Mapped[datetime] = mapped_column(DateTime)

    pictures = relationship("Picture", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)

    def set_password(self, pwd): self.password = generate_password_hash(pwd)
    def check_password(self, pwd): return check_password_hash(self.password, pwd)
    def set_security_answer(self, ans): self.security_answer = generate_password_hash(ans.lower().strip())
    def check_security_answer(self, ans): return check_password_hash(self.security_answer, ans.lower().strip())

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
            "pictures": [p.image for p in self.pictures],
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None,
        }
        if include_security:
            data["security_question"] = self.security_question
        return data

class TokenBlocklist(db.Model):
    __tablename__ = "token_blacklist"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jti: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    token_type: Mapped[str] = mapped_column(String(10), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    user = relationship("User", lazy="joined")

# ---------------------------------------------------------
# Validators
# ---------------------------------------------------------
def is_valid_username(username): return bool(username) and 3 <= len(username) <= 50 and re.match(r'^[a-zA-Z0-9_]+$', username)
def is_strong_password(password): return password and len(password) >= 8 and any(c.isdigit() for c in password) and any(c.isupper() for c in password)
def validate_gender(g): return g and g.lower() in ["male", "female", "other"]

def is_valid_image_data(img, max_size_kb=500):
    if img.startswith(("http://", "https://")): return True, "url"
    if img.startswith("data:image/"):
        try:
            header, data = img.split(",", 1)
            base64.b64decode(data)
            if (len(data)*3/4/1024) > max_size_kb:
                return False, f"Image > {max_size_kb}KB"
            return True, "base64"
        except Exception:
            return False, "Invalid base64"
    return False, "Invalid image"

# ---------------------------------------------------------
# JWT Callbacks
# ---------------------------------------------------------
@jwt.token_in_blocklist_loader
def check_revoked(jwt_header, jwt_payload): return TokenBlocklist.query.filter_by(jti=jwt_payload["jti"]).first() is not None

@jwt.user_identity_loader
def identity_lookup(user): return user.public_id if isinstance(user, User) else user

@jwt.user_lookup_loader
def user_lookup(_jwt_header, jwt_data): return User.query.filter_by(public_id=jwt_data["sub"]).first()

# ---------------------------------------------------------
# Routes
# ---------------------------------------------------------
@app.route("/")
def home(): return jsonify({"message": "Dating App API"})

# --- Signup/Login/Logout ---
@app.route("/signup", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
def signup():
    if request.method == "OPTIONS": return jsonify(success=True), 200
    try:
        data = request.json or {}
        username, password, sq, sa = data.get("username"), data.get("password"), data.get("security_question"), data.get("security_answer")
        if not username or not password: return jsonify(success=False, message="Username and password required"), 400
        if not sq or len(sq.strip()) < 5: return jsonify(success=False, message="Security question too short"), 400
        if not sa or len(sa.strip()) < 2: return jsonify(success=False, message="Security answer too short"), 400
        if not is_valid_username(username): return jsonify(success=False, message="Invalid username"), 400
        if not is_strong_password(password): return jsonify(success=False, message="Weak password"), 400
        try:
            age = int(data.get("age"))
            if age < 18 or age > 100: return jsonify(success=False, message="Age must be 18–100"), 400
        except: return jsonify(success=False, message="Age must be a number"), 400
        if not validate_gender(data.get("gender")): return jsonify(success=False, message="Invalid gender"), 400
        if User.query.filter_by(username=username).first(): return jsonify(success=False, message="Username taken"), 400

        user = User(
            username=username, security_question=sq.strip(), age=age,
            department=data.get("department",""), gender=data.get("gender","").lower(),
            genotype=data.get("genotype",""), level=data.get("level",""),
            interested_in=data.get("interestedIn",""), religious=data.get("religious",""),
            is_anonymous=data.get("isAnonymous",False), category=data.get("category","friend"),
            bio=data.get("bio",""), name=data.get("name","")
        )
        user.set_password(password)
        user.set_security_answer(sa)

        for img in data.get("pictures", []):
            valid, msg = is_valid_image_data(img)
            if not valid: return jsonify(success=False, message=f"Invalid image: {msg}"), 400
            db.session.add(Picture(user=user, image=img))

        db.session.add(user)
        db.session.commit()

        access, refresh = create_access_token(identity=user), create_refresh_token(identity=user)
        resp = jsonify(success=True, message="User created", user=user.to_dict(), access_token=access, refresh_token=refresh)
        set_access_cookies(resp, access); set_refresh_cookies(resp, refresh)
        return resp, 201
    except Exception as e:
        db.session.rollback(); return jsonify(success=False, message=f"Server error: {e}"), 500

@app.route("/login", methods=["POST", "OPTIONS"])
@cross_origin(supports_credentials=True)
def login():
    if request.method == "OPTIONS": return jsonify(success=True), 200
    try:
        data = request.json or {}
        user = User.query.filter_by(username=data.get("username")).first()
        if not user or not user.check_password(data.get("password")):
            return jsonify(success=False, message="Invalid credentials"), 401
        access, refresh = create_access_token(identity=user), create_refresh_token(identity=user)
        resp = jsonify(success=True, message="Login successful", user=user.to_dict(), access_token=access, refresh_token=refresh)
        set_access_cookies(resp, access); set_refresh_cookies(resp, refresh)
        return resp
    except Exception as e: return jsonify(success=False, message=f"Server error: {e}"), 500

@app.route("/logout", methods=["POST", "OPTIONS"])
@jwt_required(verify_type=False)
@cross_origin(supports_credentials=True)
def logout():
    if request.method == "OPTIONS": return jsonify(success=True), 200
    try:
        jwt_data, jti, ttype, uid = get_jwt(), get_jwt()["jti"], get_jwt()["type"], get_jwt_identity()
        user = User.query.filter_by(public_id=uid).first()
        if not user: return jsonify(success=False, message="User not found"), 404
        db.session.add(TokenBlocklist(jti=jti, token_type=ttype, user_id=user.id, revoked_at=datetime.utcnow(), expires=datetime.fromtimestamp(jwt_data["exp"], tz=timezone.utc)))
        db.session.commit()
        resp = jsonify(success=True, message="Logged out"); unset_jwt_cookies(resp)
        resp.set_cookie("is_logged_in","false", httponly=False, secure=app.config["JWT_COOKIE_SECURE"], samesite="None", expires=0)
        return resp
    except Exception as e: db.session.rollback(); return jsonify(success=False, message=f"Server error: {e}"), 500


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