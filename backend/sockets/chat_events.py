from flask_socketio import SocketIO, join_room, leave_room, emit
from flask import request as flask_request
from datetime import datetime
from models.core import db
from models.user import User
from models.chat import Conversation, Message
from utils.security import get_authenticated_user_from_socket, validate_socket_conversation_access
import os

# Initialize SocketIO
socketio = SocketIO(
    cors_allowed_origins=os.environ.get("SOCKETIO_CORS_ORIGINS", [
        "https://laumeet.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]),
    async_mode='threading'
)


# Store online users (in production, use Redis instead)
online_users = {}


def register_socket_events():
    """Register all SocketIO event handlers"""
    # All event handlers are registered via the @socketio.on decorators

    # Import and register additional socket events here if needed
    pass


def broadcast_online_status(user_id, is_online):
    """
    Broadcast user's online status to all their conversations
    """
    try:
        # Find all conversations for this user
        conversations = Conversation.query.filter(
            Conversation.user1_id == user_id | Conversation.user2_id == user_id
        ).all()

        user = User.query.get(user_id)
        if not user:
            return

        for conversation in conversations:
            # Determine the other user in the conversation
            other_user_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id

            # Emit online status to the other user's personal room
            emit('user_online_status', {
                'user_id': user.public_id,
                'username': user.username,
                'is_online': is_online,
                'last_seen': user.last_seen.isoformat() + "Z" if user.last_seen else None,
                'timestamp': datetime.utcnow().isoformat() + "Z"
            }, room=f"user_{other_user_id}")

            # Also emit to the conversation room
            room_name = f"conversation_{conversation.id}"
            emit('user_online_status', {
                'user_id': user.public_id,
                'username': user.username,
                'is_online': is_online,
                'last_seen': user.last_seen.isoformat() + "Z" if user.last_seen else None,
                'timestamp': datetime.utcnow().isoformat() + "Z"
            }, room=room_name)

    except Exception as e:
        print(f"DEBUG: Online status broadcast error: {str(e)}")


@socketio.on('connect')
def handle_connect():
    """
    Handle user connection with JWT authentication
    Update user's online status in database
    """
    try:
        # Get token from cookies (since middleware handles authentication)
        token = flask_request.cookies.get('access_token_cookie')

        if not token:
            print("DEBUG: No token found in cookies")
            # Also check Authorization header as fallback
            auth_header = flask_request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header[7:]
                print("DEBUG: Using token from Authorization header")
            else:
                print("DEBUG: No token provided for SocketIO connection")
                return False

        # Verify JWT token
        from flask_jwt_extended import decode_token
        try:
            decoded_token = decode_token(token)
            user_public_id = decoded_token['sub']
            print(f"DEBUG: Decoded token for user: {user_public_id}")

            # Find user in database
            user = User.query.filter_by(public_id=user_public_id).first()
            if not user:
                print(f"DEBUG: User not found for public_id: {user_public_id}")
                return False

            # Update user's online status in database
            user.is_online = True
            user.last_seen = datetime.utcnow()
            db.session.commit()

            # Store user connection info
            online_users[user.id] = {
                'public_id': user.public_id,
                'username': user.username,
                'sid': flask_request.sid,
                'is_online': True
            }

            # Join user to their personal room for private notifications
            join_room(f"user_{user.id}")

            # Broadcast online status to user's conversations
            broadcast_online_status(user.id, True)

            print(f"DEBUG: User {user.username} connected with SID: {flask_request.sid}")

        except Exception as e:
            print(f"DEBUG: JWT decode error: {str(e)}")
            return False

    except Exception as e:
        print(f"DEBUG: Connection error: {str(e)}")
        return False

    return True

@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle user disconnection
    Update user's online status in database
    """
    try:
        # Find user by socket ID
        user_id = None
        user_data = None

        for uid, user_info in online_users.items():
            if user_info['sid'] == flask_request.sid:
                user_id = uid
                user_data = user_info
                break

        if user_id and user_data:
            # Update user's online status in database
            user = User.query.get(user_id)
            if user:
                user.is_online = False
                user.last_seen = datetime.utcnow()
                db.session.commit()

            # Remove from online users
            online_users.pop(user_id, None)

            # Broadcast offline status to user's conversations
            broadcast_online_status(user_id, False)

            print(f"DEBUG: User {user_data['username']} disconnected")

    except Exception as e:
        print(f"DEBUG: Disconnect error: {str(e)}")


@socketio.on('join_conversation')
def handle_join_conversation(data):
    """
    Join a conversation room with comprehensive security validation
    Only allows participants to join their conversations
    """
    try:
        conversation_id = data.get('conversation_id')
        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'}, room=flask_request.sid)
            return

        # Get authenticated user with security validation
        user_id, user_data, error_msg = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        # Validate conversation access with security check
        is_authorized, conversation, error_msg = validate_socket_conversation_access(conversation_id, user_id)
        if not is_authorized:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        # Join the conversation room
        room_name = f"conversation_{conversation_id}"
        join_room(room_name)

        # Mark messages as read when joining conversation (security: only mark messages sent to user)
        unread_messages = Message.query.filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,  # Only mark others' messages
            Message.is_read == False
        ).all()

        for msg in unread_messages:
            if msg.mark_read():  # Use the secure mark_read method
                db.session.commit()

                # Notify sender that messages were read (security: only notify actual sender)
                emit('message_status_update', {
                    'message_id': msg.id,
                    'conversation_id': conversation_id,
                    'status': 'read',
                    'read_at': msg.read_at.isoformat() + "Z",
                    'read_by': user_id,
                    'timestamp': datetime.utcnow().isoformat() + "Z"
                }, room=f"user_{msg.sender_id}")

        print(f"DEBUG: User {user_id} joined conversation room: {room_name}")
        emit('joined_conversation', {
            'conversation_id': conversation_id,
            'message': 'Successfully joined conversation'
        }, room=flask_request.sid)

    except Exception as e:
        print(f"DEBUG: Join conversation error: {str(e)}")
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
        print(f"DEBUG: Leave conversation error: {str(e)}")
        emit('error', {'message': 'Failed to leave conversation'}, room=flask_request.sid)


@socketio.on('send_message')
def handle_send_message(data):
    """
    Send message with comprehensive security validation
    Only allows participants to send messages in their conversations
    """
    try:
        conversation_id = data.get('conversation_id')
        content = data.get('content', '').strip()

        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'}, room=flask_request.sid)
            return

        if not content:
            emit('error', {'message': 'Message content cannot be empty'}, room=flask_request.sid)
            return

        if len(content) > 1000:
            emit('error', {'message': 'Message too long (max 1000 characters)'}, room=flask_request.sid)
            return

        # Get authenticated user with security validation
        user_id, user_data, error_msg = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        # Validate conversation access with security check
        is_authorized, conversation, error_msg = validate_socket_conversation_access(conversation_id, user_id)
        if not is_authorized:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        # Determine recipient with security validation
        recipient_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id
        recipient = User.query.get(recipient_id)
        if not recipient:
            emit('error', {'message': 'Recipient not found'}, room=flask_request.sid)
            return

        # Create and save message
        new_message = Message(
            conversation_id=conversation_id,
            sender_id=user_id,
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

        # Prepare message data for broadcast
        message_data = new_message.to_dict()

        # Broadcast to conversation room (security: only participants receive)
        room_name = f"conversation_{conversation_id}"
        emit('new_message', message_data, room=room_name)

        # Also send to recipient's personal room if they're not in conversation room
        emit('new_message', message_data, room=f"user_{recipient_id}")

        print(f"DEBUG: Message sent in conversation {conversation_id} by user {user_id}")

    except Exception as e:
        print(f"DEBUG: Send message error: {str(e)}")
        emit('error', {'message': 'Failed to send message'}, room=flask_request.sid)


@socketio.on('message_delivered')
def handle_message_delivered(data):
    """
    Mark message as delivered with comprehensive security validation
    Only allows recipients to mark messages as delivered
    """
    try:
        message_id = data.get('message_id')
        conversation_id = data.get('conversation_id')

        if not message_id:
            emit('error', {'message': 'Message ID is required'}, room=flask_request.sid)
            return

        # Get authenticated user with security validation
        user_id, user_data, error_msg = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        # Find message
        message = Message.query.get(message_id)
        if not message:
            emit('error', {'message': 'Message not found'}, room=flask_request.sid)
            return

        # Validate user has access to this conversation
        is_authorized, conversation, error_msg = validate_socket_conversation_access(message.conversation_id, user_id)
        if not is_authorized:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        # Security: Verify this user is the recipient (not the sender)
        if user_id == message.sender_id:
            emit('error', {'message': 'Cannot mark own message as delivered'}, room=flask_request.sid)
            return

        # Mark message as delivered
        if message.mark_delivered():
            db.session.commit()

            # Notify sender that message was delivered (security: only notify actual sender)
            emit('message_status_update', {
                'message_id': message_id,
                'conversation_id': conversation_id,
                'status': 'delivered',
                'delivered_at': message.delivered_at.isoformat() + "Z",
                'timestamp': datetime.utcnow().isoformat() + "Z"
            }, room=f"user_{message.sender_id}")

            print(f"DEBUG: Message {message_id} marked as delivered to user {user_id}")

        emit('message_delivered_success', {
            'message_id': message_id,
            'status': 'delivered'
        }, room=flask_request.sid)

    except Exception as e:
        print(f"DEBUG: Message delivered error: {str(e)}")
        emit('error', {'message': 'Failed to mark message as delivered'}, room=flask_request.sid)


@socketio.on('read_messages')
def handle_read_messages(data):
    """
    Mark messages as read with comprehensive security validation
    Only allows participants to mark messages as read in their conversations
    """
    try:
        conversation_id = data.get('conversation_id')
        message_ids = data.get('message_ids', [])

        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'}, room=flask_request.sid)
            return

        # Get authenticated user with security validation
        user_id, user_data, error_msg = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        # Validate conversation access with security check
        is_authorized, conversation, error_msg = validate_socket_conversation_access(conversation_id, user_id)
        if not is_authorized:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        # Mark specific messages as read, or all unread messages in conversation
        # Security: Only mark messages from other users
        if message_ids:
            messages = Message.query.filter(
                Message.id.in_(message_ids),
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id  # Security: Only mark others' messages
            ).all()
        else:
            messages = Message.query.filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id,  # Security: Only mark others' messages
                Message.is_read == False
            ).all()

        message_ids_updated = []
        for msg in messages:
            if msg.mark_read():  # Use the secure mark_read method
                message_ids_updated.append(msg.id)

        if message_ids_updated:
            db.session.commit()

            # Notify sender that messages were read (security: only notify actual senders)
            for msg in messages:
                if msg.id in message_ids_updated:
                    emit('message_status_update', {
                        'message_id': msg.id,
                        'conversation_id': conversation_id,
                        'status': 'read',
                        'read_at': msg.read_at.isoformat() + "Z",
                        'read_by': user_id,
                        'timestamp': datetime.utcnow().isoformat() + "Z"
                    }, room=f"user_{msg.sender_id}")

            print(
                f"DEBUG: User {user_id} marked {len(message_ids_updated)} messages as read in conversation {conversation_id}")

        emit('messages_read_success', {
            'conversation_id': conversation_id,
            'message_ids': message_ids_updated,
            'count': len(message_ids_updated)
        }, room=flask_request.sid)

    except Exception as e:
        print(f"DEBUG: Read messages error: {str(e)}")
        emit('error', {'message': 'Failed to mark messages as read'}, room=flask_request.sid)


@socketio.on('typing')
def handle_typing(data):
    """
    Typing indicator with comprehensive security validation
    Only allows participants to send typing indicators in their conversations
    """
    try:
        conversation_id = data.get('conversation_id')
        is_typing = data.get('is_typing', True)

        if not conversation_id:
            emit('error', {'message': 'Conversation ID is required'}, room=flask_request.sid)
            return

        # Get authenticated user with security validation
        user_id, user_data, error_msg = get_authenticated_user_from_socket(online_users, flask_request)
        if not user_id:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        # Validate conversation access with security check
        is_authorized, conversation, error_msg = validate_socket_conversation_access(conversation_id, user_id)
        if not is_authorized:
            emit('error', {'message': error_msg}, room=flask_request.sid)
            return

        # Determine recipient with security validation
        recipient_id = conversation.user2_id if conversation.user1_id == user_id else conversation.user1_id

        # Broadcast typing indicator to conversation room (excluding sender)
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
        print(f"DEBUG: Typing indicator error: {str(e)}")
        emit('error', {'message': 'Failed to send typing indicator'}, room=flask_request.sid)