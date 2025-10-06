# config.py - FIXED VERSION
import os
from datetime import timedelta


class Config:
    """Base configuration"""
    SQLALCHEMY_DATABASE_URI = os.environ.get("DB_URL", "sqlite:///lausers.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or "dev-secret-key-please-change"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)  # Increased to 30 days
    JWT_TOKEN_LOCATION = ['cookies', 'headers']

    # ✅ FIXED: Cookie settings for cross-origin
    JWT_COOKIE_SECURE = True  # True for HTTPS in production
    JWT_COOKIE_SAMESITE = "None"
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_SESSION_COOKIE = False
    JWT_COOKIE_DOMAIN = ".onrender.com"  # ✅ ADD THIS for cross-origin cookies

    # CORS origins
    CORS_ORIGINS = [
        "https://laumeet.vercel.app",
        "https://www.laumeet.vercel.app",  # Added www subdomain
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_DOMAIN = None  # No domain for localhost


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_DOMAIN = ".onrender.com"  # ✅ Cross-origin cookies


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DEBUG = True
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_DOMAIN = None

    # Test database
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-secret-key"
    CORS_ORIGINS = ["http://localhost:3000"]


class StagingConfig(Config):
    """Staging configuration"""
    DEBUG = True
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_DOMAIN = ".onrender.com"


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'staging': StagingConfig,
    'default': DevelopmentConfig
}