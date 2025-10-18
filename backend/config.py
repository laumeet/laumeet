import os
from datetime import timedelta
from supabase import create_client
from flask import current_app


supabase = current_app.config['supabase']


class Config:
    """Base configuration"""
    
    # ✅ FIXED: Proper database URL handling
    # Support both local (SQLite) and Render (PostgreSQL)
    DB_URL = os.environ.get("DATABASE_URL") or os.environ.get("DB_URL") or "sqlite:///lausers.db"

    # Fix Render’s deprecated URL format (postgres:// → postgresql://)
    if DB_URL.startswith("postgres://"):
        DB_URL = DB_URL.replace("postgres://", "postgresql://", 1)

    SQLALCHEMY_DATABASE_URI = DB_URL

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

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

    # Flutterwave Configuration
    FLW_PUBLIC_KEY = os.getenv('FLW_PUBLIC_KEY')
    FLW_SECRET_KEY = os.getenv('FLW_SECRET_KEY')
    FLW_WEBHOOK_SECRET = os.getenv('FLW_WEBHOOK_SECRET')

    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Payment redirect URLs
    PAYMENT_SUCCESS_URL = os.getenv('PAYMENT_SUCCESS_URL', 'https://laumeet.com/payment/success')
    PAYMENT_FAILURE_URL = os.getenv('PAYMENT_FAILURE_URL', 'https://laumeet.com/payment/failed')


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
    DEBUG = True
    JWT_COOKIE_SECURE = False
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-secret-key"
    CORS_ORIGINS = ["http://localhost:3000"]

class StagingConfig(Config):
    """Staging configuration"""
    DEBUG = True
    JWT_COOKIE_SECURE = True
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///lausers_staging.db")

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'staging': StagingConfig,
    'default': DevelopmentConfig
}