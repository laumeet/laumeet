# utils/message_validator.py
import re


class MessageValidator:
    """Validate messages for restricted content based on subscription"""

    @staticmethod
    def contains_restricted_content(message):
        """Check if message contains restricted patterns"""
        restricted_patterns = [
            r'\b\d{10,}\b',  # Phone numbers (10+ digits)
            r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',  # Phone number formats
            r'@\w+\.\w+',  # Email addresses
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',  # Email regex
            r'#\w+',  # Hashtags
            r'https?://[^\s]+',  # Links
            r'www\.[^\s]+',  # Website links
            r'@\w+',  # Mentions
        ]

        for pattern in restricted_patterns:
            if re.search(pattern, message, re.IGNORECASE):
                return True
        return False

    @staticmethod
    def validate_message_send(user, message_content):
        """Validate if user can send this message based on subscription"""
        from models.subscription import SubscriptionTier

        # Check if message contains restricted content
        if MessageValidator.contains_restricted_content(message_content):
            # Check user's subscription
            if not user.current_subscription:
                return False, "UPGRADE_REQUIRED"

            # Only premium users can send restricted content
            if user.current_subscription.plan.tier == SubscriptionTier.FREE:
                return False, "UPGRADE_REQUIRED"

        return True, "ALLOWED"