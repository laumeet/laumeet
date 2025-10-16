@subscription_bp.route("/subscribe", methods=["POST"])
@jwt_required()
def create_subscription():
    current_user, error_response, status_code = get_current_user_from_jwt()
    if error_response:
        return error_response, status_code

    data = request.json or {}
    plan_id = data.get("plan_id")
    billing_cycle = data.get("billing_cycle", "monthly")

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

        # Calculate price
        price = float(plan.yearly_price) if billing_cycle == "yearly" else float(plan.monthly_price)

        # Create payment record
        payment = Payment(
            user_id=current_user.id,
            plan_id=plan.id,
            amount=price,
            billing_cycle=billing_cycle,
            provider=PaymentProvider.FLUTTERWAVE,
            status=PaymentStatus.PENDING
        )

        db.session.add(payment)
        db.session.flush()

        # Mock payment for testing
        if data.get("mock_payment", False):
            payment.mark_completed(
                provider_payment_id=f"mock_pay_{payment.public_id}",
                provider_reference=f"ref_{payment.public_id}"
            )

            # Activate subscription immediately for mock payments
            activate_user_subscription(payment)
            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Subscription activated successfully",
                "payment_id": payment.public_id,
                "subscription": current_user.current_subscription.to_dict() if current_user.current_subscription else None
            }), 201

        # REAL PAYMENT WITH FLUTTERWAVE
        try:
            backend_base_url = os.getenv("BACKEND_BASE_URL", "https://laumeet.onrender.com")
            success_redirect = f"{backend_base_url}/payment/success?payment_id={payment.public_id}"
            customer_email = "laumeet@gmail.com"

            # Initialize payment
            flw_result = init_flutterwave_payment(payment, customer_email, success_redirect)

            checkout_link = flw_result["checkout_link"]
            provider_id = flw_result["provider_id"]
            tx_ref = flw_result["tx_ref"]

            if provider_id:
                payment.provider_payment_id = str(provider_id)
                payment.provider_reference = tx_ref

            db.session.commit()

            return jsonify({
                "success": True,
                "message": "Payment initiated successfully",
                "payment_id": payment.public_id,
                "checkout_url": checkout_link,
                "redirect_url": success_redirect
            }), 200

        except Exception as e:
            db.session.rollback()
            print(f"Payment initialization error: {e}")
            return jsonify({
                "success": False, 
                "message": "Unable to initialize payment. Please try again later or contact support."
            }), 500

    except Exception as e:
        db.session.rollback()
        print(f"Error creating subscription: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Failed to create subscription"
        }), 500
