from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
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
    # All @socketio.on decorators below are automatically registered
    # This function just serves as an import trigger and confirmation


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
            return

        payload = {
            "user_id": user.public_id,
            "username": user.username,
            "is_online": is_online,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

        for convo in conversations:
            other_user_id = (
                convo.user2_id if convo.user1_id == user_id else convo.user1_id
            )
            emit("user_online_status", payload, room=f"user_{other_user_id}")
            emit("user_online_status", payload, room=f"conversation_{convo.id}")

        print(f"📢 Online status broadcast: {user.username} -> {is_online}")

    except Exception as e:
        print(f"❌ Online status broadcast error: {e}")
        traceback.print_exc()


# -------------------------------------------------
# ✅ Socket Connection Handlers
# -------------------------------------------------

@socketio.on("connect")
def handle_connect():
    try:
        print(f"🔗 Socket connected (SID: {flask_request.sid})")
        print(f"🔍 Headers: {dict(flask_request.headers)}")
        print(f"🔍 Cookies: {flask_request.cookies}")

        # ✅ Automatically verify the JWT from cookies or headers
        verify_jwt_in_request(optional=False)
        public_id = get_jwt_identity()  # ✅ comes from @jwt.user_identity_loader

        # ✅ Retrieve the user from database
        user = User.query.filter_by(public_id=public_id).first()
        if not user:
            emit("auth_error", {"message": "User not found"})
            return False

        # ✅ Store user session in memory
        online_users[user.id] = {
            "public_id": user.public_id,
            "username": user.username,
            "sid": flask_request.sid,
            "is_online": True,
            "connected_at": datetime.utcnow(),
        }

        # ✅ Update user status in DB
        user.is_online = True
        db.session.commit()

        # ✅ Join private room for direct messages
        join_room(f"user_{user.id}")

        # ✅ Broadcast to others that user is online
        broadcast_online_status(user.id, True)

        # ✅ Confirm success to connected user
        emit(
            "connection_success",
            {
                "message": "Connected successfully",
                "user": {
                    "public_id": user.public_id,
                    "username": user.username,
                },
            },
        )

        print(f"✅ {user.username} connected (public_id={user.public_id})")
        return True

    except Exception as e:
        print(f"💥 Connect error: {e}")
        traceback.print_exc()
        emit("auth_error", {"message": str(e)})
        return False


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


@socketio.on("send_message")
def handle_send_message(data):
    try:
        conversation_id = data.get("conversation_id")
        content = (data.get("content") or "").strip()

        if not conversation_id or not content:
            emit("error", {"message": "Invalid message"})
            return

        user_id, _, error = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit("error", {"message": error})
            return

        is_auth, convo, error = validate_socket_conversation_access(conversation_id, user_id)
        if not is_auth:
            emit("error", {"message": error})
            return

        msg = Message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content,
            timestamp=datetime.utcnow(),
        )

        db.session.add(msg)
        convo.last_message = content
        convo.last_message_at = datetime.utcnow()
        db.session.commit()
        db.session.refresh(msg)

        payload = msg.to_dict()
        emit("new_message", payload, room=f"conversation_{conversation_id}")
        print(f"💬 Message sent by {user_id} in convo {conversation_id}")

    except Exception as e:
        print(f"❌ Send error: {e}")
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