// components/subscription/PlanCard.tsx
import { Crown, Star, Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SubscriptionPlan } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import { useProfile } from '@/hooks/get-profile';

interface PlanCardProps {
  plan: SubscriptionPlan;
  currentPlan: boolean;
  billingCycle: 'monthly' | 'yearly';
  onSubscribe: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
  loading?: boolean;
  disabled?: boolean;
}

export function PlanCard({ 
  plan, 
  currentPlan, 
  billingCycle, 
  onSubscribe, 
  loading = false,
  disabled = false 
}: PlanCardProps) {
  const { profile: user } = useProfile();
  const price = billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;
  const originalYearlyPrice = plan.pricing.monthly * 12;
  const yearlySavings = originalYearlyPrice - plan.pricing.yearly;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'vip': 
        return 'from-purple-500 to-pink-500';
      case 'premium': 
        return 'from-blue-500 to-cyan-500';
      case 'free':
        return 'from-gray-400 to-gray-600';
      default: 
        return 'from-gray-500 to-gray-700';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'vip': 
        return <Crown className="h-5 w-5" />;
      case 'premium': 
        return <Star className="h-5 w-5" />;
      default: 
        return null;
    }
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'vip': 
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'premium': 
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'free':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: 
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const features = [
    { 
      name: 'Messages', 
      value: plan.features.max_messages === -1 ? 'Unlimited' : `${plan.features.max_messages} messages`,
      enabled: true 
    },
    { 
      name: 'Likes', 
      value: plan.features.max_likes === -1 ? 'Unlimited' : `${plan.features.max_likes} likes`,
      enabled: true 
    },
    { 
      name: 'Swipes', 
      value: plan.features.max_swipes === -1 ? 'Unlimited' : `${plan.features.max_swipes} swipes`,
      enabled: true 
    },
    { 
      name: 'Advanced Filters', 
      enabled: plan.features.has_advanced_filters 
    },
    { 
      name: 'Priority Matching', 
      enabled: plan.features.has_priority_matching 
    },
    { 
      name: 'Read Receipts', 
      enabled: plan.features.has_read_receipts 
    },
    { 
      name: 'See Who Liked You', 
      enabled: plan.features.can_see_who_liked_you 
    },
    { 
      name: 'Rewind Swipes', 
      enabled: plan.features.can_rewind_swipes 
    },
    { 
      name: 'Incognito Mode', 
      enabled: plan.features.has_incognito_mode 
    },
    { 
      name: 'Verified Badge', 
      enabled: plan.features.has_verified_badge 
    },
  ];

  const handleSubscription = async () => {
    if (!user) {
      toast.error('Please login to subscribe');
      return;
    }

    try {
      onSubscribe(plan.id, billingCycle);
    } catch (error) {
      console.error('Subscription error:', error);
      if (error instanceof Error && !error.message.includes('cancelled')) {
        toast.error(error.message || 'Subscription failed. Please try again.');
      }
    }
  };

  const isFreePlan = plan.tier === 'free';
  const isDisabled = disabled || (currentPlan && !isFreePlan);
  const isLoading = loading;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      plan.is_popular && "border-2 border-blue-500 shadow-lg",
      !plan.is_popular && "border border-gray-200 dark:border-gray-700",
      isDisabled && "opacity-70 cursor-not-allowed",
      !isDisabled && "hover:shadow-xl"
    )}>
      {/* Popular Badge */}
      {plan.is_popular && (
        <div className="absolute top-28 right-2 z-10">
          <Badge className="bg-blue-500 text-white px-3 py-1">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}

      {/* Current Plan Badge */}
      {currentPlan && (
        <div className="absolute top-28 left-2 z-10">
          <Badge className="bg-green-500 text-white px-3 py-1">
            <Check className="h-3 w-3 mr-1" />
            Current Plan
          </Badge>
        </div>
      )}

      {/* Free Plan Badge */}
      {isFreePlan && !currentPlan && (
        <div className="absolute top-28 left-2 z-10">
          <Badge variant="secondary" className={getTierBadgeColor(plan.tier)}>
            Free
          </Badge>
        </div>
      )}

      {/* Card Header */}
      <CardHeader className={cn(
        "bg-gradient-to-r text-white pb-4",
        getTierColor(plan.tier)
      )}>
        <div className="flex items-center justify-center gap-2">
          {getTierIcon(plan.tier)}
          <CardTitle className="text-xl font-bold text-center">
            {plan.name}
          </CardTitle>
        </div>
        <CardDescription className="text-white/80 text-center">
          {plan.description}
        </CardDescription>
      </CardHeader>

      {/* Card Content */}
      <CardContent className="p-6">
        {/* Pricing Section */}
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              {isFreePlan ? 'Free' : `₦${price.toLocaleString()}`}
            </span>
            {!isFreePlan && (
              <span className="text-gray-600 dark:text-gray-400">
                /{billingCycle === 'yearly' ? 'year' : 'month'}
              </span>
            )}
          </div>

          {/* Yearly Savings */}
          {billingCycle === 'yearly' && !isFreePlan && yearlySavings > 0 && (
            <div className="mt-2 space-y-1">
              <div className="text-sm text-green-600 font-semibold">
                Save ₦{yearlySavings.toLocaleString()} per year
              </div>
              <div className="text-xs text-gray-500 line-through">
                ₦{originalYearlyPrice.toLocaleString()} if paid monthly
              </div>
            </div>
          )}

          {/* Free Plan Description */}
          {isFreePlan && (
            <div className="mt-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Perfect for getting started
              </div>
            </div>
          )}
        </div>

        {/* Features List */}
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className={cn(
                "text-sm",
                feature.enabled 
                  ? "text-gray-700 dark:text-gray-300" 
                  : "text-gray-400 dark:text-gray-600"
              )}>
                {feature.name}
              </span>

              {'value' in feature ? (
                <span className={cn(
                  "text-sm font-medium",
                  feature.enabled
                    ? "text-gray-900 dark:text-white"
                    : "text-gray-400 dark:text-gray-600"
                )}>
                  {feature.value}
                </span>
              ) : (
                feature.enabled ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                )
              )}
            </div>
          ))}
        </div>
      </CardContent>

      {/* Card Footer */}
      <CardFooter>
        <Button
          className={cn(
            "w-full font-semibold transition-all duration-300",
            plan.tier === 'vip' && 
              "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white",
            plan.tier === 'premium' && 
              "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white",
            plan.tier === 'free' && 
              "bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700",
            isDisabled && "opacity-50 cursor-not-allowed"
          )}
          variant={plan.tier === 'free' ? 'outline' : 'default'}
          size="lg"
          disabled={isDisabled || isLoading}
          onClick={handleSubscription}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Processing...
            </>
          ) : currentPlan ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Current Plan
            </>
          ) : isFreePlan ? (
            'Free Plan'
          ) : (
            `Subscribe ${billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}`
          )}
        </Button>
      </CardFooter>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 flex items-center justify-center rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}
    </Card>
  );
}