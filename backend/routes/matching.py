from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy.sql.expression import func
from sqlalchemy import or_, and_
from utils.security import get_current_user_from_jwt
from utils.validation import get_opposite_gender
from models.user import User, Swipe
from models.core import db
from datetime import datetime, timedelta


matching_bp = Blueprint('matching', __name__)

@matching_bp.route("/explore", methods=["GET"])
@jwt_required()
def explore():
    """
    Explore endpoint for discovering potential matches
    Returns users based on the current user's 'interested_in' preference
    Excludes users already liked by current user
    Includes passed users after 2 hours for reshows
    Includes pagination for performance
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Get IDs of users liked by current user (permanent exclusion)
    liked_ids = db.session.query(Swipe.target_user_id).filter_by(
        user_id=current_user.id, 
        action="like"
    ).all()
    liked_ids = [s[0] for s in liked_ids]

    # Get IDs of users passed by current user within last 2 hours (temporary exclusion)
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    recent_pass_ids = db.session.query(Swipe.target_user_id).filter(
        Swipe.user_id == current_user.id,
        Swipe.action == "pass",
        Swipe.timestamp > two_hours_ago
    ).all()
    recent_pass_ids = [s[0] for s in recent_pass_ids]

    # Combine exclusion lists
    excluded_ids = liked_ids + recent_pass_ids

    # Pagination parameters
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 10))

    # Base query (exclude self, liked users, and recently passed users)
    query = User.query.filter(User.id != current_user.id)
    if excluded_ids:
        query = query.filter(~User.id.in_(excluded_ids))

    # Match logic based on 'interested_in'
    if current_user.interested_in.lower() == "male":
        query = query.filter(User.gender.ilike("male"))
    elif current_user.interested_in.lower() == "female":
        query = query.filter(User.gender.ilike("female"))
    elif current_user.interested_in.lower() == "both":
        query = query.filter(User.gender.ilike("male") | User.gender.ilike("female"))
    else:
        # If interested_in is invalid, return empty results
        query = query.filter(User.id == None)  # Force empty results

    print("Current user:", current_user.username)
    print("Interested in:", current_user.interested_in)
    print("Liked users (permanent exclude):", liked_ids)
    print("Recently passed users (temporary exclude):", recent_pass_ids)
    print("Total excluded:", excluded_ids)

    # Get paginated random users
    candidates = (
        query.order_by(func.random())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    print("Candidates found:", [u.username for u in candidates])

    # Return results based on the filter criteria
    result = [user.to_dict() for user in candidates]

    return jsonify({
        "success": True,
        "page": page,
        "limit": limit,
        "profiles": result
    }), 200

@matching_bp.route("/swipe", methods=["POST"])
@jwt_required()
def swipe():
    """
    Swipe endpoint for user interactions
    Records likes and passes, checks for mutual matches
    Returns match notification if both users like each other
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    data = request.get_json()
    target_public_id = data.get("target_user_id")
    action = data.get("action")

    # Validate action type
    if action not in ["like", "pass"]:
        return jsonify({"success": False, "message": "Invalid action"}), 400

    # Find target user by public_id
    target_user = User.query.filter_by(public_id=target_public_id).first()
    if not target_user:
        return jsonify({"success": False, "message": "Target user not found"}), 404

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
            return jsonify({
                "success": True,
                "message": "It's a match! 🎉",
                "matched_with": target_user.public_id
            }), 200

    return jsonify({"success": True, "message": f"You swiped {action}"}), 200


@matching_bp.route("/matches", methods=["GET"])
@jwt_required()
def get_matches():
    """
    Get mutual matches - users who have liked each other
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

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
            User.id.in_(liked_users),
            User.id != current_user.id
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


@matching_bp.route("/users/online", methods=["GET"])
@jwt_required()
def get_online_users():
    """
    Get list of currently online users
    Useful for showing who's available for chat
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Get online users from database
    online_users_list = User.query.filter_by(is_online=True).filter(User.id != current_user.id).all()

    online_users_data = [
        {
            "id": user.public_id,
            "username": user.username,
            "name": user.name,
            "avatar": user.pictures[0].image if user.pictures else None,
            "lastSeen": user.last_seen.isoformat() + "Z" if user.last_seen else None
        }
        for user in online_users_list
    ]

    return jsonify({
        "success": True,
        "online_users": online_users_data,
        "count": len(online_users_data)
    }), 200


@matching_bp.route("/users/liked-me", methods=["GET"])
@jwt_required()
def get_all_users_who_liked_me():
    """
    Get all users who have liked the current user, but current user hasn't responded to
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Get pagination parameters
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))

    # Subquery to get user IDs that current user has already swiped on
    user_swiped_subquery = db.session.query(Swipe.target_user_id).filter(
        Swipe.user_id == current_user.id
    ).subquery()

    # Get users who liked current user but current user hasn't responded to
    liked_me_users = (
        db.session.query(User, Swipe.timestamp)
        .join(Swipe, Swipe.user_id == User.id)
        .filter(
            Swipe.target_user_id == current_user.id,
            Swipe.action == "like",
            User.id != current_user.id,
            ~User.id.in_(user_swiped_subquery)  # Exclude users current user has already swiped on
        )
        .order_by(Swipe.timestamp.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    # Format response
    result = []
    for user, liked_timestamp in liked_me_users:
        user_data = user.to_dict()
        user_data["liked_at"] = liked_timestamp.isoformat() + "Z" if liked_timestamp else None
        
        # Since we're excluding users current user has swiped on, is_mutual_match will always be False
        user_data["is_mutual_match"] = False
        result.append(user_data)

    # Get total count
    total_count = (
        db.session.query(User)
        .join(Swipe, Swipe.user_id == User.id)
        .filter(
            Swipe.target_user_id == current_user.id,
            Swipe.action == "like",
            User.id != current_user.id,
            ~User.id.in_(user_swiped_subquery)
        )
        .count()
    )

    return jsonify({
        "success": True,
        "users": result,
        "count": len(result),
        "total_count": total_count,
        "page": page,
        "limit": limit,
        "has_more": (page * limit) < total_count
    }), 200