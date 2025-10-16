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

interface SubscriptionResponse {
  success: boolean;
  message: string;
  subscription?: any;
}

export const useFlutterwaveHook = () => {
  const [processing, setProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const initializeFlutterwave = useCallback((config: any) => {
    return new Promise((resolve, reject) => {
      if (window.FlutterwaveCheckout) {
        window.FlutterwaveCheckout({
          ...config,
          callback: (response: any) => {
            resolve(response);
          },
          onclose: () => {
            reject(new Error('Payment cancelled by user'));
          }
        });
      } else {
        // Load Flutterwave script if not available
        const script = document.createElement('script');
        script.src = 'https://checkout.flutterwave.com/v3.js';
        script.onload = () => {
          window.FlutterwaveCheckout({
            ...config,
            callback: (response: any) => {
              resolve(response);
            },
            onclose: () => {
              reject(new Error('Payment cancelled by user'));
            }
          });
        };
        script.onerror = () => {
          reject(new Error('Failed to load Flutterwave'));
        };
        document.body.appendChild(script);
      }
    });
  }, []);

  const processSubscriptionPayment = useCallback(async (paymentData: PaymentData): Promise<SubscriptionResponse> => {
    try {
      setProcessing(true);
      
      // Get Flutterwave public key from environment variables
      const publicKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY;
      
      if (!publicKey) {
        throw new Error('Flutterwave public key not configured');
      }

      // Generate unique transaction reference
      const txRef = `SUB_${paymentData.planId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Set up payment configuration
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
          description: `${paymentData.planData.name} - ${paymentData.billingCycle === 'yearly' ? 'Yearly' : 'Monthly'} Subscription`,
          logo: '/logo.png',
        },
      };

      console.log('🔄 Initializing Flutterwave payment...', config);

      // Initialize Flutterwave payment
      const response: any = await initializeFlutterwave(config);
      
      console.log('💰 Payment response:', response);

      if (response.status === 'successful') {
        const successResponse: SubscriptionResponse = {
          success: true,
          message: 'Payment completed successfully',
          subscription: {
            id: response.transaction_id,
            plan_id: paymentData.planId,
            billing_cycle: paymentData.billingCycle,
            status: 'active',
            transaction_reference: response.tx_ref,
            flutterwave_transaction_id: response.transaction_id,
          }
        };
        await api.post("/subscription/subscribe",{plan_id:paymentData.planId,billing_cycle:paymentData.billingCycle})
        setPaymentResult(successResponse);
        setShowSuccessModal(true);
        return successResponse;
      } else {
        throw new Error(response.message || 'Payment failed');
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      const errorResponse = {
        success: false,
        message: error.message || 'Payment failed'
      };
      setPaymentResult(errorResponse);
      setShowFailedModal(true);
      // if (error.message !== 'Payment cancelled by user') {
      //   setShowFailedModal(true);
      // }
      
      throw error;
    } finally {
      setProcessing(false);
    }
  }, [initializeFlutterwave]);

  return {
    processing,
    showSuccessModal,
    showFailedModal,
    paymentResult,
    processSubscriptionPayment,
    setShowSuccessModal,
    setShowFailedModal
  };
};