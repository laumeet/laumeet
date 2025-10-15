# utils/flutterwave_client.py
import os
import requests
from urllib.parse import urljoin
import json

class FlutterwaveClient:
    def __init__(self):
        self.secret_key = os.getenv("FLW_SECRET_KEY")
        
        if not self.secret_key:
            raise ValueError("FLW_SECRET_KEY environment variable is required")
        
        # Use official domain instead of IP
        self.base_url = "https://api.flutterwave.com/v3/"
        
        # Proper headers for domain connection
        self.headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'Laumeet/1.0'
        }

    def init_payment(self, payment_data):
        """
        Initialize Flutterwave payment using official domain
        """
        endpoint = urljoin(self.base_url, "payments")
        
        print(f"Initializing payment via Flutterwave API")
        print(f"Payload: {json.dumps(payment_data, indent=2)}")
        
        try:
            response = requests.post(
                endpoint,
                json=payment_data,
                headers=self.headers,
                timeout=30,
                verify=True
            )
            
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                print(f"Payment initialization successful: {result.get('status')}")
                return result
            else:
                print(f"Flutterwave API error: {response.status_code} - {response.text}")
                
                # Provide more specific error messages
                if response.status_code == 401:
                    raise Exception("Invalid Flutterwave secret key")
                elif response.status_code == 400:
                    error_msg = response.json().get('message', 'Bad request')
                    raise Exception(f"Payment request error: {error_msg}")
                elif response.status_code == 403:
                    raise Exception("Access forbidden - check your API key permissions")
                else:
                    response.raise_for_status()
                
        except requests.exceptions.ConnectTimeout:
            print("Flutterwave API connection timeout")
            raise Exception("Payment service temporarily unavailable. Please try again.")
            
        except requests.exceptions.ConnectionError:
            print("Flutterwave API connection error")
            raise Exception("Unable to connect to payment service. Check your internet connection.")
            
        except requests.exceptions.Timeout:
            print("Flutterwave API request timeout")
            raise Exception("Payment service response timeout. Please try again.")
            
        except requests.exceptions.RequestException as e:
            print(f"Flutterwave API request exception: {e}")
            raise Exception(f"Payment service error: {str(e)}")
            
        except Exception as e:
            print(f"Unexpected error during payment initialization: {e}")
            raise Exception(f"Payment initialization failed: {str(e)}")

    def verify_transaction(self, transaction_id=None, tx_ref=None):
        """
        Verify transaction with Flutterwave
        """
        try:
            if transaction_id:
                endpoint = urljoin(self.base_url, f"transactions/{transaction_id}/verify")
                response = requests.get(endpoint, headers=self.headers, timeout=25)
            elif tx_ref:
                endpoint = urljoin(self.base_url, "transactions/verify_by_reference")
                response = requests.get(endpoint, params={"tx_ref": tx_ref}, headers=self.headers, timeout=25)
            else:
                return None
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Flutterwave verification request failed: {e}")
            raise Exception(f"Transaction verification failed: {str(e)}")
        except Exception as e:
            print(f"Flutterwave verification failed: {e}")
            raise

# Global instance - lazy initialization
_flutterwave_client_instance = None

def get_flutterwave_client():
    """Lazy initialization of Flutterwave client"""
    global _flutterwave_client_instance
    if _flutterwave_client_instance is None:
        try:
            _flutterwave_client_instance = FlutterwaveClient()
            print("Flutterwave client initialized successfully")
        except Exception as e:
            print(f"Failed to initialize Flutterwave client: {e}")
            raise
    return _flutterwave_client_instance