// components/FlutterwavePayment.tsx
'use client';

import { Button } from '@/components/ui/button';
interface FlutterwavePaymentProps {
  onPay: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function FlutterwavePayment({ 
  onPay, 
  disabled, 
  children 
}: FlutterwavePaymentProps) {
  return (
    <Button onClick={onPay} disabled={disabled}>
      {children}
    </Button>
  );
}