/* eslint-disable @typescript-eslint/no-explicit-any */
// components/FlutterwavePayment.tsx
'use client';

import { useEffect } from 'react';

interface FlutterwavePaymentProps {
  isOpen: boolean;
  onSuccess: (response: any) => void;
  onClose: () => void;
  paymentData: {
    publicKey: string;
    amount: number;
    currency: string;
    paymentOptions: string;
    customer: {
      email: string;
      name: string;
    };
    customizations: {
      title: string;
      description: string;
      logo: string;
    };
    txRef: string;
  };
}

export function FlutterwavePayment({ 
  isOpen, 
  onSuccess, 
  onClose, 
  paymentData 
}: FlutterwavePaymentProps) {
  useEffect(() => {
    if (isOpen && window.FlutterwaveCheckout) {
      const config = {
        public_key: paymentData.publicKey,
        tx_ref: paymentData.txRef,
        amount: paymentData.amount,
        currency: paymentData.currency,
        payment_options: paymentData.paymentOptions,
        customer: paymentData.customer,
        customizations: paymentData.customizations,
        callback: (response: any) => {
          console.log('Payment response:', response);
          if (response.status === 'successful') {
            onSuccess(response);
          } else {
            onClose();
          }
        },
        onclose: () => {
          onClose();
        },
      };

      window.FlutterwaveCheckout(config);
    }
  }, [isOpen, paymentData, onSuccess, onClose]);

  return null;
}