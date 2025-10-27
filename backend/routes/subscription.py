from dotenv import load_dotenv
import os
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from sqlalchemy import and_, or_
from utils.security import get_current_user_from_jwt
from models.subscription import (
    SubscriptionPlan,
    UserSubscription,
    Payment,
    SubscriptionTier,
    SubscriptionStatus,
    PaymentStatus,
    PaymentProvider
)
from models.user import User, Swipe, Like
from models.chat import Message
from models.core import db

subscription_bp = Blueprint('subscription', __name__)
load_dotenv()


def activate_user_subscription(payment):
    """
    Activates or updates user subscription when payment is successful
    """
    try:
        user = payment.user
        plan = payment.plan

        if not user or not plan:
            print(f"Invalid user or plan for payment {payment.public_id}")
            return False

        current_sub = user.current_subscription

        if current_sub:
            # Upgrade existing subscription
            current_sub.plan_id = plan.id
            current_sub.billing_cycle = payment.billing_cycle
            current_sub.status = SubscriptionStatus.ACTIVE
            current_sub.auto_renew = True
            current_sub.renew(payment.billing_cycle)
            print(f"Updated existing subscription for user {user.public_id}")
        else:
            # Create new subscription
            cycle_days = 365 if payment.billing_cycle == "yearly" else plan.billing_cycle_days
            new_subscription = UserSubscription(
                user_id=user.id,
                plan_id=plan.id,
                status=SubscriptionStatus.ACTIVE,
                billing_cycle=payment.billing_cycle,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=cycle_days),
                auto_renew=True
            )
            db.session.add(new_subscription)
            print(f"Created new subscription for user {user.public_id}")

        db.session.commit()
        return True

    except Exception as e:
        db.session.rollback()
        print(f"Error activating subscription: {str(e)}")
        return False


# =============================================================================
# SUBSCRIPTION ROUTES
# =============================================================================

@subscription_bp.route("/plans", methods=["GET"])
@jwt_required()
def get_subscription_plans():
    """
    Get all available subscription plans
    Returns active plans with pricing and features
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        # Get all active subscription plans
        plans = SubscriptionPlan.query.filter_by(is_active=True).order_by(
            SubscriptionPlan.monthly_price.asc()
        ).all()

        plans_data = [plan.to_dict() for plan in plans]

        # Get user's current subscription for context
        current_sub_data = None
        if current_user.current_subscription:
            current_sub_data = current_user.current_subscription.to_dict()

        return jsonify({
            "success": True,
            "plans": plans_data,
            "current_subscription": current_sub_data,
            "total_plans": len(plans_data)
        }), 200

    except Exception as e:
        print(f"Error fetching subscription plans: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch subscription plans"
        }), 500


@subscription_bp.route("/plans/<string:plan_id>", methods=["GET"])
@jwt_required()
def get_subscription_plan(plan_id):
    """
    Get specific subscription plan details
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        plan = SubscriptionPlan.query.filter_by(public_id=plan_id, is_active=True).first()

        if not plan:
            return jsonify({
                "success": False,
                "message": "Subscription plan not found"
            }), 404

        return jsonify({
            "success": True,
            "plan": plan.to_dict()
        }), 200

    except Exception as e:
        print(f"Error fetching subscription plan: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch subscription plan"
        }), 500


@subscription_bp.route("/plans", methods=["POST"])
@jwt_required()
def create_subscription_plan():
    """
    Create a new subscription plan (Admin only)
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Check if user is admin
    if not current_user.is_admin:
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403

    data = request.json or {}

    # Validate required fields
    required_fields = ['name', 'tier', 'monthly_price', 'yearly_price']
    for field in required_fields:
        if field not in data:
            return jsonify({
                "success": False,
                "message": f"Missing required field: {field}"
            }), 400

    try:
        # Validate tier
        try:
            tier = SubscriptionTier(data['tier'])
        except ValueError:
            return jsonify({
                "success": False,
                "message": f"Invalid tier. Must be one of: {[t.value for t in SubscriptionTier]}"
            }), 400

        # Create new plan
        plan = SubscriptionPlan(
            name=data['name'],
            tier=tier,
            description=data.get('description'),
            monthly_price=float(data['monthly_price']),
            yearly_price=float(data['yearly_price']),
            currency=data.get('currency', 'NGN'),
            billing_cycle_days=data.get('billing_cycle_days', 30),
            max_messages=data.get('max_messages', 50),
            max_likes=data.get('max_likes', 100),
            max_swipes=data.get('max_swipes', 200),
            has_advanced_filters=data.get('has_advanced_filters', False),
            has_priority_matching=data.get('has_priority_matching', False),
            has_read_receipts=data.get('has_read_receipts', False),
            has_verified_badge=data.get('has_verified_badge', False),
            can_see_who_liked_you=data.get('can_see_who_liked_you', False),
            can_rewind_swipes=data.get('can_rewind_swipes', False),
            has_incognito_mode=data.get('has_incognito_mode', False),
            is_active=data.get('is_active', True),
            is_popular=data.get('is_popular', False)
        )

        db.session.add(plan)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Subscription plan created successfully",
            "plan": plan.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating subscription plan: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to create subscription plan"
        }), 500


@subscription_bp.route("/plans/<string:plan_id>", methods=["PUT"])
@jwt_required()
def update_subscription_plan(plan_id):
    """
    Update a subscription plan (Admin only)
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Check if user is admin
    if not current_user.is_admin:
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403

    try:
        plan = SubscriptionPlan.query.filter_by(public_id=plan_id).first()

        if not plan:
            return jsonify({
                "success": False,
                "message": "Subscription plan not found"
            }), 404

        data = request.json or {}

        # Update fields if provided
        updatable_fields = [
            'name', 'description', 'monthly_price', 'yearly_price', 'currency',
            'billing_cycle_days', 'max_messages', 'max_likes', 'max_swipes',
            'has_advanced_filters', 'has_priority_matching', 'has_read_receipts',
            'has_verified_badge', 'can_see_who_liked_you', 'can_rewind_swipes',
            'has_incognito_mode', 'is_active', 'is_popular'
        ]

        for field in updatable_fields:
            if field in data:
                setattr(plan, field, data[field])

        # Handle tier separately with validation
        if 'tier' in data:
            try:
                plan.tier = SubscriptionTier(data['tier'])
            except ValueError:
                return jsonify({
                    "success": False,
                    "message": f"Invalid tier. Must be one of: {[t.value for t in SubscriptionTier]}"
                }), 400

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Subscription plan updated successfully",
            "plan": plan.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error updating subscription plan: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to update subscription plan"
        }), 500


@subscription_bp.route("/plans/<string:plan_id>", methods=["DELETE"])
@jwt_required()
def delete_subscription_plan(plan_id):
    """
    Delete a subscription plan (Admin only) - Soft delete by deactivating
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Check if user is admin
    if not current_user.is_admin:
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403

    try:
        plan = SubscriptionPlan.query.filter_by(public_id=plan_id).first()

        if not plan:
            return jsonify({
                "success": False,
                "message": "Subscription plan not found"
            }), 404

        # Check if plan is being used by any active subscriptions
        active_subscriptions = UserSubscription.query.filter_by(
            plan_id=plan.id
        ).filter(
            UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL])
        ).count()

        if active_subscriptions > 0:
            return jsonify({
                "success": False,
                "message": "Cannot delete plan with active subscriptions. Deactivate it instead."
            }), 400

        # Soft delete by deactivating
        plan.is_active = False
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Subscription plan deactivated successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting subscription plan: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to delete subscription plan"
        }), 500


@subscription_bp.route("/plans/<string:plan_id>/activate", methods=["PATCH"])
@jwt_required()
def activate_subscription_plan(plan_id):
    """
    Activate a subscription plan (Admin only)
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    # Check if user is admin
    if not current_user.is_admin:
        return jsonify({
            "success": False,
            "message": "Admin access required"
        }), 403

    try:
        plan = SubscriptionPlan.query.filter_by(public_id=plan_id).first()

        if not plan:
            return jsonify({
                "success": False,
                "message": "Subscription plan not found"
            }), 404

        plan.is_active = True
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Subscription plan activated successfully",
            "plan": plan.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error activating subscription plan: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to activate subscription plan"
        }), 500


@subscription_bp.route("/current", methods=["GET"])
@jwt_required()
def get_current_subscription():
    """
    Get current user's active subscription with usage details
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        if not current_user.current_subscription:
            # Return free plan details
            free_plan = SubscriptionPlan.query.filter_by(tier=SubscriptionTier.FREE).first()
            return jsonify({
                "success": True,
                "has_subscription": False,
                "current_plan": free_plan.to_dict() if free_plan else None,
                "message": "You are on the free plan"
            }), 200

        subscription_data = current_user.current_subscription.to_dict()

        return jsonify({
            "success": True,
            "has_subscription": True,
            "subscription": subscription_data
        }), 200

    except Exception as e:
        print(f"Error fetching current subscription: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch subscription details"
        }), 500


@subscription_bp.route("/subscribe", methods=["POST"])
@jwt_required()
def create_subscription():
    """
    Create a subscription directly in UserSubscription table
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    data = request.json or {}
    plan_id = data.get("plan_id")
    billing_cycle = data.get("billing_cycle", "monthly")
    transaction_reference = data.get("transaction_reference")
    flutterwave_transaction_id = data.get("flutterwave_transaction_id")
    amount = data.get("amount")

    if not plan_id:
        return jsonify({
            "success": False,
            "message": "Plan ID is required"
        }), 400

    try:
        # Get the selected plan
        plan = SubscriptionPlan.query.filter_by(public_id=plan_id, is_active=True).first()
        if not plan:
            return jsonify({
                "success": False,
                "message": "Subscription plan not found"
            }), 404

        # Calculate cycle days
        cycle_days = 365 if billing_cycle == "yearly" else plan.billing_cycle_days
        
        # Check if user already has an active subscription
        current_subscription = current_user.current_subscription
        
        if current_subscription:
            # Update existing subscription
            current_subscription.plan_id = plan.id
            current_subscription.billing_cycle = billing_cycle
            current_subscription.status = SubscriptionStatus.ACTIVE
            current_subscription.auto_renew = True
            current_subscription.start_date = datetime.utcnow()
            current_subscription.end_date = datetime.utcnow() + timedelta(days=cycle_days)
            current_subscription.messages_used = 0
            current_subscription.likes_used = 0
            current_subscription.swipes_used = 0
            
            subscription = current_subscription
            action = "updated"
        else:
            # Create new subscription directly in UserSubscription table
            subscription = UserSubscription(
                user_id=current_user.id,
                plan_id=plan.id,
                status=SubscriptionStatus.ACTIVE,
                billing_cycle=billing_cycle,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=cycle_days),
                auto_renew=True,
                messages_used=0,
                likes_used=0,
                swipes_used=0
            )
            db.session.add(subscription)
            action = "created"

        # Create a minimal payment record for tracking (optional)
        if transaction_reference or flutterwave_transaction_id:
            payment = Payment(
                user_id=current_user.id,
                plan_id=plan.id,
                amount=amount if amount else (float(plan.yearly_price) if billing_cycle == "yearly" else float(plan.monthly_price)),
                billing_cycle=billing_cycle,
                provider=PaymentProvider.FLUTTERWAVE,
                status=PaymentStatus.COMPLETED,
                provider_payment_id=flutterwave_transaction_id,
                provider_reference=transaction_reference,
                paid_at=datetime.utcnow()
            )
            db.session.add(payment)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": f"Subscription {action} successfully",
            "subscription": subscription.to_dict(),
            "plan_name": plan.name,
            "billing_cycle": billing_cycle,
            "end_date": subscription.end_date.isoformat() + "Z"
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error creating subscription: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to create subscription"
        }), 500


@subscription_bp.route("/cancel", methods=["POST"])
@jwt_required()
def cancel_subscription():
    """
    Cancel auto-renewal for current subscription
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        if not current_user.current_subscription:
            return jsonify({
                "success": False,
                "message": "No active subscription found"
            }), 404

        subscription = current_user.current_subscription

        if subscription.status == SubscriptionStatus.CANCELED:
            return jsonify({
                "success": True,
                "message": "Subscription is already canceled"
            }), 200

        subscription.cancel()
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Subscription canceled successfully",
            "subscription": subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error canceling subscription: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to cancel subscription"
        }), 500


@subscription_bp.route("/payments/<string:payment_id>/confirm", methods=["POST"])
@jwt_required()
def confirm_payment(payment_id):
    """
    Confirm and process payment after successful frontend payment
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    data = request.json or {}
    provider_payment_id = data.get("provider_payment_id")
    provider_reference = data.get("provider_reference")

    try:
        # Find payment record
        payment = Payment.query.filter_by(public_id=payment_id, user_id=current_user.id).first()
        if not payment:
            return jsonify({
                "success": False,
                "message": "Payment not found"
            }), 404

        if payment.status == PaymentStatus.COMPLETED:
            return jsonify({
                "success": True,
                "message": "Payment already confirmed",
                "payment_id": payment.public_id
            }), 200

        # Mark payment as completed
        payment.mark_completed(provider_payment_id, provider_reference)

        # Create or update subscription
        current_sub = current_user.current_subscription
        plan = payment.plan

        if current_sub:
            # Upgrade existing subscription
            current_sub.plan_id = plan.id
            current_sub.billing_cycle = payment.billing_cycle
            current_sub.status = SubscriptionStatus.ACTIVE
            current_sub.auto_renew = True
            current_sub.renew(payment.billing_cycle)
        else:
            # Create new subscription
            cycle_days = 365 if payment.billing_cycle == "yearly" else plan.billing_cycle_days
            new_subscription = UserSubscription(
                user_id=current_user.id,
                plan_id=plan.id,
                status=SubscriptionStatus.ACTIVE,
                billing_cycle=payment.billing_cycle,
                start_date=datetime.utcnow(),
                end_date=datetime.utcnow() + timedelta(days=cycle_days),
                auto_renew=True
            )
            db.session.add(new_subscription)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Payment confirmed and subscription activated",
            "payment_id": payment.public_id,
            "subscription": current_user.current_subscription.to_dict() if current_user.current_subscription else None
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error confirming payment: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to confirm payment"
        }), 500


@subscription_bp.route("/usage", methods=["GET"])
@jwt_required()
def get_usage_stats():
    """
    Get current usage statistics for user's subscription with real backend data
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        # Get user's current subscription period dates
        subscription = current_user.current_subscription
        period_start = subscription.start_date if subscription else datetime.utcnow() - timedelta(days=30)
        period_end = subscription.end_date if subscription else datetime.utcnow()

        # Calculate real usage from database
        real_messages_sent = Message.query.filter(
            Message.sender_id == current_user.id,
            Message.timestamp >= period_start,
            Message.timestamp <= period_end
        ).count()

        real_swipes_used = Swipe.query.filter(
            Swipe.user_id == current_user.id,
            Swipe.timestamp >= period_start,
            Swipe.timestamp <= period_end
        ).count()

        real_post_likes = Like.query.filter(
            Like.user_id == current_user.id,
            Like.created_at >= period_start,
            Like.created_at <= period_end
        ).count()

        real_profile_likes = Swipe.query.filter(
            Swipe.user_id == current_user.id,
            Swipe.action == 'like',
            Swipe.timestamp >= period_start,
            Swipe.timestamp <= period_end
        ).count()

        real_total_likes = real_post_likes + real_profile_likes

        if not subscription:
            # Return free plan usage with real data
            free_plan = SubscriptionPlan.query.filter_by(tier=SubscriptionTier.FREE).first()
            return jsonify({
                "success": True,
                "usage": {
                    "messages": {
                        "used": real_messages_sent,
                        "limit": free_plan.max_messages if free_plan else 50,
                        "remaining": max(0, (free_plan.max_messages if free_plan else 50) - real_messages_sent)
                    },
                    "likes": {
                        "used": real_total_likes,
                        "limit": free_plan.max_likes if free_plan else 100,
                        "remaining": max(0, (free_plan.max_likes if free_plan else 100) - real_total_likes)
                    },
                    "swipes": {
                        "used": real_swipes_used,
                        "limit": free_plan.max_swipes if free_plan else 200,
                        "remaining": max(0, (free_plan.max_swipes if free_plan else 200) - real_swipes_used)
                    }
                },
                "real_usage_breakdown": {
                    "messages_sent": real_messages_sent,
                    "post_likes": real_post_likes,
                    "profile_likes": real_profile_likes,
                    "total_likes": real_total_likes,
                    "swipes": real_swipes_used,
                    "period_start": period_start.isoformat() + "Z",
                    "period_end": period_end.isoformat() + "Z"
                },
                "plan": free_plan.to_dict() if free_plan else None
            }), 200

        # For users with subscription
        subscription_data = subscription.to_dict()

        return jsonify({
            "success": True,
            "usage": {
                "messages": {
                    "used": real_messages_sent,
                    "limit": subscription.plan.max_messages,
                    "remaining": subscription.get_remaining_messages()
                },
                "likes": {
                    "used": real_total_likes,
                    "limit": subscription.plan.max_likes,
                    "remaining": subscription.get_remaining_likes()
                },
                "swipes": {
                    "used": real_swipes_used,
                    "limit": subscription.plan.max_swipes,
                    "remaining": subscription.get_remaining_swipes()
                }
            },
            "real_usage_breakdown": {
                "messages_sent": real_messages_sent,
                "post_likes": real_post_likes,
                "profile_likes": real_profile_likes,
                "total_likes": real_total_likes,
                "swipes": real_swipes_used,
                "period_start": period_start.isoformat() + "Z",
                "period_end": period_end.isoformat() + "Z"
            },
            "subscription_usage": {
                "messages_used_in_subscription": subscription.messages_used,
                "likes_used_in_subscription": subscription.likes_used,
                "swipes_used_in_subscription": subscription.swipes_used
            },
            "plan": subscription_data.get("plan", {}),
            "days_remaining": subscription_data.get("days_remaining", 0)
        }), 200

    except Exception as e:
        print(f"Error fetching usage stats: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch usage statistics"
        }), 500


@subscription_bp.route("/payments/<string:payment_id>/status", methods=["GET"])
@jwt_required()
def get_payment_status(payment_id):
    """
    Get payment status for frontend polling
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        payment = Payment.query.filter_by(public_id=payment_id, user_id=current_user.id).first()
        if not payment:
            return jsonify({"success": False, "message": "Payment not found"}), 404

        # If payment is completed, include subscription info
        subscription_data = None
        if payment.status == PaymentStatus.COMPLETED and current_user.current_subscription:
            subscription_data = current_user.current_subscription.to_dict()

        return jsonify({
            "success": True,
            "payment": {
                "id": payment.public_id,
                "status": payment.status.value,
                "amount": payment.amount,
                "billing_cycle": payment.billing_cycle,
                "created_at": payment.created_at.isoformat() + "Z",
                "failure_reason": payment.failure_reason,
                "provider_reference": payment.provider_reference
            },
            "has_subscription": current_user.current_subscription is not None,
            "subscription": subscription_data
        }), 200

    except Exception as e:
        print(f"Error fetching payment status: {str(e)}")
        return jsonify({"success": False, "message": "Failed to fetch payment status"}), 500



@subscription_bp.route("/user/<string:user_id>", methods=["GET"])
@jwt_required()
def get_user_subscription(user_id):
    """
    Get subscription details for a specific user
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        # Get the target user
        target_user = User.query.get(user_id)
        if not target_user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        if not target_user.current_subscription:
            # Return free plan details
            free_plan = SubscriptionPlan.query.filter_by(tier=SubscriptionTier.FREE).first()
            return jsonify({
                "success": True,
                "user_id": target_user.id,
                "username": target_user.username,
                "name": target_user.name,
                "has_subscription": False,
                "current_plan": free_plan.to_dict() if free_plan else None,
                "message": "User is on the free plan"
            }), 200

        subscription_data = target_user.current_subscription.to_dict()

        return jsonify({
            "success": True,
            "user_id": target_user.id,
            "username": target_user.username,
            "name": target_user.name,
            "has_subscription": True,
            "subscription": subscription_data
        }), 200

    except Exception as e:
        print(f"Error fetching user subscription: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch subscription details"
        }), 500