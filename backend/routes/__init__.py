from .auth import auth_bp
from .profile import profile_bp
from .matching import matching_bp
from .chat import chat_bp
from .feed_routes import feed_bp  # Add this import


# Blueprint registry
def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    app.register_blueprint(auth_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(matching_bp)
    app.register_blueprint(chat_bp)
    app.register_blueprint(feed_bp, url_prefix='/api')  # Add this line


__all__ = ['register_blueprints', 'auth_bp', 'profile_bp', 'matching_bp', 'chat_bp', 'feed_bp']