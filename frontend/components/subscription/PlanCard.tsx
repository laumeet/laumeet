// components/subscription/PlanCard.tsx
import { Crown, Star, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubscriptionPlan } from '@/hooks/useSubscription';

interface PlanCardProps {
  plan: SubscriptionPlan;
  currentPlan: boolean;
  billingCycle: 'monthly' | 'yearly';
  onSubscribe: (planId: string, billingCycle: 'monthly' | 'yearly') => void;
  loading?: boolean;
}

export function PlanCard({ plan, currentPlan, billingCycle, onSubscribe, loading }: PlanCardProps) {
  const price = billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;
  const originalYearlyPrice = plan.pricing.monthly * 12;
  const yearlySavings = originalYearlyPrice - plan.pricing.yearly;

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'vip': return 'from-purple-500 to-pink-500';
      case 'premium': return 'from-blue-500 to-cyan-500';
      default: return 'from-gray-500 to-gray-700';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'vip': return <Crown className="h-5 w-5" />;
      case 'premium': return <Star className="h-5 w-5" />;
      default: return null;
    }
  };

  const features = [
    { name: 'Messages', value: plan.features.max_messages === -1 ? 'Unlimited' : `${plan.features.max_messages} messages` },
    { name: 'Likes', value: plan.features.max_likes === -1 ? 'Unlimited' : `${plan.features.max_likes} likes` },
    { name: 'Swipes', value: plan.features.max_swipes === -1 ? 'Unlimited' : `${plan.features.max_swipes} swipes` },
    { name: 'Advanced Filters', enabled: plan.features.has_advanced_filters },
    { name: 'Priority Matching', enabled: plan.features.has_priority_matching },
    { name: 'Read Receipts', enabled: plan.features.has_read_receipts },
    { name: 'See Who Liked You', enabled: plan.features.can_see_who_liked_you },
    { name: 'Rewind Swipes', enabled: plan.features.can_rewind_swipes },
    { name: 'Incognito Mode', enabled: plan.features.has_incognito_mode },
    { name: 'Verified Badge', enabled: plan.features.has_verified_badge },
  ];

  return (
    <Card className={`relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl ${
      plan.is_popular ? 'border-2 border-blue-500 shadow-lg' : 'border-2 border-transparent'
    }`}>
      {plan.is_popular && (
        <div className="absolute top-4 right-4">
          <Badge className="bg-blue-500 text-white px-3 py-1">
            <Star className="h-3 w-3 mr-1" />
            Most Popular
          </Badge>
        </div>
      )}
      
      <CardHeader className={`bg-gradient-to-r ${getTierColor(plan.tier)} text-white pb-4`}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            {getTierIcon(plan.tier)}
            {plan.name}
          </CardTitle>
          {currentPlan && (
            <Badge variant="secondary" className="bg-white text-gray-800">
              Current Plan
            </Badge>
          )}
        </div>
        <CardDescription className="text-white/80">
          {plan.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6">
        {/* Pricing */}
        <div className="text-center mb-6">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-gray-900 dark:text-white">
              ₦{price.toLocaleString()}
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              /{billingCycle === 'yearly' ? 'year' : 'month'}
            </span>
          </div>
          
          {billingCycle === 'yearly' && plan.tier !== 'free' && (
            <div className="mt-2 space-y-1">
              <div className="text-sm text-green-600 font-semibold">
                Save ₦{yearlySavings.toLocaleString()} per year
              </div>
              <div className="text-xs text-gray-500 line-through">
                ₦{originalYearlyPrice.toLocaleString()} if paid monthly
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="space-y-3">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {feature.name}
              </span>
              {'enabled' in feature ? (
                feature.enabled ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-gray-300" />
                )
              ) : (
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {feature.value}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter>
        <Button
          className={`w-full ${
            plan.tier === 'vip' 
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' 
              : plan.tier === 'premium'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
              : ''
          }`}
          variant={plan.tier === 'free' ? 'outline' : 'default'}
          disabled={currentPlan || loading}
          onClick={() => onSubscribe(plan.id, billingCycle)}
        >
          {currentPlan ? 'Current Plan' : plan.tier === 'free' ? 'Get Started' : 'Subscribe Now'}
        </Button>
      </CardFooter>
    </Card>
  );
}