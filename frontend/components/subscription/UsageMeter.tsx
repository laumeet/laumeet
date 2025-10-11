// components/subscription/UsageMeter.tsx
import { Progress } from '@/components/ui/progress';

interface UsageMeterProps {
  used: number;
  limit: number;
  label: string;
  color: string;
}

export function UsageMeter({ used, limit, label, color }: UsageMeterProps) {
  const percentage = limit === -1 ? 0 : Math.min(100, (used / limit) * 100);
  const isUnlimited = limit === -1;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-medium text-gray-900 dark:text-white">
          {isUnlimited ? `${used} / Unlimited` : `${used} / ${limit}`}
        </span>
      </div>
      {!isUnlimited && (
        <Progress value={percentage} className={`h-2 ${color}`} />
      )}
    </div>
  );
}