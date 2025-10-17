/* eslint-disable @typescript-eslint/no-explicit-any */
// app/subscription/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Crown, Star, Zap, CheckCircle, Loader2, Calendar, Infinity, MessageCircle, Heart, Hand, X, Check, Eye, Filter, UserCheck, BadgeCheck } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageStats } from '@/hooks/useUsageStats';
import { useCurrentPlan } from '@/hooks/useCurrentPlan';
import { useFlutterwaveHook } from '@/hooks/useFlutterwave';
import { useProfile } from '@/hooks/get-profile';
import { useUserSubscription } from '@/hooks/useUserSubscription';
import { PlanCard } from '@/components/subscription/PlanCard';
import { BillingCycleToggle } from '@/components/subscription/BillingCycleToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { plans, loading: plansLoading } = useSubscription();
  const { usage } = useUsageStats();
  const { currentPlan, hasSubscription, loading: planLoading } = useCurrentPlan();
  const { 
    processing, 
    processSubscriptionPayment, 
    showSuccessModal,
    showFailedModal,
    setShowFailedModal,
    setShowSuccessModal,
    paymentResult,
  } = useFlutterwaveHook();
  const { profile } = useProfile();
  const { subscription: userSubscription, fetchUserSubscription } = useUserSubscription(profile?.id);

  // Check if user has an active subscription
  const hasActiveSubscription = userSubscription?.has_subscription && 
                               userSubscription.subscription?.is_active && 
                               userSubscription.subscription?.status === 'active';

  // Refetch user subscription when payment is successful
  useEffect(() => {
    if (showSuccessModal && profile?.id) {
      fetchUserSubscription(profile.id);
    }
  }, [showSuccessModal, profile?.id, fetchUserSubscription]);

  const handleSubscribe = async (planId: string, cycle: 'monthly' | 'yearly') => {
    if (!profile) {
      toast.error('Please login to subscribe');
      return;
    }

    // For free plan, handle differently
    const plan = plans.find(p => p.id === planId);
    if (plan?.tier === 'free') {
      try {
        setIsSubscribing(true);
        // Call your API to switch to free plan
        await api.post("/subscription/subscribe", {
          plan_id: planId,
          billing_cycle: cycle
        });
        toast.success('Switched to free plan successfully');
        fetchUserSubscription(profile.id);
      } catch (error) {
        console.error('Free plan switch error:', error);
        toast.error('Failed to switch plan');
      } finally {
        setIsSubscribing(false);
      }
      return;
    }

    // For paid plans
    try {
      if (!plan) return;

      // Prepare user data for payment
      const userData = {
        email: profile.email || "user@example.com",
        name: profile.username || profile.name || 'User',
      };

      // Prepare plan data
      const planData = {
        name: plan.name,
        amount: cycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly,
        description: plan.description,
      };

      console.log('🔄 Starting payment process...', { planId, cycle, userData, planData });

      // Process payment using Flutterwave
      await processSubscriptionPayment({
        planId,
        billingCycle: cycle,
        userData,
        planData
      });

      // Refresh subscription data after successful payment
      fetchUserSubscription(profile.id);

    } catch (error: any) {
      console.error('❌ Subscription error:', error);

      if (error.message !== 'Payment cancelled by user') {
        toast.error('Subscription failed', {
          description: error.message || 'Please try again or contact support if the issue persists.',
        });
      }
    }
  };

  const loading = plansLoading || planLoading;

  return (
    <div className="container mx-auto p-6 pb-32 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {hasActiveSubscription ? 'Your Subscription' : 'Upgrade Your Experience'}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          {hasActiveSubscription 
            ? 'Manage your subscription and track your usage.' 
            : 'Get more matches, unlimited likes, and premium features to enhance your dating experience.'
          }
        </p>

        {/* Only show billing toggle if user doesn't have active subscription */}
        {!hasActiveSubscription && (
          <BillingCycleToggle 
            billingCycle={billingCycle} 
            onBillingCycleChange={setBillingCycle} 
          />
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-green-600">Payment Successful!</CardTitle>
              <CardDescription>
                Your subscription has been activated successfully
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              {paymentResult?.subscription && (
                <div className="space-y-2 text-sm">
                  <p><strong>Plan:</strong> {paymentResult.subscription.plan_id}</p>
                  <p><strong>Transaction ID:</strong> {paymentResult.subscription.flutterwave_transaction_id}</p>
                  <p><strong>Reference:</strong> {paymentResult.subscription.transaction_reference}</p>
                </div>
              )}
              <Button 
                onClick={() => {
                  setShowSuccessModal(false);
                  fetchUserSubscription(profile?.id);
                }}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Failed Modal */}
      {showFailedModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <X className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Payment Failed</CardTitle>
              <CardDescription>
                {paymentResult?.message || 'Your payment could not be processed'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <div className="text-sm text-gray-600">
                <p>Please try again or contact support if the issue persists.</p>
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => setShowFailedModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => setShowFailedModal(false)}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment Processing Modal */}
      {processing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <CardTitle>Processing Payment</CardTitle>
              <CardDescription>
                Please wait while we process your payment...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-600">
                You will be redirected to Flutterwave to complete your payment.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan & Usage Section */}
        <div className={`${hasActiveSubscription ? 'lg:col-span-3' : 'lg:col-span-1'} space-y-6`}>
          {/* Enhanced Current Plan Card for Active Subscribers */}
          {hasActiveSubscription && userSubscription?.subscription ? (
            <Card className="border-2 border-green-200 dark:border-green-800">
              <CardHeader className="bg-gradient-to-r p-6 from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300 text-2xl">
                      <Crown className="h-7 w-7" />
                      {userSubscription.subscription.plan.name}
                    </CardTitle>
                    <CardDescription className="text-lg mt-2">
                      Your active subscription details
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="bg-green-500 text-white px-3 py-1 text-sm">
                    Active
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Plan Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="h-5 w-5" />
                      <span className="font-medium">Start Date</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {new Date(userSubscription.subscription.dates.start_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Calendar className="h-5 w-5" />
                      <span className="font-medium">Renewal Date</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {new Date(userSubscription.subscription.dates.end_date).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <span className="font-medium">Days Remaining</span>
                    </div>
                    <p className="text-lg font-semibold">{userSubscription.subscription.days_remaining} days</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Billing Cycle</span>
                    </div>
                    <p className="text-lg font-semibold capitalize">{userSubscription.subscription.billing_cycle}</p>
                  </div>
                </div>

                {/* Plan Features */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Plan Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userSubscription.subscription.plan.features.can_see_who_liked_you && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Eye className="h-5 w-5 text-green-500" />
                        <span>See Who Liked You</span>
                      </div>
                    )}
                    {userSubscription.subscription.plan.features.has_priority_matching && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Zap className="h-5 w-5 text-green-500" />
                        <span>Priority Matching</span>
                      </div>
                    )}
                    {userSubscription.subscription.plan.features.has_read_receipts && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span>Read Receipts</span>
                      </div>
                    )}
                    {userSubscription.subscription.plan.features.has_verified_badge && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <BadgeCheck className="h-5 w-5 text-green-500" />
                        <span>Verified Badge</span>
                      </div>
                    )}
                    {userSubscription.subscription.plan.features.has_advanced_filters && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <Filter className="h-5 w-5 text-green-500" />
                        <span>Advanced Filters</span>
                      </div>
                    )}
                    {userSubscription.subscription.plan.features.has_incognito_mode && (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <UserCheck className="h-5 w-5 text-green-500" />
                        <span>Incognito Mode</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Original Current Plan Card for non-subscribers */
            <Card className="border-2 pt-0 border-blue-200 dark:border-blue-800">
              <CardHeader className="bg-gradient-to-r p-2 from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <CheckCircle className="h-5 w-5" />
                  {hasSubscription ? 'Your Current Plan' : 'Current Plan'}
                </CardTitle>
                <CardDescription>
                  {hasSubscription 
                    ? 'Your active subscription details' 
                    : 'You are currently on the free plan'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {hasSubscription && currentPlan ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg">{currentPlan.name}</span>
                      <Badge variant="default" className="bg-green-500">
                        Active
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span>Renews: {new Date(currentPlan.dates.end_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span>{currentPlan.days_remaining} days remaining</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">Billing:</span>
                        <span className="capitalize">{currentPlan.billing_cycle}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-3 w-12 h-12 mx-auto mb-3">
                      <Crown className="h-6 w-6 text-gray-500 mx-auto" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Free Plan</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Basic features to get you started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Usage Statistics */}
          {usage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Your Usage
                </CardTitle>
                <CardDescription>
                  Usage reset in {currentPlan?.days_remaining || 30} days
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Messages */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Messages</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {usage.messages.used} / {usage.messages.limit === -1 ? '∞' : usage.messages.limit}
                    </span>
                  </div>
                  <Progress 
                    value={(usage.messages.used / (usage.messages.limit === -1 ? 100 : Math.max(usage.messages.limit, 1))) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Likes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Likes</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {usage.likes.used} / {usage.likes.limit === -1 ? '∞' : usage.likes.limit}
                    </span>
                  </div>
                  <Progress 
                    value={(usage.likes.used / (usage.likes.limit === -1 ? 100 : Math.max(usage.likes.limit, 1))) * 100} 
                    className="h-2"
                  />
                </div>

                {/* Swipes */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Hand className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Swipes</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      {usage.swipes.used} / {usage.swipes.limit === -1 ? '∞' : usage.swipes.limit}
                    </span>
                  </div>
                  <Progress 
                    value={(usage.swipes.used / (usage.swipes.limit === -1 ? 100 : Math.max(usage.swipes.limit, 1))) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits Card - Only show for non-subscribers */}
          {!hasActiveSubscription && (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <Star className="h-5 w-5" />
                  Premium Benefits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Infinity className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Unlimited Likes & Swipes</span>
                </div>
                <div className="flex items-center gap-3">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Priority Message Delivery</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Advanced Matching Filters</span>
                </div>
                <div className="flex items-center gap-3">
                  <Eye className="h-4 w-4 text-green-500" />
                  <span className="text-sm">See Who Liked You</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Subscription Plans - Only show if user doesn't have active subscription */}
        {!hasActiveSubscription && (
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-2 text-gray-600">Loading plans...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map((plan) => {
                  const isCurrentPlan = currentPlan?.tier === plan.tier;
                  const isFreePlan = plan.tier === 'free';

                  return (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      currentPlan={isCurrentPlan}
                      billingCycle={billingCycle}
                      onSubscribe={handleSubscribe}
                      loading={processing || isSubscribing}
                      disabled={isCurrentPlan || (isFreePlan && !isCurrentPlan)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Add global type for Flutterwave
declare global {
  interface Window {
    FlutterwaveCheckout: any;
  }
}