from .auth import auth_bp
from .profile import profile_bp
from .matching import matching_bp
from .chat import chat_bp
from .subscription import subscription_bp
from .admin import admin_bp
# Blueprint registry
def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(matching_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(subscription_bp)
    app.register_blueprint(admin_bp)

__all__ = ['register_blueprints', 'auth_bp','subscription_bp', 'profile_bp', 'matching_bp', 'chat_bp', 'admin_bp']