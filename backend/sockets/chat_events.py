from flask_jwt_extended import jwt_required
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
from utils.security import get_current_user_from_jwt
# ✅ Import the SHARED Socket.IO instance from our package
from sockets import socketio, online_users


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
@jwt_required()
def handle_connect():
    """
    Handle user connection with JWT authentication.
    """
    try:
        current_user, error_response, status_code = get_current_user_from_jwt()
        if error_response:
            return error_response, status_code
        
        # Find user in database
        user = User.query.filter_by(public_id=current_user.id).first()
        if not user:
            print(f"❌ User not found for public_id: {current_user.id}")
            emit('auth_error', {'message': 'User not found'})
            return False

        # Store user connection info
        online_users[user.id] = {
            'public_id': user.public_id,
            'username': user.username,
            'sid': flask_request.sid,
            'is_online': True,
            'connected_at': datetime.utcnow()
        }

        # Update user online status in database
        try:
            user.is_online = True
            db.session.commit()
        except SQLAlchemyError as e:
            db.session.rollback()
            print(f"⚠️ Failed to update user online status: {e}")

        # Join user to their personal room
        join_room(f"user_{user.id}")

        # Broadcast online status
        broadcast_online_status(user.id, True)

        print(f"✅ User {user.username} connected successfully. Online users: {len(online_users)}")
        
        # Send connection success message
        emit('connection_success', {
            'message': 'Connected successfully',
            'user': {
                'public_id': user.public_id,
                'username': user.username
            }
        })
        
        return True

    except Exception as e:
        print(f"💥 Unexpected error during connection: {str(e)}")
        traceback.print_exc()
        emit('auth_error', {'message': 'Internal server error during connection'})
        return False


@socketio.on('disconnect')
def handle_disconnect():
    """
    Handle user disconnection; update DB safely and broadcast offline status.
    """
    try:
        user_id = None
        user_data = None

        # Find user by socket ID
        for uid, user_info in list(online_users.items()):
            if user_info.get('sid') == flask_request.sid:
                user_id = uid
                user_data = user_info
                break

        if user_id and user_data:
            user = User.query.get(user_id)
            if user:
                try:
                    user.is_online = False
                    user.last_seen = datetime.utcnow()
                    db.session.commit()
                    print(f"✅ Updated user {user.username} offline status in database")
                except SQLAlchemyError as db_err:
                    db.session.rollback()
                    print(f"❌ DB error updating user offline status: {db_err}")

            # Remove from online users dict
            online_users.pop(user_id, None)

            # Broadcast offline status to conversations
            broadcast_online_status(user_id, False)

            print(f"🔌 User {user_data.get('username', 'Unknown')} disconnected. Remaining online: {len(online_users)}")

    except Exception as e:
        print(f"❌ Disconnect error: {e}")
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
                for msg in unread_messages:
                    if msg.mark_read():
                        db.session.add(msg)
                db.session.commit()
                
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
                        
                print(f"📖 Marked {len(unread_messages)} messages as read in conversation {conversation_id}")
                
            except SQLAlchemyError as db_err:
                db.session.rollback()
                print(f"❌ DB error marking messages read: {db_err}")
                traceback.print_exc()

        print(f"✅ User {user_id} joined conversation room: {room_name}")
        emit('joined_conversation', {
            'conversation_id': conversation_id,
            'message': 'Successfully joined conversation'
        }, room=flask_request.sid)

    except Exception as e:
        print(f"❌ Join conversation error: {e}")
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

        print(f"🚪 User left conversation room: {room_name}")
        emit('left_conversation', {
            'conversation_id': conversation_id,
            'message': 'Successfully left conversation'
        }, room=flask_request.sid)

    except Exception as e:
        print(f"❌ Leave conversation error: {e}")
        traceback.print_exc()
        emit('error', {'message': 'Failed to leave conversation'}, room=flask_request.sid)


@socketio.on('send_message')
def handle_send_message(data):
    """
    Create and broadcast a new message with security validation.
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

        # Create new message
        new_message = Message(
            conversation_id=conversation_id,
            sender_id=user_id,
            content=content,
            is_read=False,
            timestamp=datetime.utcnow()
        )

        try:
            db.session.add(new_message)
            conversation.last_message = content
            conversation.last_message_at = datetime.utcnow()
            db.session.commit()
            
            # Refresh to get the ID
            db.session.refresh(new_message)
            
        except SQLAlchemyError as db_err:
            db.session.rollback()
            print(f"❌ DB error saving new message: {db_err}")
            traceback.print_exc()
            emit('error', {'message': 'Database error while saving message'}, room=flask_request.sid)
            return

        # Prepare message data and broadcast
        message_data = new_message.to_dict()
        room_name = f"conversation_{conversation_id}"
        
        # Broadcast to conversation room and recipient's personal room
        emit('new_message', message_data, room=room_name)
        emit('new_message', message_data, room=f"user_{recipient_id}")

        print(f"💬 Message sent in conversation {conversation_id} by user {user_id}")

    except Exception as e:
        print(f"❌ Send message error: {e}")
        traceback.print_exc()
        emit('error', {'message': 'Failed to send message'}, room=flask_request.sid)


# ... rest of your event handlers (message_delivered, read_messages, typing) remain similar but with improved error handling ...

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

        typing_data = {
            'conversation_id': conversation_id,
            'user_id': user_data['public_id'],
            'username': user_data['username'],
            'is_typing': is_typing,
            'timestamp': datetime.utcnow().isoformat() + "Z"
        }

        # Broadcast to conversation room (excluding sender) and recipient's personal room
        emit('user_typing', typing_data, room=room_name, include_self=False)
        emit('user_typing', typing_data, room=f"user_{recipient_id}")

        print(f"⌨️ Typing indicator from user {user_data['username']} in conversation {conversation_id}")

    except Exception as e:
        print(f"❌ Typing indicator error: {e}")
        traceback.print_exc()
        emit('error', {'message': 'Failed to send typing indicator'}, room=flask_request.sid)