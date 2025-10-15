
// hooks/useFlutterwave.ts
import { useState } from 'react';
import api from '@/lib/axio';

export const useFlutterwaveHook = () => {
  const [processing, setProcessing] = useState(false);

  const processSubscriptionPayment = async (
    planId: string,
    billingCycle: 'monthly' | 'yearly',
  ) => {
    try {
      setProcessing(true);

      // Create the subscription on your backend
      const subscriptionResponse = await api.post('/subscription/subscribe', {
        plan_id: planId,
        billing_cycle: billingCycle,
        payment_provider: 'flutterwave',
        success_url: 'http://localhost:3000/payment-success',
        failure_url: 'http://localhost:3000/payment-failed'
      });

      const data = subscriptionResponse.data;
      console.log('Sub data', data);

      if (!data.success) {
        throw new Error(data.message || 'Failed to create subscription');
      }

      // For mock payments, return success immediately
      if (data.subscription) {
        return data;
      }

      // Redirect user to Flutterwave hosted checkout
      const checkoutUrl = data.checkout_url;
      if (!checkoutUrl) {
        throw new Error('No checkout URL returned from backend');
      }

      // Redirect user to Flutterwave's hosted payment page
      window.location.href = checkoutUrl;

      return data;
    } catch (error) {
      console.error('Payment processing error:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  };

  return {
    processing,
    processSubscriptionPayment,
  };
};