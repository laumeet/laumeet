from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from sqlalchemy import or_, and_
from datetime import datetime
from utils.security import get_current_user_from_jwt, validate_conversation_access
from models.user import User
from models.chat import Conversation, Message
from models.core import db

chat_bp = Blueprint('chat', __name__)

@chat_bp.route("/conversations", methods=["GET"])
@jwt_required()
def get_conversations():
    """
    Get all conversations for the current user
    Only returns conversations where user is a participant
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Find all conversations where current user is either user1 or user2
    conversations = Conversation.query.filter(
        or_(
            Conversation.user1_id == current_user.id,
            Conversation.user2_id == current_user.id
        )
    ).order_by(Conversation.last_message_at.desc()).all()

    # Format response with conversation details
    conversations_data = []
    for conv in conversations:
        # Determine the other user in the conversation
        other_user = conv.user2 if conv.user1_id == current_user.id else conv.user1

        # Count unread messages for current user
        unread_count = Message.query.filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user.id,
            Message.is_read == False
        ).count()

        conversations_data.append({
            "id": conv.id,
            "other_user": {
                "id": other_user.public_id,
                "username": other_user.username,
                "name": other_user.name,
                "avatar": other_user.pictures[0].image if other_user.pictures else None,
                "isOnline": other_user.is_online,
                "lastSeen": other_user.last_seen.isoformat() + "Z" if other_user.last_seen else None
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


@chat_bp.route("/conversations", methods=["POST"])
@jwt_required()
def create_conversation():
    """
    Create a new conversation between two users
    Users can only create conversations with themselves and others (no arbitrary users)
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    data = request.json or {}
    target_public_id = data.get("target_user_id")

    if not target_public_id:
        return jsonify({"success": False, "message": "Target user ID is required"}), 400

    # Users cannot create conversations with themselves
    if target_public_id == current_user.public_id:
        return jsonify({"success": False, "message": "Cannot create conversation with yourself"}), 400

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


@chat_bp.route("/messages/<int:conversation_id>", methods=["GET"])
@jwt_required()
def get_messages(conversation_id):
    """
    Get messages for a specific conversation
    Only accessible to conversation participants
    Enhanced with delivery status information
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Validate conversation access
    is_authorized, conversation, error_msg = validate_conversation_access(conversation_id, current_user.id)
    if not is_authorized:
        return jsonify({"success": False, "message": error_msg}), 403

    # Pagination parameters
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 50))
    offset = (page - 1) * limit

    # Get messages for this conversation
    messages_query = Message.query.filter_by(conversation_id=conversation_id)
    total_messages = messages_query.count()

    messages = messages_query.order_by(Message.timestamp.desc()).offset(offset).limit(limit).all()
    messages.reverse()  # Reverse to get chronological order

    # Mark unread messages as read (only messages sent to current user)
    unread_messages = Message.query.filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != current_user.id,
        Message.is_read == False
    ).all()

    for msg in unread_messages:
        msg.mark_read()

    if unread_messages:
        db.session.commit()

    # Format response - now includes delivery status
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
        }
    }), 200


@chat_bp.route("/messages/<int:conversation_id>", methods=["POST"])
@jwt_required()
def send_message(conversation_id):
    """
    Send a message to a conversation
    Only accessible to conversation participants
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Validate conversation access
    is_authorized, conversation, error_msg = validate_conversation_access(conversation_id, current_user.id)
    if not is_authorized:
        return jsonify({"success": False, "message": error_msg}), 403

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
        is_read=False,
        timestamp=datetime.utcnow(),
        delivered_at=None,
        read_at=None
    )

    # Update conversation's last message
    conversation.last_message = content
    conversation.last_message_at = datetime.utcnow()

    db.session.add(new_message)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Message sent successfully",
        "message_id": new_message.id,
        "message_data": new_message.to_dict()
    }), 201


@chat_bp.route("/messages/<int:message_id>/mark_delivered", methods=["POST"])
@jwt_required()
def mark_message_delivered(message_id):
    """
    Mark a message as delivered
    Only the recipient can mark messages as delivered
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    message = Message.query.get(message_id)
    if not message:
        return jsonify({"success": False, "message": "Message not found"}), 404

    # Validate user is participant in the conversation
    is_authorized, conversation, error_msg = validate_conversation_access(message.conversation_id, current_user.id)
    if not is_authorized:
        return jsonify({"success": False, "message": error_msg}), 403

    # Only recipient can mark as delivered (not sender)
    if current_user.id == message.sender_id:
        return jsonify({"success": False, "message": "Cannot mark own message as delivered"}), 400

    # Mark message as delivered
    if message.mark_delivered():
        db.session.commit()
        return jsonify({
            "success": True,
            "message": "Message marked as delivered",
            "message_id": message_id,
            "delivered_at": message.delivered_at.isoformat() + "Z"
        }), 200
    else:
        return jsonify({
            "success": True,
            "message": "Message was already delivered",
            "message_id": message_id
        }), 200


@chat_bp.route("/conversations/<int:conversation_id>/mark_read", methods=["POST"])
@jwt_required()
def mark_conversation_read(conversation_id):
    """
    Mark all messages in a conversation as read for current user
    Only accessible to conversation participants
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Validate conversation access
    is_authorized, conversation, error_msg = validate_conversation_access(conversation_id, current_user.id)
    if not is_authorized:
        return jsonify({"success": False, "message": error_msg}), 403

    # Mark all unread messages from other user as read
    unread_messages = Message.query.filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != current_user.id,
        Message.is_read == False
    ).all()

    for msg in unread_messages:
        msg.mark_read()

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


@chat_bp.route("/conversations/unread_count", methods=["GET"])
@jwt_required()
def get_total_unread_count():
    """
    Get total unread message count across all conversations
    Useful for showing badge count in UI
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

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