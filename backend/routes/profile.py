from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from utils.security import get_current_user_from_jwt
from utils.validation import validate_gender
from models.core import db

profile_bp = Blueprint('profile', __name__)

@profile_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_my_profile():
    """
    Get current user's profile information
    Requires authentication via JWT
    Returns complete user profile without sensitive data
    """
    user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    return jsonify({
        "success": True,
        "user": user.to_dict()
    }), 200


@profile_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_my_profile():
    """
    Update current user's profile information
    Requires authentication via JWT
    Allows users to update their profile information
    """
    user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    data = request.json or {}

    # Update allowed fields with new values or keep existing ones
    user.username = data.get("username", user.username).strip().lower()
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


@profile_bp.route("/profile/<user_public_id>", methods=["GET"])
@jwt_required()
def get_user_profile(user_public_id):
    """
    Get user profile with online status
    Useful for displaying user info in chat
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Find target user
    from models.user import User
    target_user = User.query.filter_by(public_id=user_public_id).first()
    if not target_user:
        return jsonify({"success": False, "message": "Target user not found"}), 404

    return jsonify({
        "success": True,
        "user": {
            "id": target_user.public_id,
            "username": target_user.username,
            "name": target_user.name,
            "avatar": target_user.pictures[0].image if target_user.pictures else None,
            "isOnline": target_user.is_online,
            "lastSeen": target_user.last_seen.isoformat() + "Z" if target_user.last_seen else None,
            "bio": target_user.bio,
            "department": target_user.department,
            "level": target_user.level
        }
    }), 200