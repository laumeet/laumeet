/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface PaymentData {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  userData: {
    email: string;
    name: string;
  };
  planData: {
    name: string;
    amount: number;
    description: string;
  };
}

export const useFlutterwaveHook = () => {
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  const processSubscriptionPayment = useCallback(async (paymentData: PaymentData) => {
    setProcessing(true);

    return new Promise((resolve, reject) => {
      const publicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
      if (!publicKey) {
        setProcessing(false);
        reject(new Error('Flutterwave public key not configured'));
        return;
      }

      const txRef = `SUB_${paymentData.planId}_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const config = {
        public_key: publicKey,
        tx_ref: txRef,
        amount: paymentData.planData.amount,
        currency: 'NGN',
        payment_options: 'card, banktransfer, ussd',
        customer: {
          email: paymentData.userData.email,
          name: paymentData.userData.name,
        },
        customizations: {
          title: 'Dating App Subscription',
          description: `${paymentData.planData.name} - ${
            paymentData.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'
          } Subscription`,
          logo: '/logo.png',
        },
        redirect_url: `${window.location.origin}/payment-success?payment_id=${txRef}&plan_id=${paymentData.planId}&billing_cycle=${paymentData.billingCycle}&amount=${paymentData.planData.amount}`,
      };

      // Initialize Flutterwave
      const startFlutterwave = () => {
        try {
          (window as any).FlutterwaveCheckout({
            ...config,
            callback: function(response: any) {
              console.log('Flutterwave callback:', response);
              if (response.status === 'successful') {
                // Redirect to success page - API will be called there
                router.push(`/payment-success?payment_id=${response.tx_ref}&transaction_id=${response.transaction_id}&plan_id=${paymentData.planId}&billing_cycle=${paymentData.billingCycle}&amount=${paymentData.planData.amount}`);
                resolve(response);
              } else {
                // Redirect to failed page with error details
                router.push(`/payment-failed?payment_id=${response.tx_ref}&error_code=PAYMENT_FAILED&error_message=${encodeURIComponent(response.message || 'Payment failed')}`);
                reject(new Error(response.message || 'Payment failed'));
              }
            },
            onclose: function() {
              console.log('Payment modal closed by user');
              setProcessing(false);
              reject(new Error('Payment cancelled by user'));
            }
          });
        } catch (err) {
          console.error('Error initializing Flutterwave:', err);
          setProcessing(false);
          reject(err);
        }
      };

      // If Flutterwave script already loaded
      if ((window as any).FlutterwaveCheckout) {
        startFlutterwave();
      } else {
        const script = document.createElement('script');
        script.src = 'https://checkout.flutterwave.com/v3.js';
        script.onload = startFlutterwave;
        script.onerror = () => {
          setProcessing(false);
          reject(new Error('Failed to load Flutterwave script'));
        };
        document.body.appendChild(script);
      }
    });
  }, [router]);

  return {
    processing,
    processSubscriptionPayment,
  };
};