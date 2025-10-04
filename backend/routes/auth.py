from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token, jwt_required,
    get_jwt_identity, get_jwt, set_access_cookies, set_refresh_cookies,
    unset_jwt_cookies
)
from datetime import datetime, timezone
from models.user import User, TokenBlocklist
from utils.validation import is_valid_username, is_strong_password, validate_gender, process_image
from utils.security import rate_limit, get_current_user_from_jwt
from models.core import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route("/signup", methods=["POST"])
def signup():
    """
    User registration endpoint
    Creates a new user account with provided information
    Validates all inputs and returns JWT tokens for immediate login
    """
    data = request.json or {}

    # Extract all fields from request data
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

    # Process and add pictures
    from models.user import Picture
    processed_pictures = []
    for img in pictures:
        valid, msg, processed = process_image(img)
        if not valid:
            return jsonify({"success": False, "message": f"Invalid image: {msg}"}), 400
        processed_pictures.append(processed)




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
        age = int(age)
        if age < 18 or age > 100:
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

    # Check if username already exists
    if User.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "Username already taken"}), 400

    # Create new user object
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
        name=name or "",
        pictures=[Picture(image = img) for img in processed_pictures]
    )

    # Set hashed password and security answer
    new_user.set_password(password)
    new_user.set_security_answer(security_answer)



    # Add user to database and commit
    db.session.add(new_user)
    db.session.commit()

    # Create JWT tokens
    access_token = create_access_token(identity=new_user)
    refresh_token = create_refresh_token(identity=new_user)

    # Prepare success response
    response = jsonify({
        "success": True,
        "message": "User created successfully",
        "user": new_user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token
    })

    # Set JWT cookies
    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)
        # Set "is_logged_in" cookie for Next.js middleware
    response.set_cookie(
        "is_logged_in",
        "true",
        httponly=False,
        secure=True,
        samesite="None"
    )

    return response, 201


@auth_bp.route("/login", methods=["POST"])
@rate_limit(max_attempts=5, window_seconds=900)
def login():
    """
    User authentication endpoint
    Verifies credentials and returns JWT tokens if valid
    Includes rate limiting to prevent brute force attacks
    """
    data = request.json or {}
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
        "user": user.to_dict(),
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
        httponly=False,
        secure=True,
        samesite="None"
    )

    return response, 200


@auth_bp.route("/logout", methods=["POST"])
@jwt_required(verify_type=False)
def logout():
    """
    Logout endpoint
    Revokes the current JWT token and clears authentication cookies
    Adds token to blocklist to prevent further use
    """
    jwt_data = get_jwt()
    jti = jwt_data["jti"]
    token_type = jwt_data["type"]
    user_public_id = get_jwt_identity()

    # Find user by public_id
    user = User.query.filter_by(public_id=user_public_id).first()

    if not user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # Add token to blocklist to revoke it
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

    # Remove JWT cookies
    unset_jwt_cookies(response)

    # Remove the "is_logged_in" cookie
    response.set_cookie(
        "is_logged_in",
        "false",
        httponly=False,
        secure=True,
        samesite="None"
    )

    return response, 200


@auth_bp.route("/forgot-password", methods=["POST"])
@rate_limit(max_attempts=3, window_seconds=3600)
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
        return jsonify({"success": True, "question": None}), 200

    # Return the user's security question
    return jsonify({
        "success": True,
        "question": user.security_question
    }), 200


@auth_bp.route("/reset-password", methods=["POST"])
@rate_limit(max_attempts=3, window_seconds=3600)
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