import os
import requests

class FlutterwaveClient:
    """
    Handles Flutterwave API operations using a clean, reusable client pattern.
    Automatically reads the secret key from environment variables.
    """

    BASE_URL = "https://api.flutterwave.com/v3"

    def __init__(self, secret_key=None):
        self.secret_key = secret_key or os.getenv("FLW_SECRET_KEY")
        if not self.secret_key:
            raise ValueError(
                "⚠️ Missing Flutterwave secret key. Please set FLW_SECRET_KEY in your environment."
            )
        self.headers = {
            "Authorization": f"Bearer {self.secret_key}",
            "Content-Type": "application/json"
        }

    # -------------------------------------------------------------------------
    # Initialize Payment
    # -------------------------------------------------------------------------
    def init_payment(self, payload: dict):
        """
        Initializes a new payment session on Flutterwave.
        """
        url = f"{self.BASE_URL}/payments"
        try:
            response = requests.post(url, json=payload, headers=self.headers, timeout=20)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"❌ Flutterwave payment initialization error: {e}")
            raise Exception("Failed to initialize payment with Flutterwave")

    # -------------------------------------------------------------------------
    # Verify Transaction
    # -------------------------------------------------------------------------
    def verify_transaction(self, transaction_id=None, tx_ref=None):
        """
        Verifies a payment transaction by ID or reference.
        """
        if not transaction_id and not tx_ref:
            raise ValueError("transaction_id or tx_ref must be provided for verification")

        if transaction_id:
            url = f"{self.BASE_URL}/transactions/{transaction_id}/verify"
        else:
            url = f"{self.BASE_URL}/transactions/verify_by_reference?tx_ref={tx_ref}"

        try:
            response = requests.get(url, headers=self.headers, timeout=20)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"❌ Flutterwave verification error: {e}")
            raise Exception("Failed to verify Flutterwave transaction")

    # -------------------------------------------------------------------------
    # Refund Transaction
    # -------------------------------------------------------------------------
    def refund_transaction(self, transaction_id, amount=None):
        """
        Optionally issue a refund for a specific transaction.
        """
        url = f"{self.BASE_URL}/transactions/{transaction_id}/refund"
        data = {"amount": amount} if amount else {}
        try:
            response = requests.post(url, json=data, headers=self.headers, timeout=20)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"❌ Flutterwave refund error: {e}")
            raise Exception("Failed to refund Flutterwave transaction")

    # -------------------------------------------------------------------------
    # Bank List (Optional Helper)
    # -------------------------------------------------------------------------
    def get_banks(self, country="NG"):
        """
        Fetches list of banks from Flutterwave (optional helper).
        """
        url = f"{self.BASE_URL}/banks/{country}"
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            print(f"❌ Flutterwave bank fetch error: {e}")
            raise Exception("Failed to fetch bank list from Flutterwave")


# =============================================================================
# Singleton-style Accessor
# =============================================================================

_flutterwave_client_instance = None

def get_flutterwave_client():
    """
    Returns a single, shared instance of the FlutterwaveClient.
    Ensures the same client is reused across your app.
    """
    global _flutterwave_client_instance
    if _flutterwave_client_instance is None:
        _flutterwave_client_instance = FlutterwaveClient()
    return _flutterwave_client_instance