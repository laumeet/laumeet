import os
from datetime import timedelta


class Config:
    """Base configuration"""
    SQLALCHEMY_DATABASE_URI = os.environ.get("DB_URL", "sqlite:///lausers.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT configuration
    JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY") or "dev-secret-key-please-change"
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=14)
    JWT_TOKEN_LOCATION = ['cookies', 'headers']

    # Cookie settings
    JWT_COOKIE_SECURE = False  # Set to True in production
    JWT_COOKIE_SAMESITE = "None"
    JWT_COOKIE_CSRF_PROTECT = False
    JWT_SESSION_COOKIE = False

    # CORS origins
    CORS_ORIGINS = [
        "https://laumeet.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    JWT_COOKIE_SECURE = False


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    JWT_COOKIE_SECURE = True


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_COOKIE_SECURE = False


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}