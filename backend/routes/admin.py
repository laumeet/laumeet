from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, desc, and_, or_
from datetime import datetime, timedelta
from models.user import User, Picture, Swipe, TokenBlocklist
from models.chat import Conversation, Message
from models.subscription import (
    SubscriptionPlan, 
    UserSubscription, 
    Payment,
    SubscriptionTier,
    SubscriptionStatus,
    PaymentStatus
)
from models.core import db

admin_bp = Blueprint('admin', __name__)

@admin_bp.route("/admin/users", methods=["GET"])
@jwt_required()
def get_all_users():
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # if not current_user.is_admin:
    #     return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

    # Pagination parameters
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    subscription_filter = request.args.get('subscription', 'all')
    sort_by = request.args.get('sort_by', 'created_at')
    sort_order = request.args.get('sort_order', 'desc')

    # Base query
    query = User.query

    # Search filter
    if search:
        search_filter = or_(
            User.username.ilike(f'%{search}%'),
            User.name.ilike(f'%{search}%'),
            User.department.ilike(f'%{search}%')
        )
        query = query.filter(search_filter)

    # Subscription filter
    if subscription_filter != 'all':
        if subscription_filter == 'free':
            # Users with no active premium subscription
            sub_query = UserSubscription.query.filter(
                and_(
                    UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
                    UserSubscription.end_date > datetime.utcnow(),
                    SubscriptionPlan.tier != SubscriptionTier.FREE
                )
            ).join(SubscriptionPlan).subquery()
            
            query = query.filter(
                ~User.id.in_([sub.c.user_id for sub in sub_query])
            )
        else:
            # Filter by subscription tier
            query = query.join(UserSubscription).join(SubscriptionPlan).filter(
                and_(
                    UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
                    UserSubscription.end_date > datetime.utcnow(),
                    SubscriptionPlan.tier == subscription_filter
                )
            )

    # Sorting
    if sort_by == 'created_at':
        order_column = User.timestamp
    elif sort_by == 'last_seen':
        order_column = User.last_seen
    elif sort_by == 'username':
        order_column = User.username
    elif sort_by == 'subscription':
        # Complex sort for subscription tier
        query = query.outerjoin(
            UserSubscription, 
            and_(
                UserSubscription.user_id == User.id,
                UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
                UserSubscription.end_date > datetime.utcnow()
            )
        ).outerjoin(SubscriptionPlan)
        order_column = SubscriptionPlan.monthly_price
    else:
        order_column = User.timestamp

    if sort_order == 'desc':
        query = query.order_by(desc(order_column))
    else:
        query = query.order_by(order_column)

    # Pagination
    pagination = query.paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )

    # Enhanced user data with subscription info
    users_data = []
    for user in pagination.items:
        user_dict = user.to_dict()
        
        # Add subscription information
        current_sub = user.current_subscription
        if current_sub and current_sub.is_active():
            user_dict['subscription'] = {
                'plan_name': current_sub.plan.name,
                'tier': current_sub.plan.tier,
                'status': current_sub.status,
                'billing_cycle': current_sub.billing_cycle,
                'start_date': current_sub.start_date.isoformat() + "Z",
                'end_date': current_sub.end_date.isoformat() + "Z",
                'days_remaining': current_sub.get_days_remaining(),
                'auto_renew': current_sub.auto_renew
            }
            user_dict['usage'] = {
                'messages_used': current_sub.messages_used,
                'messages_limit': current_sub.plan.max_messages,
                'likes_used': current_sub.likes_used,
                'likes_limit': current_sub.plan.max_likes,
                'swipes_used': current_sub.swipes_used,
                'swipes_limit': current_sub.plan.max_swipes
            }
        else:
            user_dict['subscription'] = {
                'plan_name': 'Free',
                'tier': 'free',
                'status': 'active',
                'billing_cycle': 'monthly'
            }
            free_plan = SubscriptionPlan.query.filter_by(tier=SubscriptionTier.FREE).first()
            if free_plan:
                user_dict['usage'] = {
                    'messages_used': 0,
                    'messages_limit': free_plan.max_messages,
                    'likes_used': 0,
                    'likes_limit': free_plan.max_likes,
                    'swipes_used': 0,
                    'swipes_limit': free_plan.max_swipes
                }

        # Add payment history summary
        total_payments = Payment.query.filter_by(user_id=user.id).count()
        successful_payments = Payment.query.filter_by(
            user_id=user.id, 
            status=PaymentStatus.COMPLETED
        ).count()
        total_revenue = db.session.query(
            func.sum(Payment.amount)
        ).filter(
            Payment.user_id == user.id,
            Payment.status == PaymentStatus.COMPLETED
        ).scalar() or 0

        user_dict['payment_summary'] = {
            'total_payments': total_payments,
            'successful_payments': successful_payments,
            'total_revenue': float(total_revenue)
        }

        users_data.append(user_dict)

    # Subscription statistics
    total_users = User.query.count()
    premium_users = UserSubscription.query.join(SubscriptionPlan).filter(
        and_(
            UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
            UserSubscription.end_date > datetime.utcnow(),
            SubscriptionPlan.tier != SubscriptionTier.FREE
        )
    ).count()
    free_users = total_users - premium_users

    # Revenue statistics
    total_revenue = db.session.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.status == PaymentStatus.COMPLETED
    ).scalar() or 0

    monthly_revenue = db.session.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.status == PaymentStatus.COMPLETED,
        Payment.created_at >= datetime.utcnow() - timedelta(days=30)
    ).scalar() or 0

    return jsonify({
        "success": True,
        "users": users_data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_pages": pagination.pages,
            "total_users": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev
        },
        "statistics": {
            "total_users": total_users,
            "premium_users": premium_users,
            "free_users": free_users,
            "premium_percentage": round((premium_users / total_users * 100), 2) if total_users > 0 else 0,
            "total_revenue": float(total_revenue),
            "monthly_revenue": float(monthly_revenue),
            "arpu": round(float(total_revenue) / total_users, 2) if total_users > 0 else 0
        },
        "filters": {
            "search": search,
            "subscription": subscription_filter,
            "sort_by": sort_by,
            "sort_order": sort_order
        }
    }), 200


@admin_bp.route("/admin/users/<string:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    """Delete a user and all associated data"""
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # if not current_user.is_admin:
    #     return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

    try:
        # Find the user to delete
        user_to_delete = User.query.filter_by(public_id=user_id).first()
        
        if not user_to_delete:
            return jsonify({"success": False, "message": "User not found"}), 404

        # Prevent admin from deleting themselves
        if user_to_delete.id == current_user.id:
            return jsonify({"success": False, "message": "Cannot delete your own account"}), 400

        user_id_to_delete = user_to_delete.id

        # Delete user data in the correct order to avoid foreign key constraints
        # 1. Delete token blacklist entries
        TokenBlocklist.query.filter_by(user_id=user_id_to_delete).delete()
        
        # 2. Delete messages (both sent and received in conversations)
        user_conversations = Conversation.query.filter(
            or_(
                Conversation.user1_id == user_id_to_delete,
                Conversation.user2_id == user_id_to_delete
            )
        ).all()
        
        for conversation in user_conversations:
            Message.query.filter_by(conversation_id=conversation.id).delete()
            db.session.delete(conversation)
        
        # 3. Delete swipes (both sent and received)
        Swipe.query.filter(
            or_(
                Swipe.user_id == user_id_to_delete,
                Swipe.target_user_id == user_id_to_delete
            )
        ).delete()
        
        # 4. Delete subscription data
        UserSubscription.query.filter_by(user_id=user_id_to_delete).delete()
        Payment.query.filter_by(user_id=user_id_to_delete).delete()
        
        # 5. Delete pictures
        Picture.query.filter_by(user_id=user_id_to_delete).delete()
        
        # 6. Finally delete the user
        db.session.delete(user_to_delete)
        
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "User and all associated data deleted successfully"
        }), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error deleting user: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Failed to delete user: {str(e)}"
        }), 500


@admin_bp.route("/admin/subscriptions", methods=["GET"])
@jwt_required()
def get_all_subscriptions():
    """Get all subscriptions with detailed information"""
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # if not current_user.is_admin:
    #     return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

    # Pagination and filtering
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status_filter = request.args.get('status', 'all')
    tier_filter = request.args.get('tier', 'all')

    query = UserSubscription.query.join(User).join(SubscriptionPlan)

    # Status filter
    if status_filter != 'all':
        if status_filter == 'active':
            query = query.filter(
                and_(
                    UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
                    UserSubscription.end_date > datetime.utcnow()
                )
            )
        else:
            query = query.filter(UserSubscription.status == status_filter)

    # Tier filter
    if tier_filter != 'all':
        query = query.filter(SubscriptionPlan.tier == tier_filter)

    # Pagination
    pagination = query.order_by(desc(UserSubscription.created_at)).paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )

    subscriptions_data = []
    for subscription in pagination.items:
        sub_data = subscription.to_dict()
        sub_data['user'] = {
            'id': subscription.user.public_id,
            'username': subscription.user.username,
            'name': subscription.user.name,
            'email': subscription.user.username  # Assuming username is email
        }
        subscriptions_data.append(sub_data)

    # Subscription statistics
    total_subscriptions = UserSubscription.query.count()
    active_subscriptions = UserSubscription.query.filter(
        and_(
            UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
            UserSubscription.end_date > datetime.utcnow()
        )
    ).count()
    
    # Revenue by tier
    revenue_by_tier = db.session.query(
        SubscriptionPlan.tier,
        func.sum(Payment.amount).label('revenue')
    ).join(
        Payment, Payment.plan_id == SubscriptionPlan.id
    ).filter(
        Payment.status == PaymentStatus.COMPLETED
    ).group_by(SubscriptionPlan.tier).all()

    tier_revenue = {tier: float(revenue) for tier, revenue in revenue_by_tier}

    return jsonify({
        "success": True,
        "subscriptions": subscriptions_data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_pages": pagination.pages,
            "total_subscriptions": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev
        },
        "statistics": {
            "total_subscriptions": total_subscriptions,
            "active_subscriptions": active_subscriptions,
            "canceled_subscriptions": UserSubscription.query.filter_by(status=SubscriptionStatus.CANCELED).count(),
            "expired_subscriptions": UserSubscription.query.filter_by(status=SubscriptionStatus.EXPIRED).count(),
            "revenue_by_tier": tier_revenue
        }
    }), 200


@admin_bp.route("/admin/payments", methods=["GET"])
@jwt_required()
def get_all_payments():
    """Get all payment transactions"""
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # if not current_user.is_admin:
    #     return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

    # Pagination and filtering
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status_filter = request.args.get('status', 'all')
    provider_filter = request.args.get('provider', 'all')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')

    query = Payment.query.join(User).join(SubscriptionPlan)

    # Status filter
    if status_filter != 'all':
        query = query.filter(Payment.status == status_filter)

    # Provider filter
    if provider_filter != 'all':
        query = query.filter(Payment.provider == provider_filter)

    # Date range filter
    if date_from:
        try:
            date_from_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            query = query.filter(Payment.created_at >= date_from_obj)
        except ValueError:
            pass

    if date_to:
        try:
            date_to_obj = datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            query = query.filter(Payment.created_at <= date_to_obj)
        except ValueError:
            pass

    # Pagination
    pagination = query.order_by(desc(Payment.created_at)).paginate(
        page=page, 
        per_page=per_page, 
        error_out=False
    )

    payments_data = []
    for payment in pagination.items:
        payment_data = payment.to_dict()
        payment_data['user'] = {
            'id': payment.user.public_id,
            'username': payment.user.username,
            'name': payment.user.name
        }
        payments_data.append(payment_data)

    # Payment statistics
    total_payments = Payment.query.count()
    completed_payments = Payment.query.filter_by(status=PaymentStatus.COMPLETED).count()
    total_revenue = db.session.query(func.sum(Payment.amount)).filter(
        Payment.status == PaymentStatus.COMPLETED
    ).scalar() or 0

    # Monthly revenue trend - Database agnostic approach
    six_months_ago = datetime.utcnow() - timedelta(days=180)
    
    # Get all completed payments in the last 6 months
    recent_payments = Payment.query.filter(
        Payment.status == PaymentStatus.COMPLETED,
        Payment.created_at >= six_months_ago
    ).all()

    # Group by month manually in Python
    monthly_revenue = {}
    for payment in recent_payments:
        month_key = payment.created_at.strftime('%Y-%m')
        if month_key not in monthly_revenue:
            monthly_revenue[month_key] = 0
        monthly_revenue[month_key] += float(payment.amount)

    # Convert to sorted list
    revenue_trend = [
        {
            'month': month,
            'revenue': revenue
        }
        for month, revenue in sorted(monthly_revenue.items())
    ]

    return jsonify({
        "success": True,
        "payments": payments_data,
        "pagination": {
            "page": page,
            "per_page": per_page,
            "total_pages": pagination.pages,
            "total_payments": pagination.total,
            "has_next": pagination.has_next,
            "has_prev": pagination.has_prev
        },
        "statistics": {
            "total_payments": total_payments,
            "completed_payments": completed_payments,
            "failed_payments": Payment.query.filter_by(status=PaymentStatus.FAILED).count(),
            "pending_payments": Payment.query.filter_by(status=PaymentStatus.PENDING).count(),
            "refunded_payments": Payment.query.filter_by(status=PaymentStatus.REFUNDED).count(),
            "total_revenue": float(total_revenue),
            "success_rate": round((completed_payments / total_payments * 100), 2) if total_payments > 0 else 0,
            "revenue_trend": revenue_trend
        }
    }), 200

@admin_bp.route("/admin/subscriptions/<string:subscription_id>", methods=["PUT"])
@jwt_required()
def update_subscription(subscription_id):
    """Admin update subscription (extend, change plan, etc.)"""
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # if not current_user.is_admin:
    #     return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

    data = request.json or {}
    subscription = UserSubscription.query.filter_by(public_id=subscription_id).first()

    if not subscription:
        return jsonify({"success": False, "message": "Subscription not found"}), 404

    try:
        # Update subscription end date
        if 'extend_days' in data:
            extend_days = int(data['extend_days'])
            subscription.end_date += timedelta(days=extend_days)

        # Change plan
        if 'plan_id' in data:
            new_plan = SubscriptionPlan.query.filter_by(public_id=data['plan_id']).first()
            if new_plan:
                subscription.plan_id = new_plan.id

        # Update status
        if 'status' in data and data['status'] in [s.value for s in SubscriptionStatus]:
            subscription.status = data['status']

        # Update auto-renew
        if 'auto_renew' in data:
            subscription.auto_renew = bool(data['auto_renew'])

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Subscription updated successfully",
            "subscription": subscription.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Failed to update subscription: {str(e)}"
        }), 500


@admin_bp.route("/admin/dashboard", methods=["GET"])
@jwt_required()
def get_admin_dashboard():
    """Get comprehensive admin dashboard data"""
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # if not current_user.is_admin:
    #     return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

    # User statistics
    total_users = User.query.count()
    new_users_today = User.query.filter(
        User.timestamp >= datetime.utcnow().date()
    ).count()
    online_users = User.query.filter_by(is_online=True).count()

    # Subscription statistics
    active_subscriptions = UserSubscription.query.filter(
        and_(
            UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
            UserSubscription.end_date > datetime.utcnow()
        )
    ).count()

    premium_users = UserSubscription.query.join(SubscriptionPlan).filter(
        and_(
            UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
            UserSubscription.end_date > datetime.utcnow(),
            SubscriptionPlan.tier != SubscriptionTier.FREE
        )
    ).count()

    # Revenue statistics
    total_revenue = db.session.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.status == PaymentStatus.COMPLETED
    ).scalar() or 0

    today_revenue = db.session.query(
        func.sum(Payment.amount)
    ).filter(
        Payment.status == PaymentStatus.COMPLETED,
        Payment.created_at >= datetime.utcnow().date()
    ).scalar() or 0

    # Recent activity
    recent_payments = Payment.query.filter_by(status=PaymentStatus.COMPLETED).order_by(
        desc(Payment.created_at)
    ).limit(10).all()

    recent_subscriptions = UserSubscription.query.filter(
        UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL])
    ).order_by(desc(UserSubscription.created_at)).limit(10).all()

    # Plan distribution
    plan_distribution = db.session.query(
        SubscriptionPlan.name,
        func.count(UserSubscription.id).label('count')
    ).join(
        UserSubscription, UserSubscription.plan_id == SubscriptionPlan.id
    ).filter(
        and_(
            UserSubscription.status.in_([SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL]),
            UserSubscription.end_date > datetime.utcnow()
        )
    ).group_by(SubscriptionPlan.name).all()

    return jsonify({
        "success": True,
        "dashboard": {
            "user_stats": {
                "total_users": total_users,
                "new_users_today": new_users_today,
                "online_users": online_users,
                "premium_users": premium_users,
                "premium_percentage": round((premium_users / total_users * 100), 2) if total_users > 0 else 0
            },
            "subscription_stats": {
                "active_subscriptions": active_subscriptions,
                "conversion_rate": round((premium_users / total_users * 100), 2) if total_users > 0 else 0,
                "plan_distribution": [
                    {"plan": plan, "count": count} for plan, count in plan_distribution
                ]
            },
            "revenue_stats": {
                "total_revenue": float(total_revenue),
                "today_revenue": float(today_revenue),
                "monthly_recurring_revenue": float(total_revenue)  # Simplified MRR
            },
            "recent_activity": {
                "recent_payments": [payment.to_dict() for payment in recent_payments],
                "recent_subscriptions": [sub.to_dict() for sub in recent_subscriptions]
            }
        }
    }), 200



@admin_bp.route("/admin/users/<string:user_id>", methods=["PUT"])
@jwt_required()
def update_user(user_id):
    """Update user information"""
    public_id = get_jwt_identity()
    current_user = User.query.filter_by(public_id=public_id).first()

    if not current_user:
        return jsonify({"success": False, "message": "User not found"}), 404

    # if not current_user.is_admin:
    #     return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

    data = request.json or {}
    user_to_update = User.query.filter_by(public_id=user_id).first()

    if not user_to_update:
        return jsonify({"success": False, "message": "User not found"}), 404

    try:
        # Prevent users from modifying their own admin status
        if user_to_update.id == current_user.id and 'is_admin' in data:
            return jsonify({"success": False, "message": "Cannot modify your own admin status"}), 400

        # Update allowed fields
        allowed_fields = ['name', 'department', 'level', 'genotype', 'religious', 'interestedIn', 'category', 'bio', 'is_admin']
        
        for field in allowed_fields:
            if field in data:
                setattr(user_to_update, field, data[field])

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "User updated successfully",
            "user": user_to_update.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"Failed to update user: {str(e)}"
        }), 500