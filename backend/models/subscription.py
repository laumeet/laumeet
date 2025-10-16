# models/subscription.py (FIXED VERSION)
from sqlalchemy import Integer, String, Boolean, DateTime, ForeignKey, Text, DECIMAL
from sqlalchemy.orm import mapped_column, Mapped, relationship
from datetime import datetime, timedelta
import uuid
from enum import Enum
from .core import db


class SubscriptionTier(str, Enum):
    FREE = "free"
    PREMIUM = "premium"
    VIP = "vip"


class SubscriptionStatus(str, Enum):
    ACTIVE = "active"
    CANCELED = "canceled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"
    TRIAL = "trial"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class PaymentProvider(str, Enum):
    FLUTTERWAVE = "flutterwave"


class SubscriptionPlan(db.Model):
    __tablename__ = "subscription_plans"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    tier: Mapped[SubscriptionTier] = mapped_column(String(20), nullable=False, default=SubscriptionTier.FREE)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    monthly_price: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False, default=0.00)
    yearly_price: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False, default=0.00)
    currency: Mapped[str] = mapped_column(String(3), default="NGN")
    billing_cycle_days: Mapped[int] = mapped_column(Integer, default=30)
    max_messages: Mapped[int] = mapped_column(Integer, default=50)
    max_likes: Mapped[int] = mapped_column(Integer, default=100)
    max_swipes: Mapped[int] = mapped_column(Integer, default=200)
    has_advanced_filters: Mapped[bool] = mapped_column(Boolean, default=False)
    has_priority_matching: Mapped[bool] = mapped_column(Boolean, default=False)
    has_read_receipts: Mapped[bool] = mapped_column(Boolean, default=False)
    has_verified_badge: Mapped[bool] = mapped_column(Boolean, default=False)
    can_see_who_liked_you: Mapped[bool] = mapped_column(Boolean, default=False)
    can_rewind_swipes: Mapped[bool] = mapped_column(Boolean, default=False)
    has_incognito_mode: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_popular: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    subscriptions = relationship("UserSubscription", back_populates="plan")
    payments = relationship("Payment", back_populates="plan")

    def to_dict(self):
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
    __tablename__ = "user_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey('subscription_plans.id'), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(String(20), default=SubscriptionStatus.ACTIVE)
    billing_cycle: Mapped[str] = mapped_column(String(10), default="monthly")
    start_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    end_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    canceled_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    trial_ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    messages_used: Mapped[int] = mapped_column(Integer, default=0)
    likes_used: Mapped[int] = mapped_column(Integer, default=0)
    swipes_used: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    payments = relationship("Payment", back_populates="subscription")

    def to_dict(self):
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
        return self.status == SubscriptionStatus.ACTIVE and self.end_date > datetime.utcnow()

    def get_days_remaining(self) -> int:
        if not self.is_active():
            return 0
        remaining = self.end_date - datetime.utcnow()
        return max(0, remaining.days)

    def get_remaining_messages(self) -> int:
        if not self.plan:
            return 0
        if self.plan.is_unlimited_messages():
            return -1
        return max(0, self.plan.max_messages - self.messages_used)

    def get_remaining_likes(self) -> int:
        if not self.plan:
            return 0
        if self.plan.is_unlimited_likes():
            return -1
        return max(0, self.plan.max_likes - self.likes_used)

    def get_remaining_swipes(self) -> int:
        if not self.plan:
            return 0
        if self.plan.is_unlimited_swipes():
            return -1
        return max(0, self.plan.max_swipes - self.swipes_used)

    def can_send_message(self) -> bool:
        return self.get_remaining_messages() != 0

    def can_like(self) -> bool:
        return self.get_remaining_likes() != 0

    def can_swipe(self) -> bool:
        return self.get_remaining_swipes() != 0

    def renew(self, billing_cycle: str = None):
        if billing_cycle:
            self.billing_cycle = billing_cycle

        cycle_days = 365 if self.billing_cycle == "yearly" else self.plan.billing_cycle_days
        self.start_date = datetime.utcnow()
        self.end_date = self.start_date + timedelta(days=cycle_days)
        self.status = SubscriptionStatus.ACTIVE
        self.messages_used = 0
        self.likes_used = 0
        self.swipes_used = 0

    def cancel(self):
        self.status = SubscriptionStatus.CANCELED
        self.auto_renew = False
        self.canceled_at = datetime.utcnow()

    def __repr__(self):
        return f"<UserSubscription {self.public_id} for User {self.user_id}>"


class Payment(db.Model):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    public_id: Mapped[str] = mapped_column(String(36), unique=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    subscription_id: Mapped[int] = mapped_column(Integer, ForeignKey('user_subscriptions.id'), nullable=True)
    plan_id: Mapped[int] = mapped_column(Integer, ForeignKey('subscription_plans.id'), nullable=False)
    amount: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="NGN")
    billing_cycle: Mapped[str] = mapped_column(String(10), default="monthly")
    provider: Mapped[PaymentProvider] = mapped_column(String(20), nullable=False)
    provider_payment_id: Mapped[str] = mapped_column(String(100), nullable=True)
    provider_reference: Mapped[str] = mapped_column(String(100), nullable=True)
    status: Mapped[PaymentStatus] = mapped_column(String(20), default=PaymentStatus.PENDING)

    # ADD THIS MISSING FIELD
    failure_reason: Mapped[str] = mapped_column(Text, nullable=True)

    payment_metadata: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    paid_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    user = relationship("User", back_populates="payments")
    subscription = relationship("UserSubscription", back_populates="payments")
    plan = relationship("SubscriptionPlan", back_populates="payments")

    def to_dict(self):
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
            "failure_reason": self.failure_reason,  # ADD THIS
            "payment_metadata": self.payment_metadata,
            "dates": {
                "created_at": self.created_at.isoformat() + "Z",
                "paid_at": self.paid_at.isoformat() + "Z" if self.paid_at else None
            }
        }

    def mark_completed(self, provider_payment_id: str = None, provider_reference: str = None):
        self.status = PaymentStatus.COMPLETED
        self.paid_at = datetime.utcnow()
        if provider_payment_id:
            self.provider_payment_id = provider_payment_id
        if provider_reference:
            self.provider_reference = provider_reference

    def mark_failed(self, reason: str = None):
        """Mark payment as failed with optional reason"""
        self.status = PaymentStatus.FAILED
        if reason:
            self.failure_reason = reason

    def is_successful(self) -> bool:
        return self.status == PaymentStatus.COMPLETED

    def __repr__(self):
        return f"<Payment {self.public_id} for User {self.user_id}>"


# Add relationships to User model
def add_subscription_relationships():
    from .user import User

    if not hasattr(User, 'subscriptions'):
        User.subscriptions = relationship("UserSubscription", back_populates="user", cascade="all, delete-orphan")

    if not hasattr(User, 'payments'):
        User.payments = relationship("Payment", back_populates="user", cascade="all, delete-orphan")

    if not hasattr(User, 'current_subscription'):
        @property
        def current_subscription(self):
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


add_subscription_relationships()