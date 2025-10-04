from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
from config import config
from models.core import db
from routes import register_blueprints
from sockets import socketio, register_socket_events
from utils.helpers import initialize_database
import os


def create_app(config_name=None):
    """
    Application factory pattern for creating Flask app
    """
    if config_name is None:
        config_name = os.environ.get('FLASK_CONFIG', 'default')

    app = Flask(__name__)

    # Load configuration
    app.config.from_object(config[config_name])

    # Initialize extensions
    db.init_app(app)
    jwt = JWTManager(app)

    # Configure CORS
    CORS(app,
         supports_credentials=True,
         resources={r"/*": {"origins": app.config['CORS_ORIGINS']}})

    # Register blueprints (routes)
    register_blueprints(app)

    # Initialize SocketIO
    socketio.init_app(app)
    register_socket_events()

    # JWT Configuration Callbacks
    from models.user import User, TokenBlocklist

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """Check if a JWT token has been revoked"""
        jti = jwt_payload["jti"]
        return TokenBlocklist.query.filter_by(jti=jti).first() is not None

    @jwt.user_identity_loader
    def user_identity_lookup(user):
        """Specify what data to use as identity in JWT tokens"""
        if isinstance(user, User):
            return user.public_id
        return user

    @jwt.user_lookup_loader
    def user_lookup_callback(_jwt_header, jwt_data):
        """Load user from database based on JWT identity"""
        identity = jwt_data["sub"]
        return User.query.filter_by(public_id=identity).first()

    # Root endpoint
    @app.route("/")
    def home():
        """Root endpoint - API information"""
        return jsonify({
            "message": "Dating App API",
            "version": "1.0",
            "status": "running",
            "environment": config_name
        })

    # Protected test endpoint
    @app.route("/protected")
    @jwt_required()
    def protected():
        """Protected endpoint example - requires authentication"""
        from flask_jwt_extended import get_jwt_identity
        public_id = get_jwt_identity()
        user = User.query.filter_by(public_id=public_id).first()

        if not user:
            return jsonify({"success": False, "message": "User not found"}), 404

        return jsonify({"success": True, "user": user.to_dict()})

    # Admin endpoint
    @app.route("/admin/users", methods=["GET"])
    @jwt_required()
    def get_all_users():
        """Admin endpoint: Fetch all registered users"""
        public_id = get_jwt_identity()
        current_user = User.query.filter_by(public_id=public_id).first()

        if not current_user:
            return jsonify({"success": False, "message": "User not found"}), 404

        if not current_user.is_admin:
            return jsonify({"success": False, "message": "Access denied: Admins only"}), 403

        users = User.query.all()
        users_data = [user.to_dict() for user in users]

        return jsonify({
            "success": True,
            "total_users": len(users_data),
            "users": users_data
        }), 200

    return app


# Create application instance
app = create_app()

# Initialize database
with app.app_context():
    initialize_database()

if __name__ == "__main__":
    # Use SocketIO instead of app.run() for WebSocket support
    socketio.run(
        app,
        debug=app.config['DEBUG'],
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        allow_unsafe_werkzeug=True
    )