/* eslint-disable @typescript-eslint/no-explicit-any */
// lib/flutterwave.ts
import { useFlutterwave, closePaymentModal } from 'flutterwave-react-v3';

export interface FlutterwaveConfig {
  public_key: string;
  tx_ref: string;
  amount: number;
  currency: string;
  payment_options: string;
  customer: {
    email: string;
    name: string;
    phone_number?: string;
  };
  customizations: {
    title: string;
    description: string;
    logo: string;
  };
}

export interface FlutterwaveResponse {
  status: 'successful' | 'cancelled';
  transaction_id: string;
  tx_ref: string;
  currency: string;
  amount: number;
}

// Create a wrapper hook that properly handles the Flutterwave configuration
export const useFlutterwavePayment = () => {
  const initializePayment = useFlutterwave();

  const processPayment = (config: Omit<FlutterwaveConfig, 'public_key'>): Promise<FlutterwaveResponse> => {
    return new Promise((resolve, reject) => {
      const flutterwaveConfig: FlutterwaveConfig = {
        ...config,
        public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
      };

      // Initialize the payment with the config
      const payment = initializePayment({
        ...flutterwaveConfig,
        callback: (response: any) => {
          if (response.status === 'successful') {
            resolve(response);
          } else {
            reject(new Error(`Payment failed: ${response.status}`));
          }
          closePaymentModal();
        },
        onClose: () => {
          reject(new Error('Payment cancelled by user'));
        },
      });

      // Call the payment function to open the modal
      payment({
        callback: (response: any) => {
          if (response.status === 'successful') {
            resolve(response);
          } else {
            reject(new Error(`Payment failed: ${response.status}`));
          }
          closePaymentModal();
        },
        onClose: () => {
          reject(new Error('Payment cancelled by user'));
        },
      });
    });
  };

  return { processPayment };
};