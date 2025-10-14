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

def create_app(config_name=None):
    """Application factory pattern for creating Flask app"""
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')

    app = Flask(__name__)

    # ✅ Load configuration from config.py
    app.config.from_object(config[config_name])

    # ✅ Initialize extensions FIRST
    db.init_app(app)
    jwt = JWTManager(app)

    # ✅ Configure CORS
    CORS(
        app,
        supports_credentials=True,
        origins=app.config.get('CORS_ORIGINS', []),
        allow_headers=["Content-Type", "Authorization", "Accept"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
    )

    # Register blueprints
    register_blueprints(app)

    # ✅ Initialize SocketIO
    socketio.init_app(
        app,
        async_mode="eventlet",
        manage_session=False,
        cors_allowed_origins= app.config.get('CORS_ORIGINS', []),
        allow_upgrades=True,
        always_connect=True,  # ✅ ensure cookie headers persist in upgrade
        logger=True,
        engineio_logger=True,
        ping_timeout=60000,
        ping_interval=25000,
        supports_credentials=True,
    )


    # ✅ FIXED: Import and register socket events AFTER app context is set up
    with app.app_context():
        # ✅ Initialize database and test connection
        try:
            initialize_database()
            # Test database connection
            db.session.execute('SELECT 1')
            print("✅ Database connection successful")
        except Exception as e:
            print(f"❌ Database connection failed: {e}")

    # ✅ FIXED: Register socket events after SocketIO is initialized
    # This imports and triggers the @socketio.on decorators
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
        user = User.query.filter_by(public_id=public_id).first()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        return jsonify({"success": True, "user": user.to_dict()})
    

    # ✅ FIXED: Better health check endpoint
    @app.route("/health", methods=["GET", "POST"])
    def health_check():
        db_status = "connected"
        try:
            db.session.execute('SELECT 1')
        except Exception as e:
            db_status = f"disconnected: {str(e)}"
            
        return jsonify({
            "status": "healthy",
            "database": db_status,
            "socketio": "initialized",
            "environment": config_name
        }), 200

    return app

# Create the app instance
app = create_app()

# Development entry point
if __name__ == "__main__":
    print("🚀 Starting Flask-SocketIO server...")
    socketio.run(
        app,
        debug=app.config.get('DEBUG', False),
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        allow_unsafe_werkzeug=True
    )