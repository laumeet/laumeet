/* eslint-disable @typescript-eslint/no-explicit-any */
// app/payment-success/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, Crown, Zap, Star, ArrowRight, Home } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCurrentPlan } from '@/hooks/useCurrentPlan';
import { useUsageStats } from '@/hooks/useUsageStats';
import api from '@/lib/axio';
import { toast } from 'sonner';

interface PaymentData {
  id: string;
  status: string;
  amount: number;
  billing_cycle: string;
  created_at: string;
  plan_name: string;
}

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentId = searchParams?.get('payment_id');
  
  const { currentPlan, hasSubscription, fetchCurrentPlan } = useCurrentPlan();
  const { fetchUsageStats } = useUsageStats();
  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (paymentId) {
      verifyPayment();
    } else {
      setLoading(false);
    }
  }, [paymentId]);

  const verifyPayment = async () => {
    if (!paymentId) return;

    try {
      setVerifying(true);
      
      // First, try to get payment status
      const paymentResponse = await api.get(`/subscription/payments/${paymentId}/status`);
      
      if (paymentResponse.data.success) {
        const paymentData = paymentResponse.data.payment;
        
        setPayment({
          id: paymentData.id,
          status: paymentData.status,
          amount: paymentData.amount,
          billing_cycle: paymentData.billing_cycle,
          created_at: paymentData.created_at,
          plan_name: getPlanNameFromPayment(paymentData)
        });

        // If payment is completed, refresh subscription data
        if (paymentData.status === 'completed') {
          await fetchCurrentPlan();
          await fetchUsageStats();
        } else if (paymentData.status === 'pending') {
          // If still pending, manually verify
          await manuallyVerifyPayment();
        }
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment status');
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const manuallyVerifyPayment = async () => {
    if (!paymentId) return;

    try {
      const verifyResponse = await api.post(`/subscription/payments/${paymentId}/verify`);
      
      if (verifyResponse.data.success) {
        toast.success('Payment verified successfully!');
        await fetchCurrentPlan();
        await fetchUsageStats();
        
        // Update payment data
        setPayment(prev => prev ? {
          ...prev,
          status: 'completed'
        } : null);
      }
    } catch (error: any) {
      console.error('Error manually verifying payment:', error);
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      }
    }
  };

  const getPlanNameFromPayment = (paymentData: any): string => {
    // Extract plan name from payment data or use current plan
    if (currentPlan?.name) return currentPlan.name;
    if (paymentData.billing_cycle === 'yearly') return 'Yearly Plan';
    return 'Monthly Plan';
  };

  const getPremiumFeatures = () => [
    'Unlimited Likes and Swipes',
    'See Who Liked You',
    'Priority Message Delivery',
    'Advanced Matching Filters',
    'Read Receipts',
    'Incognito Mode'
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Verifying your payment...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
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
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Summary */}
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
                      <span className="text-gray-600 dark:text-gray-400">Plan</span>
                      <span className="font-semibold">{payment?.plan_name || currentPlan?.name || 'Premium Plan'}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Billing Cycle</span>
                      <span className="font-semibold capitalize">{payment?.billing_cycle || currentPlan?.billing_cycle || 'monthly'}</span>
                    </div>
                    
                    {payment?.amount && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
                        <span className="font-semibold text-green-600">₦{payment.amount.toLocaleString()}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center border-t pt-4">
                      <span className="text-lg font-semibold">Status</span>
                      <Badge className="bg-green-500 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Premium Features */}
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
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                        <span className="text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Next Steps */}
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
                      <p className="text-xs text-gray-600 dark:text-gray-400">Try out your new premium tools</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-2">
                      <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Update Profile</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Stand out with premium badges</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-2">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Start Matching</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Find your perfect matches</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <Button 
                    onClick={() => router.push('/dashboard')}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                  
                  <Button 
                    onClick={() => router.push('/discover')}
                    variant="outline"
                    className="w-full"
                  >
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

                  <Button 
                    onClick={() => router.push('/')}
                    variant="ghost"
                    className="w-full"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Back to Home
                  </Button>
                </CardContent>
              </Card>

              {/* Support */}
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Need Help?</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Our support team is here to help you get the most out of your subscription.
                  </p>
                  <Button variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-100">
                    Contact Support
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Verification Notice */}
          {verifying && (
            <Card className="mt-8 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                  <p className="text-yellow-800 dark:text-yellow-200">
                    Verifying your payment... This may take a few moments.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Message */}
          {hasSubscription && currentPlan && (
            <Card className="mt-8 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-200">
                      Welcome to {currentPlan.name}!
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                      Your subscription is now active. You can manage your subscription anytime from your account settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}