import eventlet
eventlet.monkey_patch()  # 👈 Must be first to patch sockets/threads before any imports

import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from config import config
from models.core import db
from routes import register_blueprints
from sockets import socketio, register_socket_events
from utils.helpers import initialize_database
from sqlalchemy.pool import NullPool


# In your app.py - make sure you're using ProductionConfig
def create_app(config_name=None):
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'production')  # ✅ Default to production

    app = Flask(__name__)
    app.config.from_object(config[config_name])  # ✅ This loads ALL config including JWT_COOKIE_DOMAIN

    # ✅ REMOVE duplicate JWT config - it's already in config.py
    # Just keep the SQLALCHEMY_ENGINE_OPTIONS part

    # ... rest of your app.py ...

    # ✅ Prevent connection pool threading conflicts
    app.config.setdefault('SQLALCHEMY_ENGINE_OPTIONS', {})
    engine_options = app.config['SQLALCHEMY_ENGINE_OPTIONS']
    engine_options.setdefault('poolclass', NullPool)
    engine_options.setdefault('pool_pre_ping', True)
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = engine_options

    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)

    # ✅ Configure CORS - Use origins from config
    CORS(
        app,
        supports_credentials=True,
        origins=app.config.get('CORS_ORIGINS', []),
        allow_headers=["Content-Type", "Authorization", "Accept"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    )

    # Register blueprints
    register_blueprints(app)

    # ✅ Initialize SocketIO with same CORS origins as config
    socketio.init_app(
        app,
        async_mode="eventlet",
        manage_session=False,
        cors_allowed_origins=app.config.get('CORS_ORIGINS', []),
        supports_credentials=True
    )
    register_socket_events()

    # JWT Configuration
    from models.user import User, TokenBlocklist

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        return TokenBlocklist.query.filter_by(jti=jti).first() is not None

    @jwt.user_identity_loader
    def user_identity_lookup(user):
        if isinstance(user, User):
            return user.public_id
        return user

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        identity = jwt_data["sub"]
        return User.query.filter_by(public_id=identity).first()

    # JWT Error handlers
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "success": False,
            "message": "Missing access token"
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            "success": False, 
            "message": "Invalid token"
        }), 422

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_data):
        return jsonify({
            "success": False,
            "message": "Token has expired"
        }), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_data):
        return jsonify({
            "success": False,
            "message": "Token has been revoked"
        }), 401

    # Routes
    @app.route("/")
    def home():
        return jsonify({
            "message": "Dating App API",
            "version": "1.0",
            "status": "running",
            "environment": config_name
        })

    @app.route("/protected")
    @jwt_required()
    def protected():
        public_id = get_jwt_identity()
        print(public_id)
        user = User.query.filter_by(public_id=public_id).first()
        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404
        return jsonify({"success": True, "user": user.to_dict()})

    @app.route("/admin/users", methods=["GET"])
    @jwt_required()
    def get_all_users():
        public_id = get_jwt_identity()
        current_user = User.query.filter_by(public_id=public_id).first()

        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        if not current_user.is_admin:
            return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

        users = User.query.all()
        return jsonify({
            "success": True,
            "total_users": len(users),
            "users": [user.to_dict() for user in users]
        }), 200

    # Health check endpoint
    @app.route("/health")
    def health_check():
        return jsonify({
            "status": "healthy",
            "database": "connected" if db.session.bind else "disconnected"
        }), 200

    return app


# Create the app instance
app = create_app()

# Initialize database
with app.app_context():
    initialize_database()

# Development entry point
if __name__ == "__main__":
    socketio.run(
        app,
        debug=app.config.get('DEBUG', False),
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        allow_unsafe_werkzeug=True
    )