import re
import base64
from PIL import Image
import io
from flask import jsonify

def is_valid_username(username):
    """
    Validate username format
    Rules:
    - Must not be empty
    - Must be between 3 and 50 characters
    - Can only contain letters, numbers, and underscores
    """
    return bool(username) and 3 <= len(username) <= 50 and re.match(r'^[a-zA-Z0-9_]+$', username)


def is_strong_password(password):
    """
    Validate password strength
    Rules:
    - Must not be empty
    - Must be at least 8 characters long
    - Must contain at least one digit
    - Must contain at least one uppercase letter
    """
    if not password or len(password) < 8:
        return False
    return any(c.isdigit() for c in password) and any(c.isupper() for c in password)


def validate_gender(gender):
    """
    Validate gender value
    Allowed values: "male", "female", "other" (case-insensitive)
    """
    return bool(gender) and gender.lower() in ["male", "female", "other"]


def get_opposite_gender(gender):
    """
    Get opposite gender for matching logic in explore feature
    Enhanced to handle "other" gender by returning both male and female
    Args:
        gender: User's gender as string
    Returns:
        String or list of genders to show in explore
    """
    gender_lower = gender.lower()
    if gender_lower == "male":
        return "Female"
    elif gender_lower == "female":
        return "Male"
    else:  # "other" or any other value
        # For "other" gender, show both male and female profiles
        return ["Male", "Female"]


def is_valid_image_data(image_data, max_size_kb=500):
    """
    Validate image data (either URL or base64 encoded)
    Args:
        image_data: The image data to validate
        max_size_kb: Maximum allowed size in kilobytes (for base64 images)
    Returns:
        Tuple of (is_valid, message)
    """
    # Check if it's a URL (http:// or https://)
    if image_data.startswith(('http://', 'https://')):
        return True, "url"

    # Check if it's base64 encoded image data
    if image_data.startswith('data:image/'):
        try:
            # Split data URI header from base64 data
            header, data = image_data.split(',', 1)
            # Verify it's valid base64
            base64.b64decode(data)

            # Calculate approximate size (base64 is about 33% larger than binary)
            size_kb = len(data) * 3 / 4 / 1024
            if size_kb > max_size_kb:
                return False, f"Image size exceeds {max_size_kb}KB limit"

            return True, "base64"
        except Exception:
            # Catch any errors in base64 decoding
            return False, "Invalid base64 image data"

    # Not a URL or valid base64
    return False, "Image must be a valid URL or base64 data URI"


def process_image(image_data, max_size_kb=500, resize_to=(800, 800)):
    """
    Validate and compress image data (base64 or URL).
    Returns (is_valid, message, processed_image_string)
    """
    # Handle base64
    if image_data.startswith('data:image/'):
        try:
            header, data = image_data.split(',', 1)
            raw = base64.b64decode(data)

            size_kb = len(raw) / 1024
            if size_kb > max_size_kb:
                # Compress with Pillow
                img = Image.open(io.BytesIO(raw))
                img.thumbnail(resize_to, Image.LANCZOS)

                output = io.BytesIO()
                img.save(output, format="JPEG", quality=85)
                output.seek(0)

                # Convert back to base64 string for DB
                compressed_base64 = "data:image/jpeg;base64," + base64.b64encode(output.read()).decode("utf-8")
                return True, "compressed", compressed_base64

            return True, "valid", image_data  # original is fine

        except Exception as e:
            return False, f"Invalid base64: {str(e)}", None

    # Handle URL (don't compress, just return as is)
    if image_data.startswith(('http://', 'https://')):
        return True, "url", image_data

    return False, "Image must be a valid URL or base64", None