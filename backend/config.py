import os
from datetime import timedelta

class Config:
    """Base configuration"""
    # Database - Use DATABASE_URL (Render's default) with fallback
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///lausers.db")

    # Fix for Render PostgreSQL - they use postgres:// but SQLAlchemy needs postgresql://
    if SQLALCHEMY_DATABASE_URI and SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # SQLAlchemy engine options
    SQLALCHEMY_ENGINE_OPTIONS = {
        'poolclass': None,
        'pool_pre_ping': True
    }

    # JWT configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "fallback-secret-key-change-in-production")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Token location
    JWT_TOKEN_LOCATION = ['cookies']

    # Cookie settings - CRITICAL for production
    JWT_COOKIE_SECURE = True  # ✅ Must be True in production
    JWT_COOKIE_SAMESITE = "None"  # ✅ Required for cross-origin
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_SESSION_COOKIE = False

    # Cookie names
    JWT_ACCESS_COOKIE_NAME = 'access_token_cookie'
    JWT_REFRESH_COOKIE_NAME = 'refresh_token_cookie'

    # CORS origins - Add your Vercel domain
    CORS_ORIGINS = [
        "https://laumeet.vercel.app",
        "https://www.laumeet.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    # Flask settings
    DEBUG = False
    TESTING = False

    # SocketIO settings
    SOCKETIO_ASYNC_MODE = "eventlet"

    # Security
    SECRET_KEY = os.environ.get("SECRET_KEY", "flask-secret-key-change-in-production")


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    JWT_COOKIE_SECURE = False  # False for development (HTTP)

    # Development database
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///lausers_dev.db")


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    JWT_COOKIE_SECURE = True  # True for production (HTTPS)

    # Production database - require DATABASE_URL (not DB_URL)
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL")
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("DATABASE_URL environment variable is required for production")

    # Fix PostgreSQL URL for SQLAlchemy
    if SQLALCHEMY_DATABASE_URI.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI.replace("postgres://", "postgresql://", 1)

    # Production JWT secret - require environment variable
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY environment variable is required for production")

    # Production secret key
    SECRET_KEY = os.environ.get("SECRET_KEY")
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable is required for production")


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    JWT_COOKIE_SECURE = False

    # Test database
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"

    # Test JWT secret
    JWT_SECRET_KEY = "test-secret-key"

    # Disable CORS for testing
    CORS_ORIGINS = ["http://localhost:3000"]


class StagingConfig(Config):
    """Staging configuration"""
    DEBUG = True
    JWT_COOKIE_SECURE = True  # True for staging (HTTPS)

    # Staging database
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///lausers_staging.db")


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'staging': StagingConfig,
    'default': DevelopmentConfig
}