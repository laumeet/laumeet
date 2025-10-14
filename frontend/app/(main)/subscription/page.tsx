// app/subscription/page.tsx
'use client';

import { useState } from 'react';
import { Crown, Star, Zap, CheckCircle, Loader2, Calendar, Infinity, MessageCircle, Heart, Hand } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { PlanCard } from '@/components/subscription/PlanCard';
import { BillingCycleToggle } from '@/components/subscription/BillingCycleToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<{id: string, cycle: 'monthly' | 'yearly'} | null>(null);

  const {
    plans,
    currentSubscription,
    usageStats,
    loading,
    error,
    subscribe,
    fetchUsageStats,
    hasSubscription,
    clearError
  } = useSubscription();

  const handleSubscribe = async (planId: string, cycle: 'monthly' | 'yearly') => {
    try {
      setSelectedPlan({ id: planId, cycle });

      const result = await subscribe(planId, cycle);

      if (result?.checkout_url) {
        // Redirect to Flutterwave checkout
        window.location.href = result.checkout_url;
      } else {
        // Payment was completed immediately (mock payment or direct)
        await fetchUsageStats();

        toast.success('Subscription activated successfully!', {
          description: `You now have access to premium features.`,
        });
      }

      setSelectedPlan(null);

    } catch (error: any) {
      console.error('Subscription error:', error);

      if (error.message !== 'Payment cancelled by user') {
        toast.error('Subscription failed', {
          description: error.message || 'Please try again or contact support if the issue persists.',
        });
      }

      setSelectedPlan(null);
    }
  };

  // Clear errors when they occur
  if (error) {
    toast.error('Error', {
      description: error,
    });
    clearError();
  }

  return (
    <div className="container mx-auto p-6 pb-32 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Upgrade Your Experience
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Get more matches, unlimited likes, and premium features to enhance your dating experience.
        </p>

        <BillingCycleToggle
          billingCycle={billingCycle}
          onBillingCycleChange={setBillingCycle}
        />
      </div>

      {/* Payment Modal Overlay */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-6 w-6 text-yellow-500" />
                Complete Your Subscription
              </CardTitle>
              <CardDescription>
                You&apos;re about to subscribe to {plans.find(p => p.id === selectedPlan.id)?.name} plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ₦{(() => {
                    const plan = plans.find(p => p.id === selectedPlan.id);
                    return selectedPlan.cycle === 'yearly'
                      ? plan?.pricing.yearly.toLocaleString()
                      : plan?.pricing.monthly.toLocaleString();
                  })()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedPlan.cycle === 'yearly' ? 'Per Year' : 'Per Month'}
                </p>
              </div>

              <Button
                className="w-full"
                onClick={() => handleSubscribe(selectedPlan.id, selectedPlan.cycle)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSelectedPlan(null)}
                disabled={loading}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Plan & Usage Section */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Plan Card */}
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
              {hasSubscription && currentSubscription ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-lg">{currentSubscription.plan.name}</span>
                    <Badge variant="default" className="bg-green-500">
                      Active
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span>Renews: {new Date(currentSubscription.dates.end_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      <span>{currentSubscription.days_remaining} days remaining</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Billing:</span>
                      <span className="capitalize">{currentSubscription.billing_cycle}</span>
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

          {/* Usage Statistics */}
          {usageStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Your Usage
                </CardTitle>
                <CardDescription>
                  Usage reset in {currentSubscription?.days_remaining || 30} days
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
                      {usageStats.messages.used} / {usageStats.messages.limit === -1 ? '∞' : usageStats.messages.limit}
                    </span>
                  </div>
                  <Progress
                    value={(usageStats.messages.used / (usageStats.messages.limit === -1 ? 100 : usageStats.messages.limit)) * 100}
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
                      {usageStats.likes.used} / {usageStats.likes.limit === -1 ? '∞' : usageStats.likes.limit}
                    </span>
                  </div>
                  <Progress
                    value={(usageStats.likes.used / (usageStats.likes.limit === -1 ? 100 : usageStats.likes.limit)) * 100}
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
                      {usageStats.swipes.used} / {usageStats.swipes.limit === -1 ? '∞' : usageStats.swipes.limit}
                    </span>
                  </div>
                  <Progress
                    value={(usageStats.swipes.used / (usageStats.swipes.limit === -1 ? 100 : usageStats.swipes.limit)) * 100}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Benefits Card */}
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
        </div>

        {/* Subscription Plans */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading plans...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.map((plan) => {
                const isCurrentPlan = currentSubscription?.plan?.id === plan.id;
                const isFreePlan = plan.tier === 'free';

                return (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    currentPlan={isCurrentPlan}
                    billingCycle={billingCycle}
                    onSubscribe={(planId, cycle) => {
                      if (!isCurrentPlan && !isFreePlan) {
                        setSelectedPlan({ id: planId, cycle });
                      }
                    }}
                    loading={loading && selectedPlan?.id === plan.id}
                    disabled={isCurrentPlan || isFreePlan}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add the missing Eye icon component
function Eye(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}