# sockets/chat_events.py
# ❌ REMOVE all the monkey patching and SocketIO creation at the top
# ❌ REMOVE: import os, async worker selection, and socketio = SocketIO(...)

from flask_socketio import join_room, leave_room, emit
from flask import request as flask_request
from datetime import datetime
from models.core import db
from models.user import User
from models.chat import Conversation, Message
from utils.security import get_authenticated_user_from_socket, validate_socket_conversation_access
from sqlalchemy import or_
from sqlalchemy.exc import SQLAlchemyError
import traceback

# ✅ Import the SHARED Socket.IO instance from our package
from sockets import socketio, online_users


# ❌ REMOVE this line: online_users = {}

def register_socket_events():
    """Register all SocketIO event handlers."""
    print("🔧 Socket.IO event handlers registered")
    return


def broadcast_online_status(user_id, is_online):
    """
    Broadcast user's online status to all their conversations.
    """
    try:
        # Use SQLAlchemy or_ correctly
        conversations = Conversation.query.filter(
            or_(Conversation.user1_id == user_id, Conversation.user2_id == user_id)
        ).all()

        user = User.query.get(user_id)
        if not user:
            return

        payload = {
            'user_id': user.public_id,
            'username': user.username,
            'is_online': is_online,
            'timestamp': datetime.utcnow().isoformat() + "Z"
        }

        for conversation in conversations:
            other_user_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id

            # Emit online status to the other user's personal room
            emit('user_online_status', payload, room=f"user_{other_user_id}")

            # Also emit to the conversation room
            room_name = f"conversation_{conversation.id}"
            emit('user_online_status', payload, room=room_name)

        print(f"📢 Broadcasted online status: {user.username} -> {is_online}")

    except Exception as e:
        print(f"❌ Online status broadcast error: {e}")
        traceback.print_exc()


@socketio.on('connect')
def handle_connect():
    """
    Handle user connection with JWT authentication.
    """
    try:
        print(f"🔍 Socket.IO Connection Attempt - SID: {flask_request.sid}")

        # Method 1: Check cookies (primary method)
        token = flask_request.cookies.get('access_token_cookie')
        print(f"🍪 Token from cookies: {'PRESENT' if token else 'MISSING'}")

        # Method 2: Fallback to query parameters
        if not token:
            token = flask_request.args.get('token')
            print(f"🔍 Token from query: {'PRESENT' if token else 'MISSING'}")

        # Method 3: Fallback to headers
        if not token:
            auth_header = flask_request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header[7:]
            print(f"🔍 Token from headers: {'PRESENT' if token else 'MISSING'}")

        if not token:
            print("❌ No authentication token found")
            return False

        # Verify the token
        from flask_jwt_extended import decode_token
        try:
            decoded_token = decode_token(token)
            user_public_id = decoded_token['sub']
            print(f"✅ Token decoded successfully for user: {user_public_id}")
        except Exception as e:
            print(f"❌ Token verification failed: {str(e)}")
            return False

        # Find user in database
        user = User.query.filter_by(public_id=user_public_id).first()
        if not user:
            print(f"❌ User not found for public_id: {user_public_id}")
            return False

        # Store user connection info
        online_users[user.id] = {
            'public_id': user.public_id,
            'username': user.username,
            'sid': flask_request.sid,
            'is_online': True
        }

        # Join user to their personal room
        join_room(f"user_{user.id}")

        # Broadcast online status
        broadcast_online_status(user.id, True)

        print(f"✅ User {user.username} connected successfully. Online users: {len(online_users)}")
        return True

    except Exception as e:
        print(f"💥 Unexpected error during connection: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

    # ... rest of your socket event handlers remain the same ...
    return True


@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle user disconnection; update DB safely and broadcast offline status.
    """
    try:
        user_id = None
        user_data = None

        for uid, user_info in list(online_users.items()):
            if user_info.get('sid') == flask_request.sid:
                user_id = uid
                user_data = user_info
                break

        if user_id and user_data:
            user = User.query.get(user_id)
            if user:
                try:
                    with db.session.begin():
                        user.is_online = False
                        user.last_seen = datetime.utcnow()
                        db.session.add(user)
                except SQLAlchemyError as db_err:
                    db.session.rollback()
                    print(f"DEBUG: DB error on disconnect: {db_err}")
                    traceback.print_exc()

            # Remove from online users dict
            online_users.pop(user_id, None)

            # Broadcast offline status to conversations
            broadcast_online_status(user_id, False)

            print(f"DEBUG: User {user_data.get('username')} disconnected")

    except Exception as e:
        print(f"DEBUG: Disconnect error: {e}")
        traceback.print_exc()


@socketio.on('join_conversation')
def handle_join_conversation(data):
    """
    Join a conversation room with comprehensive security validation.
    Marks unread messages as read (only messages not from the current user).
    """
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'}, room=flask_request.sid)
            return

        user_id, user_data, error_msg = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        is_authorized, conversation, error_msg = validate_socket_conversation_access(conversation_id, user_id)
        if not is_authorized:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        room_name = f"conversation_{conversation_id}"
        join_room(room_name)

        # Efficiently mark unread messages as read and commit once
        unread_messages = Message.query.filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,  # Only mark others' messages
            Message.is_read == False
        ).all()

        if unread_messages:
            try:
                with db.session.begin():
                    for msg in unread_messages:
                        if msg.mark_read():
                            db.session.add(msg)
                # After commit, notify senders for messages that were updated
                for msg in unread_messages:
                    if msg.is_read:
                        emit('message_status_update', {
                            'message_id': msg.id,
                            'conversation_id': conversation_id,
                            'status': 'read',
                            'read_at': msg.read_at.isoformat() + "Z" if msg.read_at else None,
                            'read_by': user_id,
                            'timestamp': datetime.utcnow().isoformat() + "Z"
                        }, room=f"user_{msg.sender_id}")
            except SQLAlchemyError as db_err:
                db.session.rollback()
                print(f"DEBUG: DB error marking messages read: {db_err}")
                traceback.print_exc()

        print(f"DEBUG: User {user_id} joined conversation room: {room_name}")
        emit('joined_conversation', {
            'conversation_id': conversation_id,
            'message': 'Successfully joined conversation'
        }, room=flask_request.sid)

    except Exception as e:
        print(f"DEBUG: Join conversation error: {e}")
        traceback.print_exc()
        emit('error', {'message': 'Failed to join conversation'}, room=flask_request.sid)


@socketio.on('leave_conversation')
def handle_leave_conversation(data):
    """
    Leave a specific conversation room
    """
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'}, room=flask_request.sid)
            return

        room_name = f"conversation_{conversation_id}"
        leave_room(room_name)

        print(f"DEBUG: User left conversation room: {room_name}")
        emit('left_conversation', {
            'conversation_id': conversation_id,
            'message': 'Successfully left conversation'
        }, room=flask_request.sid)

    except Exception as e:
        print(f"DEBUG: Leave conversation error: {e}")
        traceback.print_exc()
        emit('error', {'message': 'Failed to leave conversation'}, room=flask_request.sid)


@socketio.on('send_message')
def handle_send_message(data):
    """
    Create and broadcast a new message with security validation.
    Use a transaction context to reduce DB pool churn.
    """
    try:
        conversation_id = data.get('conversation_id')
        content = (data.get('content') or '').strip()

        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'}, room=flask_request.sid)
            return

        if not content:
            emit('error', {'message': 'Message content cannot be empty'}, room=flask_request.sid)
            return

        if len(content) > 1000:
            emit('error', {'message': 'Message too long (max 1000 characters)'}, room=flask_request.sid)
            return

        user_id, user_data, error_msg = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        is_authorized, conversation, error_msg = validate_socket_conversation_access(conversation_id, user_id)
        if not is_authorized:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        recipient_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id
        recipient = User.query.get(recipient_id)
        if not recipient:
            emit('error', {'message': 'Recipient not found'}, room=flask_request.sid)
            return

        new_message = Message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content,
            is_read=False,
            timestamp=datetime.utcnow(),
            delivered_at=None,
            read_at=None
        )

        # Write both message and conversation update within one transaction
        try:
            with db.session.begin():
                db.session.add(new_message)
                conversation.last_message = content
                conversation.last_message_at = datetime.utcnow()
                db.session.add(conversation)
        except SQLAlchemyError as db_err:
            db.session.rollback()
            print(f"DEBUG: DB error saving new message: {db_err}")
            traceback.print_exc()
            emit('error', {'message': 'Database error while saving message'}, room=flask_request.sid)
            return

        # Prepare message data and broadcast
        message_data = new_message.to_dict()
        room_name = f"conversation_{conversation_id}"
        emit('new_message', message_data, room=room_name)
        emit('new_message', message_data, room=f"user_{recipient_id}")

        print(f"DEBUG: Message sent in conversation {conversation_id} by user {user_id}")

    except Exception as e:
        print(f"DEBUG: Send message error: {e}")
        traceback.print_exc()
        emit('error', {'message': 'Failed to send message'}, room=flask_request.sid)


@socketio.on('message_delivered')
def handle_message_delivered(data):
    """
    Mark message as delivered (only recipient can do this).
    """
    try:
        message_id = data.get('message_id')
        conversation_id = data.get('conversation_id')

        if not message_id:
            emit('error', {'message': 'Message ID is required'}, room=flask_request.sid)
            return

        user_id, user_data, error_msg = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        message = Message.query.get(message_id)
        if not message:
            emit('error', {'message': 'Message not found'}, room=flask_request.sid)
            return

        is_authorized, conversation, error_msg = validate_socket_conversation_access(message.conversation_id, user_id)
        if not is_authorized:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        if user_id == message.sender_id:
            emit('error', {'message': 'Cannot mark own message as delivered'}, room=flask_request.sid)
            return

        try:
            if message.mark_delivered():
                with db.session.begin():
                    db.session.add(message)

                emit('message_status_update', {
                    'message_id': message_id,
                    'conversation_id': conversation_id,
                    'status': 'delivered',
                    'delivered_at': message.delivered_at.isoformat() + "Z" if message.delivered_at else None,
                    'timestamp': datetime.utcnow().isoformat() + "Z"
                }, room=f"user_{message.sender_id}")

                print(f"DEBUG: Message {message_id} marked as delivered to user {user_id}")

        except SQLAlchemyError as db_err:
            db.session.rollback()
            print(f"DEBUG: DB error marking message delivered: {db_err}")
            traceback.print_exc()

        emit('message_delivered_success', {
            'message_id': message_id,
            'status': 'delivered'
        }, room=flask_request.sid)

    except Exception as e:
        print(f"DEBUG: Message delivered error: {e}")
        traceback.print_exc()
        emit('error', {'message': 'Failed to mark message as delivered'}, room=flask_request.sid)


@socketio.on('read_messages')
def handle_read_messages(data):
    """
    Mark messages as read with comprehensive security validation.
    """
    try:
        conversation_id = data.get('conversation_id')
        message_ids = data.get('message_ids', [])

        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'}, room=flask_request.sid)
            return

        user_id, user_data, error_msg = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        is_authorized, conversation, error_msg = validate_socket_conversation_access(conversation_id, user_id)
        if not is_authorized:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        if message_ids:
            messages = Message.query.filter(
                Message.id.in_(message_ids),
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id
            ).all()
        else:
            messages = Message.query.filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,
                Message.is_read == False
            ).all()

        message_ids_updated = []
        if messages:
            try:
                with db.session.begin():
                    for msg in messages:
                        if msg.mark_read():
                            db.session.add(msg)
                            message_ids_updated.append(msg.id)
            except SQLAlchemyError as db_err:
                db.session.rollback()
                print(f"DEBUG: DB error marking messages read: {db_err}")
                traceback.print_exc()

            # Notify senders about read messages
            for msg in messages:
                if msg.id in message_ids_updated:
                    emit('message_status_update', {
                        'message_id': msg.id,
                        'conversation_id': conversation_id,
                        'status': 'read',
                        'read_at': msg.read_at.isoformat() + "Z" if msg.read_at else None,
                        'read_by': user_id,
                        'timestamp': datetime.utcnow().isoformat() + "Z"
                    }, room=f"user_{msg.sender_id}")

            print(f"DEBUG: User {user_id} marked {len(message_ids_updated)} messages as read in conversation {conversation_id}")

        emit('messages_read_success', {
            'conversation_id': conversation_id,
            'message_ids': message_ids_updated,
            'count': len(message_ids_updated)
        }, room=flask_request.sid)

    except Exception as e:
        print(f"DEBUG: Read messages error: {e}")
        traceback.print_exc()
        emit('error', {'message': 'Failed to mark messages as read'}, room=flask_request.sid)


@socketio.on('typing')
def handle_typing(data):
    """
    Typing indicator with comprehensive security validation.
    """
    try:
        conversation_id = data.get('conversation_id')
        is_typing = data.get('is_typing', True)

        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'}, room=flask_request.sid)
            return

        user_id, user_data, error_msg = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        is_authorized, conversation, error_msg = validate_socket_conversation_access(conversation_id, user_id)
        if not is_authorized:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        recipient_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id
        room_name = f"conversation_{conversation_id}"

        emit('user_typing', {
            'conversation_id': conversation_id,
            'user_id': user_data['public_id'],
            'username': user_data['username'],
            'is_typing': is_typing,
            'timestamp': datetime.utcnow().isoformat() + "Z"
        }, room=room_name, include_self=False)

        # Also send to recipient's personal room
        emit('user_typing', {
            'conversation_id': conversation_id,
            'user_id': user_data['public_id'],
            'username': user_data['username'],
            'is_typing': is_typing,
            'timestamp': datetime.utcnow().isoformat() + "Z"
        }, room=f"user_{recipient_id}")

    except Exception as e:
        print(f"DEBUG: Typing indicator error: {e}")
        traceback.print_exc()
        emit('error', {'message': 'Failed to send typing indicator'}, room=flask_request.sid)