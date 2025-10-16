import os
import httpx
import logging
from typing import Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables from .env file (if it exists)
load_dotenv()

logger = logging.getLogger(__name__)


class FlutterwaveClient:
    """
    Handles all interactions with the Flutterwave API.
    """

    def __init__(
        self,
        secret_key: Optional[str] = None,
        base_url: str = "https://api.flutterwave.com/v3",
        timeout: int = 30,
    ):
        # Get the secret key from the argument or environment variable
        self.secret_key = secret_key or os.getenv("FLW_SECRET_KEY")

        if not self.secret_key:
            raise ValueError("Flutterwave secret key not found in environment or arguments.")

        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

        self.client = httpx.Client(
            base_url=self.base_url,
            timeout=httpx.Timeout(timeout),
            headers=self._get_headers(),
            follow_redirects=True,
        )

    def _get_headers(self) -> Dict[str, str]:
        """Return authorization and JSON headers."""
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def initialize_payment(
        self,
        tx_ref: str,
        amount: str,
        currency: str,
        redirect_url: str,
        customer: Dict[str, Any],
        payment_options: str = "card",
        customizations: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Initialize a payment with Flutterwave."""
        url = "/payments"
        payload = {
            "tx_ref": tx_ref,
            "amount": amount,
            "currency": currency,
            "redirect_url": redirect_url,
            "payment_options": payment_options,
            "customer": customer,
            "customizations": customizations or {
                "title": "Subscription Payment",
                "description": "Premium plan activation",
            },
        }

        try:
            logger.info("Initializing payment: %s", payload)
            response = self.client.post(url, json=payload)
            response.raise_for_status()
            return response.json()

        except httpx.RequestError as e:
            logger.error("Network connection error: %s", e)
            raise Exception("Unable to connect to payment service. Check your network or DNS.") from e

        except httpx.HTTPStatusError as e:
            logger.error("HTTP error during payment initialization: %s", e.response.text)
            raise Exception(f"Flutterwave error: {e.response.text}") from e

    def verify_payment(self, transaction_id: str) -> Dict[str, Any]:
        """Verify a Flutterwave transaction."""
        url = f"/transactions/{transaction_id}/verify"
        try:
            response = self.client.get(url)
            response.raise_for_status()
            return response.json()

        except httpx.RequestError as e:
            logger.error("Network connection error: %s", e)
            raise Exception("Unable to connect to Flutterwave API.") from e

        except httpx.HTTPStatusError as e:
            logger.error("HTTP error verifying payment: %s", e.response.text)
            raise Exception(f"Error verifying payment: {e.response.text}") from e

    def close(self):
        """Close the HTTP client session."""
        self.client.close()