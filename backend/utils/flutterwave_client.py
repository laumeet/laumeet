import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class FlutterwaveClient:
    def __init__(self):
        self.secret_key = os.getenv("FLW_SECRET_KEY")
        self.public_key = os.getenv("FLW_PUBLIC_KEY")
        self.base_url = "https://api.flutterwave.com/v3"
        self.timeout = 30  # Timeout for production (Render, etc.)

        if not self.secret_key or not self.public_key:
            logger.error("Flutterwave keys not configured")
            raise ValueError("Flutterwave keys not configured")

        # Create a reusable HTTPX client
        self.client = httpx.Client(
            base_url=self.base_url,
            timeout=self.timeout,
            verify=False,
            headers=self._get_headers(),
        )

    def _get_headers(self) -> Dict[str, str]:
        """Default headers for all Flutterwave API requests"""
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
            "User-Agent": "Laumeet/1.0",
        }

    def init_payment(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize payment with Flutterwave"""
        print("Initializing payment with payload:", payload)
        try:
            url = "/payments"  # relative path since base_url is set
            safe_payload = payload.copy()
            logger.info(f"Initializing Flutterwave payment: {safe_payload}")
            print(f"Flutterwave request URL: {self.base_url}{url}")
            print(f"Flutterwave request headers: {self._get_headers()}")
            print(f"Flutterwave request payload: {safe_payload}")

            response = self.client.post(url, json=payload)
            print(f"Flutterwave response status: {response.status_code}")
            logger.info(f"Flutterwave response status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return data
                else:
                    message = data.get("message", "Unknown error")
                    logger.error(f"Flutterwave API error: {message}")
                    raise Exception(f"Flutterwave API error: {message}")
            else:
                try:
                    error_data = response.json()
                    error_msg = error_data.get("message", response.text)
                except Exception:
                    error_msg = response.text
                logger.error(f"Flutterwave HTTP error: {response.status_code} - {error_msg}")
                raise Exception(f"Flutterwave HTTP error {response.status_code}: {error_msg}")

        except httpx.TimeoutException:
            logger.error("Flutterwave API timeout")
            raise Exception("Payment service timeout. Please try again.")
        except httpx.ConnectError:
            logger.error("Flutterwave connection error")
            raise Exception("Unable to connect to payment service. Check internet connection and try again.")
        except httpx.RequestError as e:
            logger.error(f"Flutterwave request exception: {str(e)}")
            raise Exception(f"Payment service error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in init_payment: {str(e)}")
            raise

    def verify_transaction(self, transaction_id: Optional[str] = None, tx_ref: Optional[str] = None) -> Dict[str, Any]:
        """Verify transaction with Flutterwave"""
        try:
            if transaction_id:
                url = f"/transactions/{transaction_id}/verify"
            elif tx_ref:
                url = f"/transactions/verify_by_reference?tx_ref={tx_ref}"
            else:
                raise ValueError("Either transaction_id or tx_ref is required")

            logger.info(f"Verifying transaction: {transaction_id or tx_ref}")
            response = self.client.get(url)
            logger.info(f"Flutterwave verification response status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return data
                else:
                    message = data.get("message", "Unknown error")
                    logger.error(f"Flutterwave verification error: {message}")
                    raise Exception(f"Verification failed: {message}")
            else:
                logger.error(f"Flutterwave verification HTTP error: {response.status_code} - {response.text}")
                raise Exception(f"Verification HTTP error {response.status_code}")

        except httpx.TimeoutException:
            logger.error("Flutterwave verification timeout")
            raise Exception("Verification timeout. Please try again.")
        except httpx.ConnectError:
            logger.error("Flutterwave verification connection error")
            raise Exception("Unable to connect to verification service.")
        except Exception as e:
            logger.error(f"Error in verify_transaction: {str(e)}")
            raise

# Singleton instance
_flutterwave_client = None

def get_flutterwave_client() -> FlutterwaveClient:
    global _flutterwave_client
    if _flutterwave_client is None:
        _flutterwave_client = FlutterwaveClient()
    return _flutterwave_client