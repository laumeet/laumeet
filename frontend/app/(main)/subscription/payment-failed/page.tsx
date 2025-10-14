/* eslint-disable @typescript-eslint/no-explicit-any */
// app/payment-failed/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle, AlertTriangle, RefreshCw, ArrowLeft, Home, CreditCard } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axio';
import { toast } from 'sonner';

interface PaymentError {
  code?: string;
  message: string;
  suggestion: string;
}

export default function PaymentFailedPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams?.get('payment_id');
  const errorCode = searchParams?.get('error_code');
  const errorMessage = searchParams?.get('error_message');
  
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (paymentId) {
      fetchPaymentDetails();
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    if (!paymentId) return;

    try {
      const response = await api.get(`/subscription/payments/${paymentId}/status`);
      
      if (response.data.success) {
        setPayment(response.data.payment);
      }
    } catch (error) {
      console.error('Error fetching payment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getErrorDetails = (): PaymentError => {
    // Map specific error codes to user-friendly messages
    if (payment?.failure_reason) {
      const reason = payment.failure_reason.toLowerCase();
      
      if (reason.includes('insufficient') || reason.includes('balance')) {
        return {
          code: 'INSUFFICIENT_FUNDS',
          message: 'Insufficient funds in your account',
          suggestion: 'Please check your account balance or try a different payment method.'
        };
      }
      
      if (reason.includes('card') || reason.includes('declined')) {
        return {
          code: 'CARD_DECLINED',
          message: 'Your card was declined',
          suggestion: 'Please check your card details or try a different payment card.'
        };
      }
      
      if (reason.includes('expired')) {
        return {
          code: 'CARD_EXPIRED',
          message: 'Your card has expired',
          suggestion: 'Please update your card expiration date or use a different card.'
        };
      }
      
      if (reason.includes('security') || reason.includes('fraud')) {
        return {
          code: 'SECURITY_VIOLATION',
          message: 'Security check failed',
          suggestion: 'Please contact your bank or try a different payment method.'
        };
      }
      
      if (reason.includes('cancelled') || reason.includes('canceled')) {
        return {
          code: 'USER_CANCELLED',
          message: 'Payment was cancelled',
          suggestion: 'You cancelled the payment process. You can try again whenever you\'re ready.'
        };
      }
    }

    // Default error message
    return {
      code: errorCode || 'UNKNOWN_ERROR',
      message: errorMessage || payment?.failure_reason || 'Payment processing failed',
      suggestion: 'Please try again or contact support if the problem persists.'
    };
  };

  const handleRetryPayment = async () => {
    if (!paymentId) {
      router.push('/subscription');
      return;
    }

    try {
      setRetrying(true);
      
      // In a real implementation, you might want to create a new payment
      // or redirect to the subscription page to start over
      router.push('/subscription');
      
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast.error('Failed to retry payment');
    } finally {
      setRetrying(false);
    }
  };

  const handleContactSupport = () => {
    // In a real app, this would open a support chat or email
    window.open('mailto:support@laumeet.com?subject=Payment+Failed&body=Payment+ID:+' + paymentId, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading payment details...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const errorDetails = getErrorDetails();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4">
                <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Payment Failed
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              We couldn&apos;t process your payment. Please try again.
            </p>
          </div>

          {/* Error Details Card */}
          <Card className="mb-6 border-red-200 dark:border-red-800">
            <CardHeader className="bg-red-50 dark:bg-red-900/20">
              <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <AlertTriangle className="h-5 w-5" />
                Payment Error Details
              </CardTitle>
              <CardDescription>
                Here&apos;s what went wrong with your payment
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-gray-400">Error Type</span>
                <Badge variant="destructive" className="bg-red-500 text-white">
                  {errorDetails.code || 'Unknown Error'}
                </Badge>
              </div>
              
              <div>
                <span className="text-gray-600 dark:text-gray-400 block mb-2">Message</span>
                <p className="font-medium text-red-700 dark:text-red-300">{errorDetails.message}</p>
              </div>
              
              <div>
                <span className="text-gray-600 dark:text-gray-400 block mb-2">Suggestion</span>
                <p className="text-sm text-gray-700 dark:text-gray-300">{errorDetails.suggestion}</p>
              </div>

              {paymentId && (
                <div className="flex justify-between items-center border-t pt-4">
                  <span className="text-gray-600 dark:text-gray-400">Reference ID</span>
                  <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {paymentId}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Retry Payment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  Try Again
                </CardTitle>
                <CardDescription>
                  Retry your payment with the same details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleRetryPayment}
                  disabled={retrying}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {retrying ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Retry Payment
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Get Help
                </CardTitle>
                <CardDescription>
                  Contact our support team for assistance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleContactSupport}
                  variant="outline"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                >
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Common Solutions */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Common Solutions</CardTitle>
              <CardDescription>
                Try these steps if you&apos;re having payment issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2 mt-1">
                  <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">Check Card Details</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Ensure your card number, expiration date, and CVV are correct.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-2 mt-1">
                  <RefreshCw className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium">Sufficient Funds</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Make sure your account has enough balance to cover the payment.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-2 mt-1">
                  <AlertTriangle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">Bank Restrictions</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Some banks block online transactions. Contact your bank to authorize the payment.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-orange-100 dark:bg-orange-900/30 rounded-full p-2 mt-1">
                  <CreditCard className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="font-medium">Try Different Method</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use a different credit/debit card or payment method.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={() => router.push('/subscription')}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Subscription
            </Button>
            
            <Button 
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="flex-1"
            >
              Go to Dashboard
            </Button>
            
            <Button 
              onClick={() => router.push('/')}
              variant="ghost"
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Support Notice */}
          <Card className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6 text-center">
              <p className="text-blue-800 dark:text-blue-200">
                <strong>Need immediate help?</strong> Our support team is available 24/7 to assist you with payment issues.
              </p>
              <Button 
                onClick={handleContactSupport}
                variant="link" 
                className="text-blue-600 dark:text-blue-400 mt-2"
              >
                Contact Support Team →
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}