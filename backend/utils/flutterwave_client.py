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
        
        # Known Flutterwave IPs as fallback (you may need to update these)
        self.known_ips = [
            "52.31.139.75",    # Flutterwave IP 1
            "34.248.220.211",  # Flutterwave IP 2
            "52.209.124.234",  # Flutterwave IP 3
        ]
        
        # Create session with retry strategy
        self.session = requests.Session()
        
        # More aggressive retry strategy for DNS issues
        retry_strategy = Retry(
            total=5,  # Increased from 3 to 5
            backoff_factor=2,  # Increased backoff
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST", "GET", "PUT"],
            respect_retry_after_header=True
        )
        
        adapter = HTTPAdapter(
            max_retries=retry_strategy,
            pool_connections=20,
            pool_maxsize=20,
            pool_block=False
        )
        
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        # Set headers
        self.session.headers.update({
            'Authorization': f'Bearer {self.secret_key}',
            'Content-Type': 'application/json',
            'User-Agent': 'Laumeet/1.0'
        })

    def _resolve_dns_with_fallback(self, hostname):
        """Resolve DNS with fallback to known IPs"""
        try:
            # Try normal DNS resolution first
            print(f"Attempting DNS resolution for: {hostname}")
            ip = socket.gethostbyname(hostname)
            print(f"DNS resolution successful: {hostname} -> {ip}")
            return hostname  # Return hostname for SNI
        except socket.gaierror as e:
            print(f"DNS resolution failed for {hostname}: {e}")
            print("Falling back to known IP addresses...")
            
            # Try known IPs
            for ip in self.known_ips:
                try:
                    # Test if IP is reachable
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(3)
                    result = sock.connect_ex((ip, 443))
                    sock.close()
                    
                    if result == 0:
                        print(f"Using fallback IP: {ip}")
                        return ip
                except Exception as ip_e:
                    print(f"IP {ip} failed: {ip_e}")
                    continue
            
            raise Exception(f"All DNS resolution attempts failed for {hostname}")

    def init_payment(self, payment_data):
        """
        Initialize Flutterwave payment with DNS fallback
        """
        try:
            # Resolve hostname with fallback
            resolved_host = self._resolve_dns_with_fallback('api.flutterwave.com')
            
            # Construct URL based on resolution method
            if resolved_host.replace('.', '').isdigit():  # It's an IP
                endpoint = f"https://{resolved_host}/v3/payments"
                # Need to add Host header for SNI
                headers = self.session.headers.copy()
                headers['Host'] = 'api.flutterwave.com'
            else:
                endpoint = urljoin(self.base_url, "payments")
                headers = self.session.headers
            
            print(f"Making request to: {endpoint}")
            
            response = self.session.post(
                endpoint,
                json=payment_data,
                headers=headers,
                timeout=(15, 45)  # Increased timeouts
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.ConnectTimeout as e:
            print(f"Flutterwave connection timeout: {e}")
            raise Exception("Payment service connection timeout. Please try again.")
        except requests.exceptions.Timeout as e:
            print(f"Flutterwave request timeout: {e}")
            raise Exception("Payment service is taking too long to respond.")
        except requests.exceptions.ConnectionError as e:
            print(f"Flutterwave connection error: {e}")
            raise Exception("Cannot connect to payment service. Please check your internet connection.")
        except Exception as e:
            print(f"Flutterwave payment initialization error: {e}")
            raise

    def verify_transaction(self, transaction_id=None, tx_ref=None):
        """
        Verify transaction with Flutterwave
        """
        try:
            # Resolve hostname with fallback
            resolved_host = self._resolve_dns_with_fallback('api.flutterwave.com')
            
            if transaction_id:
                if resolved_host.replace('.', '').isdigit():
                    endpoint = f"https://{resolved_host}/v3/transactions/{transaction_id}/verify"
                    headers = self.session.headers.copy()
                    headers['Host'] = 'api.flutterwave.com'
                else:
                    endpoint = urljoin(self.base_url, f"transactions/{transaction_id}/verify")
                    headers = self.session.headers
                    
                response = self.session.get(endpoint, headers=headers, timeout=25)
            elif tx_ref:
                if resolved_host.replace('.', '').isdigit():
                    endpoint = f"https://{resolved_host}/v3/transactions/verify_by_reference"
                    headers = self.session.headers.copy()
                    headers['Host'] = 'api.flutterwave.com'
                else:
                    endpoint = urljoin(self.base_url, "transactions/verify_by_reference")
                    headers = self.session.headers
                    
                response = self.session.get(endpoint, params={"tx_ref": tx_ref}, headers=headers, timeout=25)
            else:
                return None
            
            response.raise_for_status()
            return response.json()
            
        except Exception as e:
            print(f"Flutterwave verification failed: {e}")
            raise

    def test_connection(self):
        """
        Test connection to Flutterwave API
        """
        try:
            # Test DNS resolution
            resolved_host = self._resolve_dns_with_fallback('api.flutterwave.com')
            print(f"Connection test successful. Resolved to: {resolved_host}")
            return True
        except Exception as e:
            print(f"Connection test failed: {e}")
            return False

# Global instance
flutterwave_client = FlutterwaveClient()