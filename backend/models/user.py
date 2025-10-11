from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import mapped_column, Mapped, relationship
from datetime import datetime
import uuid
from .core import db
from werkzeug.security import generate_password_hash, check_password_hash


class Picture(db.Model):
    """
    Picture model for storing user profile images
    Each user can have multiple profile pictures
    """
    __tablename__ = "pictures"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    image: Mapped[str] = mapped_column(Text, nullable=False)
    user = relationship("User", back_populates="pictures")

    def __repr__(self):
        return f"<Picture {self.id} for User {self.user_id}>"


class User(db.Model):
    """
    Main User model for storing user information
    Contains all user profile data and authentication information
    """
    __tablename__ = "users"

    # Primary key and identification
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)

    # Authentication
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    security_question: Mapped[str] = mapped_column(String(255), nullable=False)
    security_answer: Mapped[str] = mapped_column(String(255), nullable=False)

    # Profile information
    name: Mapped[str] = mapped_column(String(100), nullable=True)
    age: Mapped[int] = mapped_column(Integer, nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=True)
    gender: Mapped[str] = mapped_column(String(20), nullable=False)
    genotype: Mapped[str] = mapped_column(String(5), nullable=True)
    level: Mapped[str] = mapped_column(String(20), nullable=True)
    gender = mapped_column(String(10), nullable=True)
    interested_in = mapped_column(String(10), default="Both")  # "Male", "Female", or "Both"
    religious: Mapped[str] = mapped_column(String(50), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    bio: Mapped[str] = mapped_column(String(500), nullable=True)

    # Timestamps and status
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_admin = db.Column(db.Boolean, default=False)
    last_password_reset: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)
    last_seen: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    # Relationships
    pictures = relationship("Picture", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)
    sent_messages = db.relationship('Message', back_populates='sender', foreign_keys='Message.sender_id')
    # conversations_as_user1 = relationship("Conversation", foreign_keys="Conversation.user1_id", backref="user1")
    # conversations_as_user2 = relationship("Conversation", foreign_keys="Conversation.user2_id", backref="user2")
    sent_swipes = relationship("Swipe", foreign_keys="Swipe.user_id", backref="user")
    received_swipes = relationship("Swipe", foreign_keys="Swipe.target_user_id", backref="target_user")

    def set_password(self, password: str):
        """Hash and set the user's password using werkzeug security"""
        self.password = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        """Verify if the provided password matches the stored hash"""
        return check_password_hash(self.password, password)

    def set_security_answer(self, answer: str):
        """Hash and set the security answer (normalize to lowercase and strip whitespace)"""
        self.security_answer = generate_password_hash(answer.lower().strip())

    def check_security_answer(self, answer: str) -> bool:
        """Verify if the provided security answer matches the stored hash"""
        return check_password_hash(self.security_answer, answer.lower().strip())

    def to_dict(self, include_security=False):
        """
        Convert User object to dictionary for JSON response
        Args:
            include_security: Whether to include security-related fields
        Returns:
            Dictionary representation of the user
        """
        from utils.helpers import build_image_url  # Import here to avoid circular imports

        data = {
            "id": self.public_id,
            "username": self.username,
            "name": self.name,
            "age": str(self.age),
            "gender": self.gender,
            "department": self.department,
            "genotype": self.genotype,
            "level": self.level,
            "interestedIn": self.interested_in,
            "religious": self.religious,
            "isAnonymous": self.is_anonymous,
            "category": self.category,
            "bio": self.bio,
            "is_admin": self.is_admin,
            "isOnline": self.is_online,
            "lastSeen": self.last_seen.isoformat() + "Z" if self.last_seen else None,
            "pictures": [build_image_url(picture.image) for picture in self.pictures],
            "timestamp": self.timestamp.isoformat() + "Z" if self.timestamp else None
        }

        if include_security:
            data["security_question"] = self.security_question

        return data

    def __repr__(self):
        return f"<User {self.username}>"


# FEED SYSTEM MODELS - Add to existing user.py

class Post(db.Model):
    """
    Post model for user-generated content in the feed
    """
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)

    # Post content
    text: Mapped[str] = mapped_column(db.Text, nullable=True)
    image: Mapped[str] = mapped_column(String(500), nullable=True)
    category: Mapped[str] = mapped_column(String(100), nullable=True)
    location: Mapped[str] = mapped_column(String(200), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan", passive_deletes=True)
    likes = relationship("Like", back_populates="post", cascade="all, delete-orphan", passive_deletes=True)

    def to_dict(self, current_user_id=None):
        """
        Convert Post object to dictionary for JSON response
        """
        from utils.helpers import build_image_url

        data = {
            "id": self.public_id,
            "text": self.text,
            "image": build_image_url(self.image) if self.image else None,
            "category": self.category,
            "location": self.location,
            "created_at": self.created_at.isoformat() + "Z",
            "updated_at": self.updated_at.isoformat() + "Z",
            "user": self.user.to_dict() if self.user else None,
            "comments_count": len(self.comments),
            "likes_count": len(self.likes),
            "has_liked": False
        }

        # Check if current user has liked this post
        if current_user_id:
            user_likes = [like for like in self.likes if like.user_id == current_user_id]
            data["has_liked"] = len(user_likes) > 0

        return data

    def __repr__(self):
        return f"<Post {self.public_id} by User {self.user_id}>"


class Comment(db.Model):
    """
    Comment model for user comments on posts
    """
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)

    # Comment content
    text: Mapped[str] = mapped_column(db.Text, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User")
    post = relationship("Post", back_populates="comments")

    def to_dict(self):
        """Convert Comment object to dictionary for JSON response"""
        return {
            "id": self.public_id,
            "text": self.text,
            "created_at": self.created_at.isoformat() + "Z",
            "updated_at": self.updated_at.isoformat() + "Z",
            "user": self.user.to_dict() if self.user else None
        }

    def __repr__(self):
        return f"<Comment {self.public_id} by User {self.user_id} on Post {self.post_id}>"


class Like(db.Model):
    """
    Like model for tracking user likes on posts
    """
    __tablename__ = "likes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    post_id: Mapped[int] = mapped_column(Integer, ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User")
    post = relationship("Post", back_populates="likes")

    def __repr__(self):
        return f"<Like by User {self.user_id} on Post {self.post_id}>"


# Add posts relationship to User class (add this line after your User class)
User.posts = relationship("Post", back_populates="user", cascade="all, delete-orphan", passive_deletes=True)



class Swipe(db.Model):
    """
    Swipe model for tracking user interactions (likes and passes)
    Used for matching algorithm and explore functionality
    """
    __tablename__ = "swipes"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    target_user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    action = db.Column(db.String(10), nullable=False)  # "like" or "pass"
    timestamp = db.Column(db.DateTime, default=db.func.now())

    def __repr__(self):
        return f"<Swipe {self.id} by User{self.user_id} on User{self.target_user_id}>"


class TokenBlocklist(db.Model):
    """
    Token blacklist model for storing revoked JWT tokens
    Provides token revocation functionality for logout and security
    """
    __tablename__ = "token_blacklist"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    jti: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    token_type: Mapped[str] = mapped_column(String(10), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    expires: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    user = db.relationship('User', lazy='joined')

    def __repr__(self):
        return f"<TokenBlocklist {self.jti} for User {self.user_id}>"