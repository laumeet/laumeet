/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  XCircle,
  AlertTriangle,
  RefreshCw,
  ArrowLeft,
  Home,
  CreditCard
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface PaymentError {
  code?: string;
  message: string;
  suggestion: string;
}

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams?.get('payment_id');
  const errorCode = searchParams?.get('error_code');
  const errorMessage = searchParams?.get('error_message');

  const getErrorDetails = (): PaymentError => {
    const message = errorMessage ? decodeURIComponent(errorMessage) : 'Payment processing failed';
    
    if (errorCode === 'SUBSCRIPTION_FAILED') {
      return {
        code: 'SUBSCRIPTION_FAILED',
        message: 'Payment successful but subscription activation failed',
        suggestion: 'Please contact support to activate your subscription manually.'
      };
    }

    if (message.includes('insufficient') || message.includes('balance')) {
      return {
        code: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient funds in your account',
        suggestion: 'Please check your account balance or try a different payment method.'
      };
    }

    if (message.includes('card') || message.includes('declined')) {
      return {
        code: 'CARD_DECLINED',
        message: 'Your card was declined',
        suggestion: 'Please check your card details or try a different payment card.'
      };
    }

    if (message.includes('expired')) {
      return {
        code: 'CARD_EXPIRED',
        message: 'Your card has expired',
        suggestion: 'Please update your card expiration date or use a different card.'
      };
    }

    if (message.includes('cancelled') || message.includes('canceled')) {
      return {
        code: 'USER_CANCELLED',
        message: 'Payment was cancelled',
        suggestion: "You cancelled the payment process. You can try again whenever you're ready."
      };
    }

    return {
      code: errorCode || 'UNKNOWN_ERROR',
      message: message,
      suggestion: 'Please try again or contact support if the problem persists.'
    };
  };

  const handleRetryPayment = () => {
    router.push('/subscription');
  };

  const handleContactSupport = () => {
    window.open(
      `mailto:support@laumeet.com?subject=Payment+Failed&body=Payment+ID:+${paymentId}`,
      '_blank'
    );
  };

  if (!paymentId && !errorCode) {
    router.push('/subscription');
    return null;
  }

  const errorDetails = getErrorDetails();

  return (
    <div className="min-h-screen bg-gradient-to-br pb-32 from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20">
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
                <span className="text-gray-600 dark:text-gray-400 block mb-2">
                  Message
                </span>
                <p className="font-medium text-red-700 dark:text-red-300">
                  {errorDetails.message}
                </p>
              </div>

              <div>
                <span className="text-gray-600 dark:text-gray-400 block mb-2">
                  Suggestion
                </span>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {errorDetails.suggestion}
                </p>
              </div>

              {paymentId && (
                <div className="flex justify-between items-center border-t pt-4">
                  <span className="text-gray-600 dark:text-gray-400">
                    Reference ID
                  </span>
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
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Retry Payment
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
                <strong>Need immediate help?</strong> Our support team is available
                24/7 to assist you with payment issues.
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

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <PaymentFailedContent />
    </Suspense>
  );
}