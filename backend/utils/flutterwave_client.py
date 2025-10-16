import os
import requests
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class FlutterwaveClient:
    def __init__(self):
        self.secret_key = os.getenv("FLW_SECRET_KEY")
        self.public_key = os.getenv("FLW_PUBLIC_KEY")
        self.base_url = "https://api.flutterwave.com/v3"
        self.timeout = 30  # Increased timeout for Render
        
        if not self.secret_key or not self.public_key:
            logger.error("Flutterwave keys not configured")
            raise ValueError("Flutterwave keys not configured")

    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json",
            "User-Agent": "Laumeet/1.0"
        }

    def init_payment(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Initialize payment with Flutterwave"""
        print(f"Initializing payment with payload:", payload)  # Debug statement
        try:
            url = f"{self.base_url}/payments"
            
            # Log request (without sensitive data)
            safe_payload = payload.copy()
            if 'customer' in safe_payload:
                safe_payload['customer'] = {**safe_payload['customer'], 'email': '***'}
            logger.info(f"Initializing Flutterwave payment: {safe_payload}")
            print(f"Flutterwave request URL:", url)  # Debug statement
            print(f"Flutterwave request headers:", self._get_headers())  # Debug statement
            print(f"Flutterwave request payload:", safe_payload)  # Debug statement
            response = requests.post(
                url, 
                json=payload, 
                headers=self._get_headers(),
                timeout=self.timeout,
                verify=True  # Ensure SSL verification
            )
            print(f"Flutterwave response status:", response.status_code)  # Debug statement
            
            logger.info(f"Flutterwave response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return data
                else:
                    logger.error(f"Flutterwave API error: {data.get('message')}")
                    raise Exception(f"Flutterwave API error: {data.get('message', 'Unknown error')}")
            else:
                logger.error(f"Flutterwave HTTP error: {response.status_code} - {response.text}")
                # Try to get error message from response
                try:
                    error_data = response.json()
                    error_msg = error_data.get('message', response.text)
                except:
                    error_msg = response.text
                
                raise Exception(f"Flutterwave HTTP error {response.status_code}: {error_msg}")
                
        except requests.exceptions.Timeout:
            logger.error("Flutterwave API timeout")
            raise Exception("Payment service timeout. Please try again.")
        except requests.exceptions.ConnectionError:
            logger.error("Flutterwave connection error")
            raise Exception("Unable to connect to payment service. Please check your internet connection and try again.")
        except requests.exceptions.RequestException as e:
            logger.error(f"Flutterwave request exception: {str(e)}")
            raise Exception(f"Payment service error: {str(e)}")
        except Exception as e:
            logger.error(f"Unexpected error in init_payment: {str(e)}")
            raise

    def verify_transaction(self, transaction_id: Optional[str] = None, tx_ref: Optional[str] = None) -> Dict[str, Any]:
        """Verify transaction with Flutterwave"""
        try:
            if transaction_id:
                url = f"{self.base_url}/transactions/{transaction_id}/verify"
            elif tx_ref:
                url = f"{self.base_url}/transactions/verify_by_reference?tx_ref={tx_ref}"
            else:
                raise ValueError("Either transaction_id or tx_ref is required")

            logger.info(f"Verifying transaction: {transaction_id or tx_ref}")
            
            response = requests.get(
                url,
                headers=self._get_headers(),
                timeout=self.timeout,
                verify=True
            )
            
            logger.info(f"Flutterwave verification response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return data
                else:
                    logger.error(f"Flutterwave verification error: {data.get('message')}")
                    raise Exception(f"Verification failed: {data.get('message', 'Unknown error')}")
            else:
                logger.error(f"Flutterwave verification HTTP error: {response.status_code} - {response.text}")
                raise Exception(f"Verification HTTP error {response.status_code}")
                
        except requests.exceptions.Timeout:
            logger.error("Flutterwave verification timeout")
            raise Exception("Verification timeout. Please try again.")
        except requests.exceptions.ConnectionError:
            logger.error("Flutterwave verification connection error")
            raise Exception("Unable to connect to verification service.")
        except Exception as e:
            logger.error(f"Error in verify_transaction: {str(e)}")
            raise

# Singleton instance
_flutterwave_client = None

def get_flutterwave_client():
    global _flutterwave_client
    if _flutterwave_client is None:
        _flutterwave_client = FlutterwaveClient()
    return _flutterwave_client