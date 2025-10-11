from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text, DECIMAL
from sqlalchemy.orm import mapped_column, Mapped, relationship
from datetime import datetime, timedelta
import uuid
from enum import Enum
from .core import db


class SubscriptionTier(str, Enum):
    """Subscription tiers for the application"""
    FREE = "free"
    PREMIUM = "premium"
    VIP = "vip"


class SubscriptionStatus(str, Enum):
    """Subscription status types"""
    ACTIVE = "active"
    CANCELED = "canceled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"
    TRIAL = "trial"


class PaymentStatus(str, Enum):
    """Payment status types"""
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class PaymentProvider(str, Enum):
    """Supported payment providers"""
    FLUTTERWAVE = "flutterwave"
    PAYSTACK = "paystack"
    STRIPE = "stripe"


class SubscriptionPlan(db.Model):
    """
    Subscription plan model for defining different subscription tiers and pricing
    """
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    tier: Mapped[SubscriptionTier] = mapped_column(String(20), nullable=False, default=SubscriptionTier.FREE)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    
    # Pricing
    monthly_price: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False, default=0.00)
    yearly_price: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False, default=0.00)
    currency: Mapped[str] = mapped_column(String(3), default="NGN")
    
    # Billing cycle in days
    billing_cycle_days: Mapped[int] = mapped_column(Integer, default=30)
    
    # Features
    max_messages: Mapped[int] = mapped_column(Integer, default=50)  # -1 for unlimited
    max_likes: Mapped[int] = mapped_column(Integer, default=100)    # -1 for unlimited
    max_swipes: Mapped[int] = mapped_column(Integer, default=200)   # -1 for unlimited
    has_advanced_filters: Mapped[bool] = mapped_column(Boolean, default=False)
    has_priority_matching: Mapped[bool] = mapped_column(Boolean, default=False)
    has_read_receipts: Mapped[bool] = mapped_column(Boolean, default=False)
    has_verified_badge: Mapped[bool] = mapped_column(Boolean, default=False)
    can_see_who_liked_you: Mapped[bool] = mapped_column(Boolean, default=False)
    can_rewind_swipes: Mapped[bool] = mapped_column(Boolean, default=False)
    has_incognito_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    subscriptions = relationship("UserSubscription", back_populates="plan")
    payments = relationship("Payment", back_populates="plan")
    
    def to_dict(self):
        """Convert plan to dictionary for API responses"""
        return {
            "id": self.public_id,
            "name": self.name,
            "tier": self.tier,
            "description": self.description,
            "pricing": {
                "monthly": float(self.monthly_price),
                "yearly": float(self.yearly_price),
                "currency": self.currency,
                "yearly_savings": self.calculate_yearly_savings()
            },
            "features": {
                "max_messages": self.max_messages,
                "max_likes": self.max_likes,
                "max_swipes": self.max_swipes,
                "has_advanced_filters": self.has_advanced_filters,
                "has_priority_matching": self.has_priority_matching,
                "has_read_receipts": self.has_read_receipts,
                "has_verified_badge": self.has_verified_badge,
                "can_see_who_liked_you": self.can_see_who_liked_you,
                "can_rewind_swipes": self.can_rewind_swipes,
                "has_incognito_mode": self.has_incognito_mode
            },
            "is_active": self.is_active,
            "is_popular": self.is_popular,
            "created_at": self.created_at.isoformat() + "Z"
        }
    
    def calculate_yearly_savings(self) -> float:
        """Calculate yearly savings percentage"""
        if self.monthly_price == 0:
            return 0
        yearly_from_monthly = float(self.monthly_price) * 12
        savings = yearly_from_monthly - float(self.yearly_price)
        return round((savings / yearly_from_monthly) * 100, 1)
    
    def is_unlimited_messages(self) -> bool:
        return self.max_messages == -1
    
    def is_unlimited_likes(self) -> bool:
        return self.max_likes == -1
    
    def is_unlimited_swipes(self) -> bool:
        return self.max_swipes == -1
    
    def __repr__(self):
        return f"<SubscriptionPlan {self.name} ({self.tier})>"



class UserSubscription(db.Model):
    """
    User subscription model for tracking user subscriptions and their status
    """
    __tablename__ = "user_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign keys
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey('subscription_plans.id'), nullable=False)
    
    # Subscription details
    status: Mapped[SubscriptionStatus] = mapped_column(String(20), default=SubscriptionStatus.ACTIVE)
    billing_cycle: Mapped[str] = mapped_column(String(10), default="monthly")  # monthly or yearly
    
    # Dates
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    canceled_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    trial_ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Auto-renewal
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    
    # Usage tracking
    messages_used: Mapped[int] = mapped_column(Integer, default=0)
    likes_used: Mapped[int] = mapped_column(Integer, default=0)
    swipes_used: Mapped[int] = mapped_column(Integer, default=0)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")
    
    def to_dict(self):
        """Convert subscription to dictionary for API responses"""
        return {
            "id": self.public_id,
            "user_id": self.user.public_id if self.user else None,
            "plan": self.plan.to_dict() if self.plan else None,
            "status": self.status,
            "billing_cycle": self.billing_cycle,
            "dates": {
                "start_date": self.start_date.isoformat() + "Z",
                "end_date": self.end_date.isoformat() + "Z",
                "canceled_at": self.canceled_at.isoformat() + "Z" if self.canceled_at else None,
                "trial_ends_at": self.trial_ends_at.isoformat() + "Z" if self.trial_ends_at else None
            },
            "auto_renew": self.auto_renew,
            "usage": {
                "messages": {
                    "used": self.messages_used,
                    "limit": self.plan.max_messages if self.plan else 50,
                    "remaining": self.get_remaining_messages()
                },
                "likes": {
                    "used": self.likes_used,
                    "limit": self.plan.max_likes if self.plan else 100,
                    "remaining": self.get_remaining_likes()
                },
                "swipes": {
                    "used": self.swipes_used,
                    "limit": self.plan.max_swipes if self.plan else 200,
                    "remaining": self.get_remaining_swipes()
                }
            },
            "is_active": self.is_active(),
            "days_remaining": self.get_days_remaining(),
            "created_at": self.created_at.isoformat() + "Z"
        }
    
    def is_active(self) -> bool:
        """Check if subscription is currently active"""
        return self.status == SubscriptionStatus.ACTIVE and self.end_date > datetime.utcnow()
    
    def is_trial(self) -> bool:
        """Check if subscription is in trial period"""
        return (self.trial_ends_at and 
                self.trial_ends_at > datetime.utcnow() and 
                self.status == SubscriptionStatus.TRIAL)
    
    def get_days_remaining(self) -> int:
        """Get number of days remaining in subscription"""
        if not self.is_active():
            return 0
        remaining = self.end_date - datetime.utcnow()
        return max(0, remaining.days)
    
    def get_remaining_messages(self) -> int:
        """Get remaining messages for current period"""
        if not self.plan:
            return 0
        if self.plan.is_unlimited_messages():
            return -1  # Unlimited
        return max(0, self.plan.max_messages - self.messages_used)
    
    def get_remaining_likes(self) -> int:
        """Get remaining likes for current period"""
        if not self.plan:
            return 0
        if self.plan.is_unlimited_likes():
            return -1  # Unlimited
        return max(0, self.plan.max_likes - self.likes_used)
    
    def get_remaining_swipes(self) -> int:
        """Get remaining swipes for current period"""
        if not self.plan:
            return 0
        if self.plan.is_unlimited_swipes():
            return -1  # Unlimited
        return max(0, self.plan.max_swipes - self.swipes_used)
    
    def can_send_message(self) -> bool:
        """Check if user can send a message"""
        return self.get_remaining_messages() != 0
    
    def can_like(self) -> bool:
        """Check if user can like someone"""
        return self.get_remaining_likes() != 0
    
    def can_swipe(self) -> bool:
        """Check if user can swipe"""
        return self.get_remaining_swipes() != 0
    
    def increment_messages(self):
        """Increment message count"""
        if not self.plan.is_unlimited_messages():
            self.messages_used += 1
    
    def increment_likes(self):
        """Increment like count"""
        if not self.plan.is_unlimited_likes():
            self.likes_used += 1
    
    def increment_swipes(self):
        """Increment swipe count"""
        if not self.plan.is_unlimited_swipes():
            self.swipes_used += 1
    
    def renew(self, billing_cycle: str = None):
        """Renew subscription for another period"""
        if billing_cycle:
            self.billing_cycle = billing_cycle
        
        cycle_days = 365 if self.billing_cycle == "yearly" else self.plan.billing_cycle_days
        self.start_date = datetime.utcnow()
        self.end_date = self.start_date + timedelta(days=cycle_days)
        self.status = SubscriptionStatus.ACTIVE
        
        # Reset usage counters
        self.messages_used = 0
        self.likes_used = 0
        self.swipes_used = 0
    
    def cancel(self):
        """Cancel subscription (remains active until end date)"""
        self.status = SubscriptionStatus.CANCELED
        self.auto_renew = False
        self.canceled_at = datetime.utcnow()

    def sync_usage_from_backend(self):
        """Sync usage counters with real backend data"""
        from models.user import Swipe, Message, Like
        
        period_start = self.start_date
        period_end = self.end_date
        
        try:
            # Calculate real messages sent in current period
            real_messages_sent = Message.query.filter(
                Message.sender_id == self.user_id,
                Message.timestamp >= period_start,
                Message.timestamp <= period_end
            ).count()

            # Calculate real swipes in current period
            real_swipes_used = Swipe.query.filter(
                Swipe.user_id == self.user_id,
                Swipe.timestamp >= period_start,
                Swipe.timestamp <= period_end
            ).count()

            # Calculate real post likes in current period
            real_post_likes = Like.query.filter(
                Like.user_id == self.user_id,
                Like.created_at >= period_start,
                Like.created_at <= period_end
            ).count()

            # Calculate real profile likes (swipes with action='like') in current period
            real_profile_likes = Swipe.query.filter(
                Swipe.user_id == self.user_id,
                Swipe.action == 'like',
                Swipe.timestamp >= period_start,
                Swipe.timestamp <= period_end
            ).count()

            # Total likes (post likes + profile likes)
            real_total_likes = real_post_likes + real_profile_likes

            # Update subscription counters
            self.messages_used = real_messages_sent
            self.likes_used = real_total_likes
            self.swipes_used = real_swipes_used
            
            return {
                "messages": real_messages_sent,
                "likes": real_total_likes,
                "swipes": real_swipes_used,
                "breakdown": {
                    "post_likes": real_post_likes,
                    "profile_likes": real_profile_likes,
                    "total_likes": real_total_likes
                }
            }
            
        except Exception as e:
            print(f"Error syncing usage for subscription {self.public_id}: {str(e)}")
            return {
                "messages": self.messages_used,
                "likes": self.likes_used,
                "swipes": self.swipes_used,
                "error": str(e)
            }

    def get_real_usage_stats(self):
        """Get real usage statistics from backend without updating counters"""
        from models.user import Swipe, Message, Like
        
        period_start = self.start_date
        period_end = self.end_date
        
        try:
            # Calculate real messages sent in current period
            real_messages_sent = Message.query.filter(
                Message.sender_id == self.user_id,
                Message.timestamp >= period_start,
                Message.timestamp <= period_end
            ).count()

            # Calculate real swipes in current period
            real_swipes_used = Swipe.query.filter(
                Swipe.user_id == self.user_id,
                Swipe.timestamp >= period_start,
                Swipe.timestamp <= period_end
            ).count()

            # Calculate real post likes in current period
            real_post_likes = Like.query.filter(
                Like.user_id == self.user_id,
                Like.created_at >= period_start,
                Like.created_at <= period_end
            ).count()

            # Calculate real profile likes (swipes with action='like') in current period
            real_profile_likes = Swipe.query.filter(
                Swipe.user_id == self.user_id,
                Swipe.action == 'like',
                Swipe.timestamp >= period_start,
                Swipe.timestamp <= period_end
            ).count()

            # Total likes (post likes + profile likes)
            real_total_likes = real_post_likes + real_profile_likes

            return {
                "real_usage": {
                    "messages": real_messages_sent,
                    "likes": real_total_likes,
                    "swipes": real_swipes_used
                },
                "subscription_usage": {
                    "messages": self.messages_used,
                    "likes": self.likes_used,
                    "swipes": self.swipes_used
                },
                "breakdown": {
                    "post_likes": real_post_likes,
                    "profile_likes": real_profile_likes,
                    "total_likes": real_total_likes
                },
                "period": {
                    "start": period_start.isoformat() + "Z",
                    "end": period_end.isoformat() + "Z"
                },
                "discrepancy": {
                    "messages": real_messages_sent - self.messages_used,
                    "likes": real_total_likes - self.likes_used,
                    "swipes": real_swipes_used - self.swipes_used
                }
            }
            
        except Exception as e:
            print(f"Error getting real usage for subscription {self.public_id}: {str(e)}")
            return {
                "real_usage": {
                    "messages": self.messages_used,
                    "likes": self.likes_used,
                    "swipes": self.swipes_used
                },
                "subscription_usage": {
                    "messages": self.messages_used,
                    "likes": self.likes_used,
                    "swipes": self.swipes_used
                },
                "error": str(e)
            }

    def reset_usage_counters(self):
        """Reset usage counters to zero"""
        self.messages_used = 0
        self.likes_used = 0
        self.swipes_used = 0
        return {
            "messages": 0,
            "likes": 0,
            "swipes": 0
        }

    def has_exceeded_limits(self):
        """Check if user has exceeded any usage limits"""
        if not self.plan:
            return False
            
        exceeded_limits = []
        
        if not self.plan.is_unlimited_messages() and self.messages_used >= self.plan.max_messages:
            exceeded_limits.append("messages")
            
        if not self.plan.is_unlimited_likes() and self.likes_used >= self.plan.max_likes:
            exceeded_limits.append("likes")
            
        if not self.plan.is_unlimited_swipes() and self.swipes_used >= self.plan.max_swipes:
            exceeded_limits.append("swipes")
            
        return exceeded_limits if exceeded_limits else False

    def get_usage_percentage(self):
        """Get usage as percentage of limits"""
        if not self.plan:
            return {}
            
        def calculate_percentage(used, limit, unlimited):
            if unlimited:
                return 0
            if limit == 0:
                return 100
            return min(100, int((used / limit) * 100))
        
        return {
            "messages": calculate_percentage(
                self.messages_used, 
                self.plan.max_messages, 
                self.plan.is_unlimited_messages()
            ),
            "likes": calculate_percentage(
                self.likes_used, 
                self.plan.max_likes, 
                self.plan.is_unlimited_likes()
            ),
            "swipes": calculate_percentage(
                self.swipes_used, 
                self.plan.max_swipes, 
                self.plan.is_unlimited_swipes()
            )
        }

    def get_usage_summary(self):
        """Get comprehensive usage summary"""
        real_stats = self.get_real_usage_stats()
        usage_percentage = self.get_usage_percentage()
        exceeded_limits = self.has_exceeded_limits()
        
        summary = {
            "subscription_info": {
                "plan_name": self.plan.name if self.plan else "Free",
                "tier": self.plan.tier if self.plan else "free",
                "status": self.status,
                "billing_cycle": self.billing_cycle,
                "is_active": self.is_active(),
                "days_remaining": self.get_days_remaining()
            },
            "limits": {
                "messages": self.plan.max_messages if self.plan else 50,
                "likes": self.plan.max_likes if self.plan else 100,
                "swipes": self.plan.max_swipes if self.plan else 200,
                "unlimited_messages": self.plan.is_unlimited_messages() if self.plan else False,
                "unlimited_likes": self.plan.is_unlimited_likes() if self.plan else False,
                "unlimited_swipes": self.plan.is_unlimited_swipes() if self.plan else False
            },
            "current_usage": {
                "messages": self.messages_used,
                "likes": self.likes_used,
                "swipes": self.swipes_used
            },
            "remaining": {
                "messages": self.get_remaining_messages(),
                "likes": self.get_remaining_likes(),
                "swipes": self.get_remaining_swipes()
            },
            "usage_percentage": usage_percentage,
            "exceeded_limits": exceeded_limits,
            "period": {
                "start": self.start_date.isoformat() + "Z",
                "end": self.end_date.isoformat() + "Z"
            }
        }
        
        # Add real usage stats if available
        if "real_usage" in real_stats:
            summary["real_usage"] = real_stats["real_usage"]
            summary["discrepancy"] = real_stats.get("discrepancy", {})
            summary["breakdown"] = real_stats.get("breakdown", {})
        
        return summary
    
    def __repr__(self):
        return f"<UserSubscription {self.public_id} for User {self.user_id}>"
    
class Payment(db.Model):
    """
    Payment model for tracking all payment transactions
    """
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign keys
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    subscription_id: Mapped[int] = mapped_column(Integer, ForeignKey('user_subscriptions.id'), nullable=True)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey('subscription_plans.id'), nullable=False)
    
    # Payment details
    amount: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="NGN")
    billing_cycle: Mapped[str] = mapped_column(String(10), default="monthly")
    
    # Payment provider information
    provider: Mapped[PaymentProvider] = mapped_column(String(20), nullable=False)
    provider_payment_id: Mapped[str] = mapped_column(String(100), nullable=True)  # Payment ID from provider
    provider_reference: Mapped[str] = mapped_column(String(100), nullable=True)   # Reference from provider
    
    # Status
    status: Mapped[PaymentStatus] = mapped_column(String(20), default=PaymentStatus.PENDING)
    
    # Metadata - CHANGED FROM 'metadata' TO 'payment_metadata'
    payment_metadata: Mapped[str] = mapped_column(Text, nullable=True)  # JSON string for additional data
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="payments")
    subscription = relationship("UserSubscription", back_populates="payments")
    plan = relationship("SubscriptionPlan", back_populates="payments")
    
    def to_dict(self):
        """Convert payment to dictionary for API responses"""
        return {
            "id": self.public_id,
            "user_id": self.user.public_id if self.user else None,
            "subscription_id": self.subscription.public_id if self.subscription else None,
            "plan": self.plan.to_dict() if self.plan else None,
            "amount": float(self.amount),
            "currency": self.currency,
            "billing_cycle": self.billing_cycle,
            "provider": self.provider,
            "provider_payment_id": self.provider_payment_id,
            "provider_reference": self.provider_reference,
            "status": self.status,
            "payment_metadata": self.payment_metadata,  # Updated field name
            "dates": {
                "created_at": self.created_at.isoformat() + "Z",
                "paid_at": self.paid_at.isoformat() + "Z" if self.paid_at else None
            }
        }
    
    def mark_completed(self, provider_payment_id: str = None, provider_reference: str = None):
        """Mark payment as completed"""
        self.status = PaymentStatus.COMPLETED
        self.paid_at = datetime.utcnow()
        if provider_payment_id:
            self.provider_payment_id = provider_payment_id
        if provider_reference:
            self.provider_reference = provider_reference
    
    def mark_failed(self):
        """Mark payment as failed"""
        self.status = PaymentStatus.FAILED
    
    def is_successful(self) -> bool:
        """Check if payment was successful"""
        return self.status == PaymentStatus.COMPLETED
    
    def __repr__(self):
        return f"<Payment {self.public_id} for User {self.user_id}>"


# Add relationships to existing User model
def add_subscription_relationships():
    """Add subscription relationships to User model"""
    from .user import User
    
    # Check if relationships already exist to avoid duplicate definitions
    if not hasattr(User, 'subscriptions'):
        User.subscriptions = relationship("UserSubscription", back_populates="user", cascade="all, delete-orphan")
    
    if not hasattr(User, 'payments'):
        User.payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")
    
    # Add current_subscription property to User model if it doesn't exist
    if not hasattr(User, 'current_subscription'):
        @property
        def current_subscription(self):
            """Get user's current active subscription"""
            from sqlalchemy import and_, or_
            return UserSubscription.query.filter(
                and_(
                    UserSubscription.user_id == self.id,
                    or_(
                        UserSubscription.status == SubscriptionStatus.ACTIVE,
                        UserSubscription.status == SubscriptionStatus.TRIAL
                    ),
                    UserSubscription.end_date > datetime.utcnow()
                )
            ).order_by(UserSubscription.created_at.desc()).first()
        
        User.current_subscription = current_subscription
    
    # Add helper methods to User model
    if not hasattr(User, 'get_subscription_plan'):
        def get_subscription_plan(self):
            """Get user's current subscription plan"""
            if self.current_subscription and self.current_subscription.plan:
                return self.current_subscription.plan
            # Return free plan if no active subscription
            return SubscriptionPlan.query.filter_by(tier=SubscriptionTier.FREE).first()
        
        User.get_subscription_plan = get_subscription_plan
    
    if not hasattr(User, 'can_send_message'):
        def can_send_message(self):
            """Check if user can send a message based on subscription"""
            if not self.current_subscription:
                return True  # Allow basic usage
            return self.current_subscription.can_send_message()
        
        User.can_send_message = can_send_message
    
    if not hasattr(User, 'can_like_profile'):
        def can_like_profile(self):
            """Check if user can like a profile based on subscription"""
            if not self.current_subscription:
                return True  # Allow basic usage
            return self.current_subscription.can_like()
        
        User.can_like_profile = can_like_profile
    
    if not hasattr(User, 'can_swipe'):
        def can_swipe(self):
            """Check if user can swipe based on subscription"""
            if not self.current_subscription:
                return True  # Allow basic usage
            return self.current_subscription.can_swipe()
        
        User.can_swipe = can_swipe


# Initialize the relationships when the module is imported
add_subscription_relationships()