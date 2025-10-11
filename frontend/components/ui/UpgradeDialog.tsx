// components/UpgradeDialog.tsx - CREATE THIS NEW FILE
"use client"

import { Crown, Check, Zap, Star, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface UpgradeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

export function UpgradeDialog({ isOpen, onClose, onUpgrade }: UpgradeDialogProps) {
  const router = useRouter();

  const features = [
    { icon: Zap, text: 'Share contact information' },
    { icon: Star, text: 'Send links and websites' },
    { icon: Shield, text: 'Use hashtags and mentions' },
    { icon: Crown, text: 'Unlimited messaging' },
    { icon: Check, text: 'Priority matching' },
    { icon: Check, text: 'See who liked you' },
  ];

  const handleUpgrade = () => {
    onClose();
    if (onUpgrade) {
      onUpgrade();
    } else {
      router.push('/subscription');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 p-3">
                <Crown className="h-8 w-8 text-white" />
              </div>
            </div>
            <span className="text-2xl bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Upgrade to Premium
            </span>
          </DialogTitle>
          <CardDescription className="text-base text-gray-600 mt-2 text-center">
            Free users cannot send contact information, links, or hashtags
          </CardDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Features List */}
          <div className="space-y-3">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="flex items-center space-x-3">
                  <IconComponent className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature.text}</span>
                </div>
              );
            })}
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-gray-900">₦2,000</span>
                <span className="text-gray-600">/month</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">or ₦21,600/year (save 10%)</p>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button
              onClick={handleUpgrade}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold py-3 text-lg"
              size="lg"
            >
              <Crown className="h-5 w-5 mr-2" />
              Upgrade Now
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Maybe Later
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Secure payment • Cancel anytime • 7-day free trial available
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}