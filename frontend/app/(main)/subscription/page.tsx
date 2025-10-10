/* eslint-disable @typescript-eslint/no-explicit-any */
// app/subscription/page.tsx
'use client';

import { useState } from 'react';
import { Crown, Star, Zap, CheckCircle, Loader2 } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useUsageStats } from '@/hooks/useUsageStats';
import { useFlutterwaveHook } from '@/hooks/useFlutterwave';
import { FlutterwavePayment } from '@/components/FlutterwavePayment';
import { PlanCard } from '@/components/subscription/PlanCard';
import { UsageMeter } from '@/components/subscription/UsageMeter';
import { BillingCycleToggle } from '@/components/subscription/BillingCycleToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<{id: string, cycle: 'monthly' | 'yearly'} | null>(null);
  const { plans, currentSubscription, loading, fetchCurrentSubscription } = useSubscription();
  const { usage, fetchUsageStats } = useUsageStats();
  const { processing, processSubscriptionPayment } = useFlutterwaveHook();

  const userData = {
    email: 'user@example.com',
    name: 'John Doe',
    phone: '+2348000000000',
  };

  const handleSubscribe = async (planId: string, cycle: 'monthly' | 'yearly') => {
    try {
      const plan = plans.find(p => p.id === planId);
      if (!plan) return;

      setSelectedPlan({ id: planId, cycle });
      
      await processSubscriptionPayment(
        planId, 
        cycle, 
        userData.email, 
        userData.name, 
        userData.phone
      );
      
      // If we get here, payment was successful
      await fetchCurrentSubscription();
      await fetchUsageStats();
      
      toast.success('Subscription activated successfully!', {
        description: `You now have access to ${plan.name} features.`,
      });
      
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

  const currentPlan = plans.find(p => p.tier === currentSubscription?.plan?.tier);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Choose Your Plan
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Unlock premium features and connect with more people. 
          {billingCycle === 'yearly' && ' Get 2 months free when you choose yearly billing!'}
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
              
              <FlutterwavePayment
                onPay={() => handleSubscribe(selectedPlan.id, selectedPlan.cycle)}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Proceed to Payment'
                )}
              </FlutterwavePayment>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setSelectedPlan(null)}
                disabled={processing}
              >
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Rest of the content remains exactly the same as before */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Usage Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Current Plan Card */}
          {currentSubscription && (
            <Card className="bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Current Plan
                </CardTitle>
                <CardDescription>
                  Your active subscription details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{currentSubscription.plan.name}</span>
                  <Badge variant={currentSubscription.status === 'active' ? 'default' : 'secondary'}>
                    {currentSubscription.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div>Renews: {new Date(currentSubscription.dates.end_date).toLocaleDateString()}</div>
                  <div>Days remaining: {currentSubscription.days_remaining}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Usage Statistics */}
          {usage && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Usage Statistics
                </CardTitle>
                <CardDescription>
                  Your current usage for this period
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <UsageMeter
                  used={usage.messages.used}
                  limit={usage.messages.limit}
                  label="Messages"
                  color="bg-blue-500"
                />
                <UsageMeter
                  used={usage.likes.used}
                  limit={usage.likes.limit}
                  label="Likes"
                  color="bg-green-500"
                />
                <UsageMeter
                  used={usage.swipes.used}
                  limit={usage.swipes.limit}
                  label="Swipes"
                  color="bg-purple-500"
                />
              </CardContent>
            </Card>
          )}

          {/* Features Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Comparison</CardTitle>
              <CardDescription>
                See what each plan offers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Monthly Price</span>
                  <div className="flex gap-4">
                    <span className="w-16 text-center">Free</span>
                    <span className="w-16 text-center">₦2,000</span>
                    <span className="w-16 text-center">₦5,000</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Yearly Price</span>
                  <div className="flex gap-4">
                    <span className="w-16 text-center">Free</span>
                    <span className="w-16 text-center">₦21,600</span>
                    <span className="w-16 text-center">₦54,000</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Messages</span>
                  <div className="flex gap-4">
                    <span className="w-16 text-center">50</span>
                    <span className="w-16 text-center">500</span>
                    <span className="w-16 text-center">Unlimited</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Advanced Filters</span>
                  <div className="flex gap-4">
                    <span className="w-16 text-center">❌</span>
                    <span className="w-16 text-center">✅</span>
                    <span className="w-16 text-center">✅</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span>Priority Matching</span>
                  <div className="flex gap-4">
                    <span className="w-16 text-center">❌</span>
                    <span className="w-16 text-center">✅</span>
                    <span className="w-16 text-center">✅</span>
                  </div>
                </div>
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
              {plans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  currentPlan={currentSubscription?.plan?.tier === plan.tier}
                  billingCycle={billingCycle}
                  onSubscribe={(planId, cycle) => setSelectedPlan({ id: planId, cycle })}
                  loading={processing && selectedPlan?.id === plan.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Frequently Asked Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Can I change my plan later?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Is there a free trial?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All paid plans come with a 7-day free trial. No credit card required to start.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">How does billing work?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You can choose monthly or yearly billing. Yearly plans offer significant savings.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">What payment methods do you accept?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We accept all major credit cards, bank transfers, and USSD payments through Flutterwave.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Can I cancel my subscription?</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Yes, you can cancel anytime. Your subscription will remain active until the end of your billing period.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}