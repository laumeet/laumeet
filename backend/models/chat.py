from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import mapped_column, Mapped, relationship
from datetime import datetime
from .core import db


class Conversation(db.Model):
    """
    Conversation model for managing chat conversations between two users
    Each conversation represents a unique chat between two users
    """
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user1_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    user2_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_message: Mapped[str] = mapped_column(String(500), nullable=True)
    last_message_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    user1 = relationship("User", foreign_keys=[user1_id], backref="conversations_initiated")
    user2 = relationship("User", foreign_keys=[user2_id], backref="conversations_received")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan",
                            passive_deletes=True)

    def to_dict(self, current_user_id=None):
        """
        Convert Conversation object to dictionary for JSON response
        Args:
            current_user_id: The ID of the current user to determine the other participant
        Returns:
            Dictionary representation of the conversation
        """
        from utils.helpers import build_image_url  # Import here to avoid circular imports

        # Determine the other participant in the conversation
        other_user = self.user2 if self.user1_id == current_user_id else self.user1

        # Count unread messages
        unread_count = len([
            msg for msg in self.messages
            if not msg.is_read and msg.sender_id != current_user_id
        ]) if current_user_id else 0

        return {
            "id": self.id,
            "user1_id": self.user1_id,
            "user2_id": self.user2_id,
            "other_user": {
                "id": other_user.public_id,
                "username": other_user.username,
                "name": other_user.name,
                "avatar": build_image_url(other_user.pictures[0].image) if other_user.pictures else None,
                "isOnline": other_user.is_online,
                "lastSeen": other_user.last_seen.isoformat() + "Z" if other_user.last_seen else None
            },
            "last_message": self.last_message,
            "last_message_at": self.last_message_at.isoformat() + "Z" if self.last_message_at else None,
            "created_at": self.created_at.isoformat() + "Z" if self.created_at else None,
            "unread_count": unread_count
        }

    def __repr__(self):
        return f"<Conversation {self.id} between User{self.user1_id} and User{self.user2_id}>"


class Message(db.Model):
    """
    Message model for storing individual chat messages
    Extended with delivery status tracking
    """
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[int] = mapped_column(
        Integer, ForeignKey('conversations.id', ondelete='CASCADE'),
        nullable=False
    )
    sender_id: Mapped[int] = mapped_column(  # ✅ Added missing column
        Integer, ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    content: Mapped[str] = mapped_column(String(1000), nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    delivered_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    read_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # ✅ Relationships
    sender = relationship("User", back_populates="sent_messages", foreign_keys=[sender_id])
    conversation = relationship("Conversation", back_populates="messages")

    def to_dict(self):
        """Convert Message object to dictionary for JSON response"""
        return {
            "id": self.id,
            "conversation_id": self.conversation_id,
            "sender_id": self.sender.public_id,
            "sender_username": self.sender.username,
            "content": self.content,
            "is_read": self.is_read,
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None,
            "delivered_at": self.delivered_at.isoformat() + "Z" if self.delivered_at else None,
            "read_at": self.read_at.isoformat() + "Z" if self.read_at else None,
            "status": self.get_status()
        }

    def get_status(self):
        """Return delivery status"""
        if self.read_at:
            return 'read'
        elif self.delivered_at:
            return 'delivered'
        else:
            return 'sent'

    def mark_delivered(self):
        """Mark message as delivered"""
        if not self.delivered_at:
            self.delivered_at = datetime.utcnow()
            return True
        return False

    def mark_read(self):
        """Mark message as read"""
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.utcnow()
            return True
        return False

    def __repr__(self):
        return f"<Message {self.id} in Conversation {self.conversation_id} from User {self.sender_id}>"
