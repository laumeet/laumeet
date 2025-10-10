// components/subscription/BillingCycleToggle.tsx
import { Button } from '@/components/ui/button';

interface BillingCycleToggleProps {
  billingCycle: 'monthly' | 'yearly';
  onBillingCycleChange: (cycle: 'monthly' | 'yearly') => void;
}

export function BillingCycleToggle({ billingCycle, onBillingCycleChange }: BillingCycleToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-blue-600' : 'text-gray-500'}`}>
        Monthly
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onBillingCycleChange(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
        className="relative w-12 h-6 rounded-full"
      >
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-blue-600 transition-transform ${
          billingCycle === 'monthly' ? 'left-1' : 'left-7'
        }`} />
      </Button>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-blue-600' : 'text-gray-500'}`}>
          Yearly
        </span>
        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full font-medium">
          Save 10%
        </span>
      </div>
    </div>
  );
}