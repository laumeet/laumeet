# utils/flutterwave_client.py
import os
import socket
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from urllib.parse import urljoin
import time

class FlutterwaveClient:
    def __init__(self):
        self.base_url = os.getenv("FLW_BASE_URL", "https://api.flutterwave.com/v3/")
        self.secret_key = os.getenv("FLW_SECRET_KEY")
        
        if not self.secret_key:
            raise ValueError("FLW_SECRET_KEY environment variable is required")
        
        # Create session with retry strategy
        self.session = requests.Session()
        
        # Retry strategy for DNS and network issues
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST", "GET"]
        )
        
        adapter = HTTPAdapter(
            max_retries=retry_strategy,
            pool_connections=10,
            pool_maxsize=10
        )
        
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set headers
        self.session.headers.update({
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json'
        })

    def init_payment(self, payment_data):
        """
        Initialize Flutterwave payment
        """
        endpoint = urljoin(self.base_url, "payments")
        
        try:
            # Test DNS resolution first with proper timeout handling
            try:
                # Create a new socket with timeout
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(5)  # 5 second timeout
                sock.connect(('api.flutterwave.com', 443))
                sock.close()
            except socket.error as e:
                print(f"DNS resolution/connection warning: {e}")
                # Continue anyway - retry strategy will handle it
            
            response = self.session.post(
                endpoint,
                json=payment_data,
                timeout=(10, 30)  # (connect_timeout, read_timeout)
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.ConnectTimeout as e:
            print(f"Flutterwave connection timeout: {e}")
            raise
        except requests.exceptions.Timeout as e:
            print(f"Flutterwave request timeout: {e}")
            raise
        except requests.exceptions.ConnectionError as e:
            print(f"Flutterwave connection error: {e}")
            raise
        except requests.exceptions.RequestException as e:
            print(f"Flutterwave API request failed: {e}")
            raise

    def verify_transaction(self, transaction_id=None, tx_ref=None):
        """
        Verify transaction with Flutterwave
        """
        try:
            if transaction_id:
                endpoint = urljoin(self.base_url, f"transactions/{transaction_id}/verify")
                response = self.session.get(endpoint, timeout=20)
            elif tx_ref:
                endpoint = urljoin(self.base_url, "transactions/verify_by_reference")
                response = self.session.get(endpoint, params={"tx_ref": tx_ref}, timeout=20)
            else:
                return None
            
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.ConnectTimeout as e:
            print(f"Flutterwave verification connection timeout: {e}")
            raise
        except requests.exceptions.Timeout as e:
            print(f"Flutterwave verification request timeout: {e}")
            raise
        except requests.exceptions.ConnectionError as e:
            print(f"Flutterwave verification connection error: {e}")
            raise
        except requests.exceptions.RequestException as e:
            print(f"Flutterwave verification failed: {e}")
            raise

    def test_connection(self):
        """
        Test connection to Flutterwave API
        """
        try:
            # Simple DNS test
            socket.gethostbyname('api.flutterwave.com')
            return True
        except socket.gaierror as e:
            print(f"DNS resolution failed: {e}")
            return False

# Global instance
flutterwave_client = FlutterwaveClient()