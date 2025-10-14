from dotenv import load_dotenv
import os
import hmac
import hashlib
import requests
from urllib.parse import urljoin
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime, timedelta
from sqlalchemy import and_, or_
from utils.security import get_current_user_from_jwt
from utils.flutterwave_client import flutterwave_client
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

# =============================================================================
# FLUTTERWAVE HELPER FUNCTIONS (UPDATED)
# =============================================================================

def init_flutterwave_payment(payment, customer_email, redirect_url):
    """
    Initializes a Flutterwave payment using the client
    """
    tx_ref = f"payment_{payment.public_id}"

    payload = {
        "tx_ref": tx_ref,
        "amount": float(payment.amount),
        "currency": "NGN",
        "redirect_url": redirect_url,
        "customer": {
            "email": customer_email,
            "name": getattr(payment.user, "name", "") if getattr(payment, "user", None) else ""
        },
        "customizations": {
            "title": "Laumeet Subscription Payment",
            "description": f"{payment.billing_cycle} subscription"
        }
    }

    try:
        response = flutterwave_client.init_payment(payload)
        flw_data = response.get("data", {})
        checkout_link = flw_data.get("link")
        provider_id = flw_data.get("id")

        return {
            "checkout_link": checkout_link,
            "provider_id": provider_id,
            "tx_ref": tx_ref,
            "response_data": response
        }
        
    except Exception as e:
        print(f"Flutterwave payment initialization failed: {e}")
        raise


def verify_flutterwave_signature(request):
    """
    Verifies webhook authenticity using the 'verif-hash' header.
    """
    secret = os.getenv("FLW_WEBHOOK_SECRET")
    if not secret:
        return False

    signature = request.headers.get("verif-hash")
    if not signature:
        return False

    raw_body = request.get_data()
    computed = hmac.new(secret.encode('utf-8'), raw_body, hashlib.sha256).hexdigest()

    return hmac.compare_digest(computed, signature)


def verify_transaction_with_flutterwave(transaction_id=None, tx_ref=None):
    """
    Calls Flutterwave API to verify transaction using the client
    """
    try:
        return flutterwave_client.verify_transaction(
            transaction_id=transaction_id,
            tx_ref=tx_ref
        )
    except Exception as e:
        print(f"Flutterwave transaction verification failed: {e}")
        raise


# =============================================================================
# SUBSCRIPTION ROUTES (WITH PROPER PAYMENT HANDLING)
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
    Create a new subscription or upgrade existing one
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    data = request.json or {}
    plan_id = data.get("plan_id")
    billing_cycle = data.get("billing_cycle", "monthly")
    payment_provider = data.get("payment_provider", PaymentProvider.FLUTTERWAVE)

    if not plan_id:
        return jsonify({
            "success": False,
            "message": "Plan ID is required"
        }), 400

    if billing_cycle not in ["monthly", "yearly"]:
        return jsonify({
            "success": False,
            "message": "Billing cycle must be 'monthly' or 'yearly'"
        }), 400

    try:
        # Get the selected plan
        plan = SubscriptionPlan.query.filter_by(public_id=plan_id, is_active=True).first()
        if not plan:
            return jsonify({
                "success": False,
                "message": "Subscription plan not found"
            }), 404

        # Calculate price based on billing cycle
        price = float(plan.yearly_price) if billing_cycle == "yearly" else float(plan.monthly_price)

        # Create payment record
        payment = Payment(
            user_id=current_user.id,
            plan_id=plan.id,
            amount=price,
            billing_cycle=billing_cycle,
            provider=payment_provider,
            status=PaymentStatus.PENDING
        )

        db.session.add(payment)
        db.session.flush()

        # For demo purposes, simulate immediate payment success
        if data.get("mock_payment", False):
            payment.mark_completed(
                provider_payment_id=f"mock_pay_{payment.public_id}",
                provider_reference=f"ref_{payment.public_id}"
            )

            # Create or update subscription
            current_sub = current_user.current_subscription
            if current_sub:
                # Upgrade existing subscription
                current_sub.plan_id = plan.id
                current_sub.billing_cycle = billing_cycle
                current_sub.status = SubscriptionStatus.ACTIVE
                current_sub.auto_renew = True
                current_sub.renew(billing_cycle)
            else:
                # Create new subscription
                cycle_days = 365 if billing_cycle == "yearly" else plan.billing_cycle_days
                new_subscription = UserSubscription(
                    user_id=current_user.id,
                    plan_id=plan.id,
                    status=SubscriptionStatus.ACTIVE,
                    billing_cycle=billing_cycle,
                    start_date=datetime.utcnow(),
                    end_date=datetime.utcnow() + timedelta(days=cycle_days),
                    auto_renew=True
                )
                db.session.add(new_subscription)

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Subscription activated successfully",
                "payment_id": payment.public_id,
                "subscription": current_user.current_subscription.to_dict() if current_user.current_subscription else None
            }), 201

        # FLUTTERWAVE PAYMENT INTEGRATION WITH CLIENT
        try:
            # Define success and failure redirect URLs
            base_redirect_url = os.getenv("FRONTEND_BASE_URL", "https://laumeet.vercel.app")
            success_redirect = f"{base_redirect_url}/payment-success?payment_id={payment.public_id}"

            # Use user's email or fallback
            customer_email = current_user.email or "laumeet@gmail.com"

            # Initialize payment using the client
            flw_result = init_flutterwave_payment(payment, customer_email, success_redirect)
            
            checkout_link = flw_result["checkout_link"]
            provider_id = flw_result["provider_id"]
            tx_ref = flw_result["tx_ref"]

            if provider_id:
                payment.provider_payment_id = str(provider_id)
                payment.provider_reference = tx_ref

            # DO NOT create subscription here - wait for webhook confirmation
            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Payment initiated successfully",
                "payment_id": payment.public_id,
                "checkout_url": checkout_link,
                "redirect_urls": {
                    "success": success_redirect,
                },
                "provider_data": {
                    "provider_id": provider_id,
                    "tx_ref": tx_ref
                }
            }), 200

        except requests.exceptions.ConnectTimeout as e:
            db.session.rollback()
            print(f"Flutterwave connection timeout: {e}")
            return jsonify({
                "success": False, 
                "message": "Payment service temporarily unavailable. Please try again."
            }), 503
            
        except requests.exceptions.Timeout as e:
            db.session.rollback()
            print(f"Flutterwave request timeout: {e}")
            return jsonify({
                "success": False,
                "message": "Payment service is taking too long to respond. Please try again."
            }), 504
            
        except Exception as e:
            db.session.rollback()
            print(f"Flutterwave payment initialization error: {e}")
            return jsonify({
                "success": False, 
                "message": "Payment initialization failed. Please try again."
            }), 500

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


@subscription_bp.route("/subscription/user/<string:user_id>", methods=["GET"])
@jwt_required()
def get_user_subscription_by_id(user_id):
    """
    Get user's subscription by user ID (Admin only)
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        # Find the user by public_id
        user = User.query.filter_by(public_id=user_id).first()
        if not user:
            return jsonify({
                "success": False,
                "message": "User not found"
            }), 404

        # Get user's current subscription
        subscription = user.current_subscription

        if not subscription:
            # Return free plan details if no subscription
            free_plan = SubscriptionPlan.query.filter_by(tier=SubscriptionTier.FREE).first()
            return jsonify({
                "success": True,
                "user_id": user.public_id,
                "username": user.username,
                "name": user.name,
                "has_subscription": False,
                "current_plan": free_plan.to_dict() if free_plan else None,
                "message": "User is on the free plan"
            }), 200

        subscription_data = subscription.to_dict()

        return jsonify({
            "success": True,
            "user_id": user.public_id,
            "username": user.username,
            "name": user.name,
            "has_subscription": True,
            "subscription": subscription_data
        }), 200

    except Exception as e:
        print(f"Error fetching user subscription: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch user subscription"
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
        # Calculate real messages sent in current period
        real_messages_sent = Message.query.filter(
            Message.sender_id == current_user.id,
            Message.timestamp >= period_start,
            Message.timestamp <= period_end
        ).count()

        # Calculate real swipes in current period
        real_swipes_used = Swipe.query.filter(
            Swipe.user_id == current_user.id,
            Swipe.timestamp >= period_start,
            Swipe.timestamp <= period_end
        ).count()

        # Calculate real post likes in current period
        real_post_likes = Like.query.filter(
            Like.user_id == current_user.id,
            Like.created_at >= period_start,
            Like.created_at <= period_end
        ).count()

        # Calculate real profile likes (swipes with action='like') in current period
        real_profile_likes = Swipe.query.filter(
            Swipe.user_id == current_user.id,
            Swipe.action == 'like',
            Swipe.timestamp >= period_start,
            Swipe.timestamp <= period_end
        ).count()

        # Total likes (post likes + profile likes)
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


@subscription_bp.route("/usage/sync", methods=["POST"])
@jwt_required()
def sync_usage():
    """
    Manually sync subscription usage with real backend data
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
        real_usage = subscription.sync_usage_from_backend()

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Usage synced successfully",
            "real_usage": real_usage,
            "subscription_usage": {
                "messages_used": subscription.messages_used,
                "likes_used": subscription.likes_used,
                "swipes_used": subscription.swipes_used
            }
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error syncing usage: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to sync usage"
        }), 500


@subscription_bp.route("/usage/summary", methods=["GET"])
@jwt_required()
def get_usage_summary():
    """
    Get comprehensive usage summary with real data
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        if not current_user.current_subscription:
            # Return free plan summary
            free_plan = SubscriptionPlan.query.filter_by(tier=SubscriptionTier.FREE).first()

            # Calculate real usage for free plan
            period_start = datetime.utcnow() - timedelta(days=30)
            period_end = datetime.utcnow()

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

            return jsonify({
                "success": True,
                "has_subscription": False,
                "summary": {
                    "plan_info": {
                        "name": free_plan.name if free_plan else "Free Plan",
                        "tier": "free",
                        "status": "active"
                    },
                    "real_usage": {
                        "messages": real_messages_sent,
                        "likes": real_total_likes,
                        "swipes": real_swipes_used
                    },
                    "limits": {
                        "messages": free_plan.max_messages if free_plan else 50,
                        "likes": free_plan.max_likes if free_plan else 100,
                        "swipes": free_plan.max_swipes if free_plan else 200
                    },
                    "remaining": {
                        "messages": max(0, (free_plan.max_messages if free_plan else 50) - real_messages_sent),
                        "likes": max(0, (free_plan.max_likes if free_plan else 100) - real_total_likes),
                        "swipes": max(0, (free_plan.max_swipes if free_plan else 200) - real_swipes_used)
                    },
                    "breakdown": {
                        "post_likes": real_post_likes,
                        "profile_likes": real_profile_likes,
                        "total_likes": real_total_likes
                    }
                }
            }), 200

        # For users with subscription
        subscription = current_user.current_subscription
        usage_summary = subscription.get_usage_summary()

        return jsonify({
            "success": True,
            "has_subscription": True,
            "summary": usage_summary
        }), 200

    except Exception as e:
        print(f"Error fetching usage summary: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch usage summary"
        }), 500


@subscription_bp.route("/payments/<string:payment_id>/confirm", methods=["POST"])
@jwt_required()
def confirm_payment(payment_id):
    """
    Confirm and process payment after successful payment gateway callback
    This would typically be called by payment webhook
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


@subscription_bp.route("/reactivate", methods=["POST"])
@jwt_required()
def reactivate_subscription():
    """
    Reactivate canceled subscription or renew expired one
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    data = request.json or {}
    billing_cycle = data.get("billing_cycle", "monthly")

    try:
        # Get user's most recent subscription
        subscription = UserSubscription.query.filter_by(
            user_id=current_user.id
        ).order_by(UserSubscription.created_at.desc()).first()

        if not subscription:
            return jsonify({
                "success": False,
                "message": "No subscription found to reactivate"
            }), 404

        if subscription.is_active():
            return jsonify({
                "success": False,
                "message": "Subscription is already active"
            }), 400

        # Reactivate subscription
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.auto_renew = True
        subscription.renew(billing_cycle)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Subscription reactivated successfully",
            "subscription": subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error reactivating subscription: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to reactivate subscription"
        }), 500


@subscription_bp.route("/payments", methods=["GET"])
@jwt_required()
def get_payment_history():
    """
    Get user's payment history
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)

        payments = Payment.query.filter_by(user_id=current_user.id).order_by(
            Payment.created_at.desc()
        ).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        payments_data = [payment.to_dict() for payment in payments.items]

        return jsonify({
            "success": True,
            "payments": payments_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": payments.total,
                "pages": payments.pages
            }
        }), 200

    except Exception as e:
        print(f"Error fetching payment history: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch payment history"
        }), 500


@subscription_bp.route("/admin/subscriptions", methods=["GET"])
@jwt_required()
def get_all_subscriptions():
    """
    Get all subscriptions across all users (Admin only)
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
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        status_filter = request.args.get("status")
        tier_filter = request.args.get("tier")

        query = UserSubscription.query.join(SubscriptionPlan)

        if status_filter:
            try:
                status = SubscriptionStatus(status_filter)
                query = query.filter(UserSubscription.status == status)
            except ValueError:
                return jsonify({
                    "success": False,
                    "message": f"Invalid status filter. Must be one of: {[s.value for s in SubscriptionStatus]}"
                }), 400

        if tier_filter:
            try:
                tier = SubscriptionTier(tier_filter)
                query = query.filter(SubscriptionPlan.tier == tier)
            except ValueError:
                return jsonify({
                    "success": False,
                    "message": f"Invalid tier filter. Must be one of: {[t.value for t in SubscriptionTier]}"
                }), 400

        subscriptions = query.order_by(UserSubscription.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        subscriptions_data = []
        for subscription in subscriptions.items:
            sub_data = subscription.to_dict()
            sub_data["user_info"] = {
                "user_id": subscription.user.public_id,
                "username": subscription.user.username,
                "name": subscription.user.name,
                "email": subscription.user.email
            }
            subscriptions_data.append(sub_data)

        return jsonify({
            "success": True,
            "subscriptions": subscriptions_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": subscriptions.total,
                "pages": subscriptions.pages
            }
        }), 200

    except Exception as e:
        print(f"Error fetching all subscriptions: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch subscriptions"
        }), 500


@subscription_bp.route("/admin/payments", methods=["GET"])
@jwt_required()
def get_all_payments():
    """
    Get all payments across all users (Admin only)
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
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 20, type=int)
        status_filter = request.args.get("status")

        query = Payment.query

        if status_filter:
            try:
                status = PaymentStatus(status_filter)
                query = query.filter(Payment.status == status)
            except ValueError:
                return jsonify({
                    "success": False,
                    "message": f"Invalid status filter. Must be one of: {[s.value for s in PaymentStatus]}"
                }), 400

        payments = query.order_by(Payment.created_at.desc()).paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        payments_data = []
        for payment in payments.items:
            payment_data = payment.to_dict()
            payment_data["user_info"] = {
                "user_id": payment.user.public_id,
                "username": payment.user.username,
                "name": payment.user.name,
                "email": payment.user.email
            }
            payments_data.append(payment_data)

        return jsonify({
            "success": True,
            "payments": payments_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": payments.total,
                "pages": payments.pages
            }
        }), 200

    except Exception as e:
        print(f"Error fetching all payments: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch payments"
        }), 500


@subscription_bp.route("/admin/metrics", methods=["GET"])
@jwt_required()
def get_subscription_metrics():
    """
    Get subscription metrics for admin dashboard
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
        # Total active subscriptions
        total_active = UserSubscription.query.filter_by(status=SubscriptionStatus.ACTIVE).count()

        # Total canceled subscriptions
        total_canceled = UserSubscription.query.filter_by(status=SubscriptionStatus.CANCELED).count()

        # Total expired subscriptions
        total_expired = UserSubscription.query.filter_by(status=SubscriptionStatus.EXPIRED).count()

        # Total revenue (sum of completed payments)
        total_revenue = db.session.query(db.func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.COMPLETED
        ).scalar() or 0

        # Monthly recurring revenue (MRR)
        current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        mrr = db.session.query(db.func.sum(Payment.amount)).filter(
            Payment.status == PaymentStatus.COMPLETED,
            Payment.created_at >= current_month_start
        ).scalar() or 0

        # Subscription distribution by tier
        tier_distribution = db.session.query(
            SubscriptionPlan.tier,
            db.func.count(UserSubscription.id)
        ).join(
            UserSubscription, UserSubscription.plan_id == SubscriptionPlan.id
        ).filter(
            UserSubscription.status == SubscriptionStatus.ACTIVE
        ).group_by(SubscriptionPlan.tier).all()

        tier_data = {tier.value: count for tier, count in tier_distribution}

        # Recent payments (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_payments_count = Payment.query.filter(
            Payment.created_at >= thirty_days_ago,
            Payment.status == PaymentStatus.COMPLETED
        ).count()

        return jsonify({
            "success": True,
            "metrics": {
                "total_active_subscriptions": total_active,
                "total_canceled_subscriptions": total_canceled,
                "total_expired_subscriptions": total_expired,
                "total_revenue": float(total_revenue),
                "monthly_recurring_revenue": float(mrr),
                "recent_payments_count": recent_payments_count,
                "tier_distribution": tier_data
            }
        }), 200

    except Exception as e:
        print(f"Error fetching subscription metrics: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to fetch subscription metrics"
        }), 500


@subscription_bp.route("/webhook/flutterwave", methods=["POST"])
def flutterwave_webhook():
    """
    Handle Flutterwave payment webhook notifications
    """
    try:
        # Verify webhook signature
        if not verify_flutterwave_signature(request):
            print("Invalid Flutterwave webhook signature")
            return jsonify({"status": "error", "message": "Invalid signature"}), 401

        payload = request.get_json()
        event_type = payload.get("event")
        data = payload.get("data", {})

        print(f"Flutterwave webhook received: {event_type}")

        if event_type == "charge.completed":
            # Payment was successful
            tx_ref = data.get("tx_ref")
            transaction_id = data.get("id")
            status = data.get("status")
            amount = data.get("amount")
            currency = data.get("currency")

            if status == "successful":
                # Verify transaction with Flutterwave
                verification = verify_transaction_with_flutterwave(transaction_id=transaction_id)
                if not verification or verification.get("data", {}).get("status") != "successful":
                    print(f"Transaction verification failed for {transaction_id}")
                    return jsonify({"status": "error", "message": "Verification failed"}), 400

                # Find payment by tx_ref
                payment = Payment.query.filter_by(provider_reference=tx_ref).first()
                if not payment:
                    print(f"Payment not found for tx_ref: {tx_ref}")
                    return jsonify({"status": "error", "message": "Payment not found"}), 404

                if payment.status == PaymentStatus.COMPLETED:
                    print(f"Payment already completed: {payment.public_id}")
                    return jsonify({"status": "success", "message": "Already processed"}), 200

                # Mark payment as completed
                payment.mark_completed(
                    provider_payment_id=str(transaction_id),
                    provider_reference=tx_ref
                )

                # Create or update subscription
                user = payment.user
                plan = payment.plan
                current_sub = user.current_subscription

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
                        user_id=user.id,
                        plan_id=plan.id,
                        status=SubscriptionStatus.ACTIVE,
                        billing_cycle=payment.billing_cycle,
                        start_date=datetime.utcnow(),
                        end_date=datetime.utcnow() + timedelta(days=cycle_days),
                        auto_renew=True
                    )
                    db.session.add(new_subscription)

                db.session.commit()
                print(f"Payment completed and subscription activated: {payment.public_id}")

        elif event_type in ["charge.failed", "transfer.failed"]:
            # Payment failed - update payment status
            tx_ref = data.get("tx_ref")
            payment = Payment.query.filter_by(provider_reference=tx_ref).first()
            if payment and payment.status == PaymentStatus.PENDING:
                payment.status = PaymentStatus.FAILED
                payment.failure_reason = data.get("failure_reason", "Payment failed")
                db.session.commit()
                print(f"Payment marked as failed: {payment.public_id}")

        elif event_type == "charge.cancelled":
            # User cancelled the payment
            tx_ref = data.get("tx_ref")
            payment = Payment.query.filter_by(provider_reference=tx_ref).first()
            if payment and payment.status == PaymentStatus.PENDING:
                payment.status = PaymentStatus.CANCELLED
                payment.failure_reason = "Cancelled by user"
                db.session.commit()
                print(f"Payment cancelled by user: {payment.public_id}")

        return jsonify({"status": "success"}), 200

    except Exception as e:
        print(f"Error processing Flutterwave webhook: {str(e)}")
        db.session.rollback()
        return jsonify({"status": "error", "message": "Webhook processing failed"}), 500


@subscription_bp.route("/payments/<string:payment_id>/verify", methods=["POST"])
@jwt_required()
def verify_payment(payment_id):
    """
    Manually verify payment status with Flutterwave using the client
    """
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    try:
        payment = Payment.query.filter_by(public_id=payment_id, user_id=current_user.id).first()
        if not payment:
            return jsonify({"success": False, "message": "Payment not found"}), 404

        if payment.status == PaymentStatus.COMPLETED:
            return jsonify({"success": True, "message": "Payment already completed"}), 200

        # Verify with Flutterwave using the client
        try:
            if payment.provider_payment_id:
                verification = flutterwave_client.verify_transaction(
                    transaction_id=payment.provider_payment_id
                )
            elif payment.provider_reference:
                verification = flutterwave_client.verify_transaction(
                    tx_ref=payment.provider_reference
                )
            else:
                return jsonify({"success": False, "message": "No provider reference found"}), 400

            if not verification:
                return jsonify({"success": False, "message": "Verification failed"}), 400

            data = verification.get("data", {})
            if data.get("status") == "successful":
                # Mark payment as completed
                payment.mark_completed(
                    provider_payment_id=str(data.get("id")),
                    provider_reference=data.get("tx_ref")
                )

                # Create or update subscription
                plan = payment.plan
                current_sub = current_user.current_subscription

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
                    "message": "Payment verified and subscription activated",
                    "payment_id": payment.public_id
                }), 200
            else:
                return jsonify({
                    "success": False,
                    "message": f"Payment status: {data.get('status')}",
                    "status": data.get("status")
                }), 400

        except requests.exceptions.RequestException as e:
            print(f"Flutterwave verification API error: {e}")
            return jsonify({
                "success": False,
                "message": "Payment service temporarily unavailable. Please try again later."
            }), 503

    except Exception as e:
        db.session.rollback()
        print(f"Error verifying payment: {str(e)}")
        return jsonify({"success": False, "message": "Payment verification failed"}), 500


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

        return jsonify({
            "success": True,
            "payment": {
                "id": payment.public_id,
                "status": payment.status.value,
                "amount": payment.amount,
                "billing_cycle": payment.billing_cycle,
                "created_at": payment.created_at.isoformat() + "Z",
                "failure_reason": payment.failure_reason
            },
            "has_subscription": current_user.current_subscription is not None
        }), 200

    except Exception as e:
        print(f"Error fetching payment status: {str(e)}")
        return jsonify({"success": False, "message": "Failed to fetch payment status"}), 500