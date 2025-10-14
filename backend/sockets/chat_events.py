from flask_jwt_extended import decode_token
from flask_socketio import join_room, leave_room, emit
from flask import request as flask_request
from datetime import datetime
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
import traceback

from models.core import db
from models.user import User
from models.chat import Conversation, Message
from utils.security import (
    get_authenticated_user_from_socket,
    validate_socket_conversation_access,
)
from sockets import socketio, online_users


# -------------------------------------------------
# ✅ Socket Event Registration Function
# -------------------------------------------------
def register_socket_events():
    """Register all SocketIO event handlers with the application"""
    print("🔧 Socket.IO event handlers registered successfully")


# -------------------------------------------------
# ✅ Broadcast user online/offline status
# -------------------------------------------------
def broadcast_online_status(user_id, is_online):
    try:
        conversations = Conversation.query.filter(
            or_(Conversation.user1_id == user_id, Conversation.user2_id == user_id)
        ).all()

        user = User.query.get(user_id)
        if not user:
            print(f"❌ No user found with ID {user_id}")
            return

        payload = {
            "user_id": user.public_id,
            "username": user.username,
            "is_online": is_online,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

        print(f"🟢 Broadcasting status for {user.username}: {is_online}")
        print(f"Conversations found: {[c.id for c in conversations]}")

        for convo in conversations:
            # Identify the other user in the conversation
            other_user_id = (
                convo.user2_id if convo.user1_id == user_id else convo.user1_id
            )

            # Notify the other user about this user's status
            emit("user_online_status", payload, room=f"user_{other_user_id}")
            print(f"📡 Emitting to user_{other_user_id}")

            # Also notify anyone in the conversation room
            emit("user_online_status", payload, room=f"conversation_{convo.id}")
            print(f"📡 Emitting to conversation_{convo.id}")

        print(f"✅ Broadcast complete: {user.username} -> {is_online}")

    except Exception as e:
        print(f"❌ Online status broadcast error: {e}")
        traceback.print_exc()


# -------------------------------------------------
# ✅ Socket Connection Handlers
# -------------------------------------------------
@socketio.on("connect")
def handle_connect():
    print(f"🔗 Socket connected (SID: {flask_request.sid})")
    print(f"🔍 Query Params: {flask_request.args}")

    # ✅ 1. Read token from query string
    token = flask_request.args.get("token")

    # ✅ 2. Fallback: check Authorization header if missing
    if not token:
        auth_header = flask_request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split("Bearer ")[1]

    # ✅ 3. Abort if token missing
    if not token:
        print("💥 Missing JWT in query or headers")
        return False

    try:
        # ✅ 4. Decode and authenticate
        decoded = decode_token(token)
        public_id = decoded.get("sub")

        user = User.query.filter_by(public_id=public_id).first()
        if not user:
            print("❌ No user found for token")
            return False

        user.is_online = True
        user.last_seen = datetime.utcnow()
        db.session.commit()

        # ✅ 5. Store user in online_users for lookup
        online_users[user.id] = {
            "sid": flask_request.sid,
            "public_id": user.public_id,
            "username": user.username,
        }

        join_room(f"user_{user.id}")

        # Send online status of all users in conversations to this newly connected user
        send_initial_online_statuses(user.id)

        # Broadcast that this user is now online
        broadcast_online_status(user.id, True)

        print(f"✅ Authenticated socket for user: {user.username} ({user.public_id})")
        return True

    except Exception as e:
        print(f"❌ Invalid JWT or decode error: {e}")
        traceback.print_exc()
        return False


def send_initial_online_statuses(user_id):
    """Send online status of all users in conversations to the newly connected user"""
    try:
        conversations = Conversation.query.filter(
            or_(Conversation.user1_id == user_id, Conversation.user2_id == user_id)
        ).all()

        for convo in conversations:
            other_user_id = (
                convo.user2_id if convo.user1_id == user_id else convo.user1_id
            )
            other_user = User.query.get(other_user_id)

            if other_user:
                payload = {
                    "user_id": other_user.public_id,
                    "username": other_user.username,
                    "is_online": other_user.is_online,
                    "timestamp": datetime.utcnow().isoformat() + "Z",
                }
                emit("user_online_status", payload, room=f"user_{user_id}")
                print(f"📡 Sent initial status for {other_user.username} to user_{user_id}")

    except Exception as e:
        print(f"❌ Error sending initial online statuses: {e}")
        traceback.print_exc()


@socketio.on("disconnect")
def handle_disconnect():
    try:
        user_id = None
        for uid, info in list(online_users.items()):
            if info.get("sid") == flask_request.sid:
                user_id = uid
                break

        if not user_id:
            print("⚠️ Unknown socket disconnected")
            return

        user = User.query.get(user_id)
        if user:
            user.is_online = False
            user.last_seen = datetime.utcnow()
            db.session.commit()

        username = online_users[user_id]["username"]
        online_users.pop(user_id, None)
        broadcast_online_status(user_id, False)

        print(f"🔌 {username} disconnected.")

    except Exception as e:
        print(f"❌ Disconnect error: {e}")
        traceback.print_exc()


# -------------------------------------------------
# ✅ Conversation Event Handlers
# -------------------------------------------------
@socketio.on("join_conversation")
def handle_join_conversation(data):
    try:
        print(f"🚪 Join convo data: {data}")
        conversation_id = data.get("conversation_id")
        if not conversation_id:
            emit("error", {"message": "Conversation ID required"})
            return

        user_id, _, error = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit("error", {"message": error})
            return

        is_auth, convo, error = validate_socket_conversation_access(conversation_id, user_id)
        print(f"🔍 Validation result: is_auth={is_auth}, error={error}")
        if not is_auth:
            emit("error", {"message": error})
            return

        room = f"conversation_{conversation_id}"
        join_room(room)

        # Mark unread messages as read
        unread = Message.query.filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.is_read == False,
        ).all()

        if unread:
            for msg in unread:
                msg.mark_read()
                db.session.add(msg)
            db.session.commit()

            # Emit message status updates for all read messages
            for msg in unread:
                emit("message_status_update", {
                    "message_id": msg.id,
                    "conversation_id": conversation_id,
                    "status": "read",
                    "read_at": msg.read_at.isoformat() + "Z" if msg.read_at else None
                }, room=f"conversation_{conversation_id}")

        emit("joined_conversation", {"conversation_id": conversation_id})
        print(f"✅ User {user_id} joined {room}")

    except Exception as e:
        print(f"❌ Join error: {e}")
        traceback.print_exc()


@socketio.on("leave_conversation")
def handle_leave_conversation(data):
    try:
        room = f"conversation_{data.get('conversation_id')}"
        leave_room(room)
        emit("left_conversation", {"conversation_id": data.get("conversation_id")})
        print(f"🚪 Left {room}")
    except Exception as e:
        print(f"❌ Leave error: {e}")
        traceback.print_exc()


# sockets/chat_events.py - UPDATED send_message handler

@socketio.on("send_message")
def handle_send_message(data):
    try:
        conversation_id = data.get("conversation_id")
        content = (data.get("content") or "").strip()

        if not conversation_id or not content:
            emit("error", {"message": "Invalid message"})
            return

        user_id, user_data, error = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit("error", {"message": error})
            return

        is_auth, convo, error = validate_socket_conversation_access(conversation_id, user_id)
        if not is_auth:
            emit("error", {"message": error})
            return

        # ✅ ADDED: Check for restricted content
        # from utils.message_validator import MessageValidator
        # user = User.query.get(user_id)

        # is_allowed, restriction_reason = MessageValidator.validate_message_send(user, content)
        # if not is_allowed:
        #     emit("message_restricted", {
        #         "error": "UPGRADE_REQUIRED",
        #         "message": "Upgrade to premium to send contact information, links, or hashtags",
        #         "restricted_content": True
        #     })
        #     return

        # Create message with initial status
        msg = Message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content,
            timestamp=datetime.utcnow(),
            delivered_at=None,
            read_at=None,
            is_read=False
        )

        # Handle reply if present
        reply_to_id = data.get("reply_to")
        if reply_to_id:
            msg.reply_to_id = reply_to_id

        db.session.add(msg)
        convo.last_message = content
        convo.last_message_at = datetime.utcnow()
        db.session.commit()
        db.session.refresh(msg)

        payload = msg.to_dict()
        emit("new_message", payload, room=f"conversation_{conversation_id}")
        print(f"💬 Message sent by {user_data['username']} in convo {conversation_id}")

    except Exception as e:
        print(f"❌ Send error: {e}")
        traceback.print_exc()


@socketio.on("message_delivered")
def handle_message_delivered(data):
    try:
        message_id = data.get("message_id")
        conversation_id = data.get("conversation_id")

        if not message_id or not conversation_id:
            return

        user_id, user_data, error = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            return

        # Mark message as delivered (only if not sender)
        message = Message.query.get(message_id)
        if message and message.sender_id != user_id:
            if not message.delivered_at:
                message.delivered_at = datetime.utcnow()
                db.session.commit()

                emit("message_status_update", {
                    "message_id": message_id,
                    "conversation_id": conversation_id,
                    "status": "delivered",
                    "delivered_at": message.delivered_at.isoformat() + "Z"
                }, room=f"conversation_{conversation_id}")

                print(f"📬 Message {message_id} marked as delivered by {user_data['username']}")

    except Exception as e:
        print(f"❌ Message delivered error: {e}")
        traceback.print_exc()


@socketio.on("read_messages")
def handle_read_messages(data):
    try:
        conversation_id = data.get("conversation_id")
        message_ids = data.get("message_ids", [])

        if not conversation_id:
            return

        user_id, user_data, error = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            return

        # If no specific message IDs provided, mark all unread messages in conversation as read
        if not message_ids:
            unread_messages = Message.query.filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.is_read == False
            ).all()
            message_ids = [msg.id for msg in unread_messages]

        # Mark messages as read
        for msg_id in message_ids:
            message = Message.query.get(msg_id)
            if message and message.sender_id != user_id and not message.is_read:
                message.mark_read()
                db.session.add(message)

                emit("message_status_update", {
                    "message_id": msg_id,
                    "conversation_id": conversation_id,
                    "status": "read",
                    "read_at": message.read_at.isoformat() + "Z" if message.read_at else None
                }, room=f"conversation_{conversation_id}")

        db.session.commit()
        print(f"📖 {len(message_ids)} messages marked as read by {user_data['username']}")

    except Exception as e:
        print(f"❌ Read messages error: {e}")
        traceback.print_exc()


@socketio.on("typing")
def handle_typing(data):
    try:
        print("👀 Typing event data:", data)
        conversation_id = data.get("conversation_id")
        is_typing = data.get("is_typing", True)

        user_id, user_data, error = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit("error", {"message": error})
            return

        emit(
            "user_typing",
            {
                "conversation_id": conversation_id,
                "user_id": user_data["public_id"],
                "username": user_data["username"],
                "is_typing": is_typing,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            },
            room=f"conversation_{conversation_id}",
            include_self=False,
        )
        print(f"⌨️ Typing event in convo {conversation_id} by {user_data['username']}")

    except Exception as e:
        print(f"❌ Typing error: {e}")
        traceback.print_exc()