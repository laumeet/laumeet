/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useFlutterwave.ts
import api from '@/lib/axio';
import { useState, useCallback } from 'react';

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const processSubscriptionPayment = useCallback(async (paymentData: PaymentData) => {
    setProcessing(true);
    setShowSuccessModal(false);
    setShowFailedModal(false);

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

        // ✅ Flutterwave provides "onSuccess" and "onClose" in v3 SDK
        onSuccess: async (transaction: any) => {
          console.log('Payment success:', transaction);
          try {
            const subscriptionResponse = await api.post('/subscription/subscribe', {
              plan_id: paymentData.planId,
              billing_cycle: paymentData.billingCycle,
              transaction_reference: transaction.tx_ref,
              flutterwave_transaction_id: transaction.transaction_id,
              amount: paymentData.planData.amount,
            });

            const successResult = {
              success: true,
              message: 'Payment completed successfully',
              subscription: subscriptionResponse.data,
            };

            setPaymentResult(successResult);
            setShowSuccessModal(true);
            setProcessing(false);

            // ✅ Close Flutterwave modal automatically
            if (typeof window?.FlutterwaveCheckout?.close === 'function') {
              window.FlutterwaveCheckout.close();
            }

            resolve(successResult);
          } catch (error) {
            console.error('Subscription API error:', error);
            const errorResult = {
              success: false,
              message: 'Payment successful but subscription creation failed',
            };
            setPaymentResult(errorResult);
            setShowFailedModal(true);
            setProcessing(false);
            reject(error);
          }
        },

        onClose: () => {
          console.log('Payment modal closed');
          setProcessing(false);
          reject(new Error('Payment cancelled by user'));
        },
      };

      // ✅ Initialize Flutterwave Checkout
      if (window.FlutterwaveCheckout) {
        window.FlutterwaveCheckout(config);
      } else {
        const script = document.createElement('script');
        script.src = 'https://checkout.flutterwave.com/v3.js';
        script.onload = () => {
          window.FlutterwaveCheckout(config);
        };
        script.onerror = () => {
          setProcessing(false);
          reject(new Error('Failed to load Flutterwave'));
        };
        document.body.appendChild(script);
      }
    });
  }, []);

  return {
    processing,
    showSuccessModal,
    showFailedModal,
    paymentResult,
    processSubscriptionPayment,
    setShowSuccessModal,
    setShowFailedModal,
  };
};