/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Crown, Zap, Star, ArrowRight, Home, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/axio';
import { toast } from 'sonner';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const transactionId = searchParams?.get('transaction_id');
  const txRef = searchParams?.get('payment_id');
  const planId = searchParams?.get('plan_id');
  const billingCycle = searchParams?.get('billing_cycle');
  const amount = searchParams?.get('amount');

  const [loading, setLoading] = useState(true);
  const [subscriptionCreated, setSubscriptionCreated] = useState(false);
  const [hasProcessed, setHasProcessed] = useState(false);

  useEffect(() => {
    // Check if we've already processed this payment
    const processedPayment = sessionStorage.getItem(`processed_${txRef}`);
    
    if (txRef && planId && !hasProcessed && !processedPayment) {
      createSubscription();
    } else if (processedPayment) {
      // If already processed, just show success page
      setSubscriptionCreated(true);
      setLoading(false);
    } else {
      // Redirect back if no valid parameters
      router.push('/subscription');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txRef, planId, hasProcessed]);

  const createSubscription = async () => {
    if (!txRef || !planId || hasProcessed) return;

    try {
      setLoading(true);
      setHasProcessed(true);
      
      // Mark this payment as processed in sessionStorage
      sessionStorage.setItem(`processed_${txRef}`, 'true');
      
      const subscriptionResponse = await api.post('/subscription/subscribe', {
        plan_id: planId,
        billing_cycle: billingCycle || 'monthly',
        transaction_reference: txRef,
        flutterwave_transaction_id: transactionId,
        amount: amount ? parseFloat(amount) : 0
      });

      if (subscriptionResponse.data.success) {
        setSubscriptionCreated(true);
        toast.success('Subscription activated successfully!');
        
        // Clear URL parameters to prevent resubmission on refresh
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      } else {
        throw new Error(subscriptionResponse.data.message || 'Failed to create subscription');
      }
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      // Remove the processed marker so user can retry
      sessionStorage.removeItem(`processed_${txRef}`);
      setHasProcessed(false);
      
      toast.error('Failed to activate subscription');
      // Redirect to failed page if subscription creation fails
      router.push(`/payment-failed?payment_id=${txRef}&error_code=SUBSCRIPTION_FAILED&error_message=${encodeURIComponent(error.message || 'Subscription activation failed')}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Activating your subscription...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subscriptionCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <Loader2 className="h-12 w-12 text-gray-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Processing your subscription...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPremiumFeatures = () => [
    'Unlimited Likes and Swipes',
    'See Who Liked You',
    'Priority Message Delivery',
    'Advanced Matching Filters',
    'Read Receipts',
    'Incognito Mode',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br pb-32 from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-4">
                <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Payment Successful!
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Welcome to premium! Your subscription has been activated successfully.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Crown className="h-5 w-5" />
                    Order Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Status</span>
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>

                    {txRef && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Reference ID</span>
                        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          {txRef}
                        </span>
                      </div>
                    )}

                    {amount && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
                        <span className="font-semibold text-green-600">
                          ₦{parseFloat(amount).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-yellow-500" />
                    Your Premium Features
                  </CardTitle>
                  <CardDescription>
                    You now have access to all these amazing features
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {getPremiumFeatures().map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        <span className="text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Next Steps</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-2">
                      <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Explore Features</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Try out your new premium tools
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-2">
                      <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Update Profile</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Stand out with premium badges
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Start Matching</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Find your perfect matches
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  <Button onClick={() => router.push('/explore')} variant="outline" className="w-full">
                    Start Matching
                    <Zap className="h-4 w-4 ml-2" />
                  </Button>

                  <Button
                    onClick={() => router.push('/subscription')}
                    variant="outline"
                    className="w-full"
                  >
                    View Subscription
                    <Crown className="h-4 w-4 ml-2" />
                  </Button>

                  <Button onClick={() => router.push('/')} variant="ghost" className="w-full">
                    <Home className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Need Help?</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Our support team is here to help you get the most out of your subscription.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                    onClick={() =>
                      window.open('mailto:support@laumeet.com?subject=Payment+Support', '_blank')
                    }
                  >
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}