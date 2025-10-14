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
        
        # Use direct IP connection to bypass DNS issues
        self.base_ip = "52.214.125.14"  # Current Flutterwave IP
        self.base_url = f"https://{self.base_ip}/v3/"
        
        # Headers for IP connection (important for SNI)
        self.headers = {
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
            'Host': 'api.flutterwave.com',  # Critical for SNI
            'User-Agent': 'Laumeet/1.0'
        }

    def init_payment(self, payment_data):
        """
        Initialize Flutterwave payment using direct IP connection
        """
        endpoint = urljoin(self.base_url, "payments")
        
        print(f"Initializing payment via direct IP: {self.base_ip}")
        
        try:
            response = requests.post(
                endpoint,
                json=payment_data,
                headers=self.headers,
                timeout=30,
                verify=True  # Important: keep SSL verification
            )
            
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"Flutterwave API error: {response.status_code} - {response.text}")
                response.raise_for_status()
                
        except requests.exceptions.SSLError as e:
            print(f"SSL Error: {e}")
            # Retry without verification (not recommended for production)
            print("Retrying without SSL verification...")
            response = requests.post(
                endpoint,
                json=payment_data,
                headers=self.headers,
                timeout=30,
                verify=False
            )
            if response.status_code == 200:
                return response.json()
            else:
                response.raise_for_status()
                
        except Exception as e:
            print(f"Flutterwave payment initialization failed: {e}")
            raise Exception(f"Payment service unavailable: {str(e)}")

    def verify_transaction(self, transaction_id=None, tx_ref=None):
        """
        Verify transaction with Flutterwave using direct IP
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
            
        except Exception as e:
            print(f"Flutterwave verification failed: {e}")
            raise

# Global instance
flutterwave_client = FlutterwaveClient()