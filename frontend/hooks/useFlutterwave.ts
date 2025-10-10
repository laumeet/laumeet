/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useFlutterwave.ts
import { useState } from 'react';
import api from '@/lib/axio';

declare global {
  interface Window {
    FlutterwaveCheckout: any;
  }
}

export const useFlutterwaveHook = () => {
  const [processing, setProcessing] = useState(false);

  const loadFlutterwaveScript = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Window is not defined'));
        return;
      }

      if (window.FlutterwaveCheckout) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.flutterwave.com/v3.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Flutterwave script'));
      document.head.appendChild(script);
    });
  };

  const processSubscriptionPayment = async (
    planId: string,
    billingCycle: 'monthly' | 'yearly',
    userEmail: string,
    userName: string,
    userPhone: string = '+2348000000000'
  ) => {
    try {
      setProcessing(true);

      // First, create the subscription on our backend
      const subscriptionResponse = await api.post('/subscription/subscribe', {
        plan_id: planId,
        billing_cycle: billingCycle,
        payment_provider: 'flutterwave'
      });

      if (!subscriptionResponse.data.success) {
        throw new Error(subscriptionResponse.data.message || 'Failed to create subscription');
      }

      const { payment_id, amount: finalAmount, currency } = subscriptionResponse.data;

      // Load Flutterwave script
      await loadFlutterwaveScript();

      return new Promise((resolve, reject) => {
        const flutterwaveConfig = {
          public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY!,
          tx_ref: `payment_${payment_id}`,
          amount: finalAmount,
          currency: currency || 'NGN',
          payment_options: 'card, banktransfer, ussd',
          customer: {
            email: userEmail,
            name: userName,
            phone_number: userPhone,
          },
          customizations: {
            title: 'LauMeet Subscription',
            description: `Subscription payment for ${billingCycle} plan`,
            logo: `${window.location.origin}/logo.png`,
          },
          callback: (response: any) => {
            if (response.status === 'successful') {
              resolve(response);
            } else {
              reject(new Error(`Payment failed: ${response.status}`));
            }
            setProcessing(false);
          },
          onclose: () => {
            reject(new Error('Payment cancelled by user'));
            setProcessing(false);
          },
        };

        // Initialize Flutterwave checkout
        window.FlutterwaveCheckout(flutterwaveConfig);
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      setProcessing(false);
      throw error;
    }
  };

  return {
    processing,
    processSubscriptionPayment,
  };
};