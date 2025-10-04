from flask import url_for


def build_image_url(image_path: str) -> str:
    """
    Convert stored image string into a proper URL or base64 string
    - If it's already base64 (starts with 'data:image/'), return as is
    - If it's a full http/https URL, return as is
    - If it's just a filename/path, build a full URL
    """
    if not image_path:
        return None

    if image_path.startswith(("http://", "https://", "data:image/")):
        return image_path

    # Assume it's a local file in static/uploads
    return url_for("static", filename=f"uploads/{image_path}", _external=True)


def initialize_database():
    """
    Initialize database and handle schema updates
    This should be called from the main app
    """
    from models.core import db
    from models.user import User

    db.create_all()

    # Check if new columns need to be added (for existing databases)
    try:
        # Try to query the new fields to see if they exist
        test_user = User.query.first()
        if test_user:
            # If we can access the user, check if new fields exist
            if not hasattr(test_user, 'is_online'):
                print("Database update needed for new fields...")
                # In production, you would use proper migrations like Flask-Migrate
                # For development, you can recreate the database or manually add columns
    except Exception as e:
        print(f"Database initialization note: {e}")