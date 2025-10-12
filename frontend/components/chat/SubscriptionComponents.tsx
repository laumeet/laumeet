import { Crown, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageLimit?: number;
  messagesUsed?: number;
  onUpgrade: () => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  open,
  onOpenChange,
  messageLimit,
  messagesUsed,
  onUpgrade,
}) => {
  const isLimitReached = messageLimit && messagesUsed && messagesUsed >= messageLimit;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-yellow-500" />
            Upgrade Your Plan
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isLimitReached 
              ? `You've used all ${messageLimit} free messages. Upgrade to continue chatting.`
              : "Get unlimited messages and premium features with our subscription plans."
            }
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">Premium Features:</h4>
            <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
              <li>• Unlimited messages</li>
              <li>• See who liked you</li>
              <li>• Advanced filters</li>
              <li>• Priority matching</li>
              <li>• No ads</li>
            </ul>
          </div>
          
          {isLimitReached && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  Chat locked until you upgrade
                </span>
              </div>
            </div>
          )}
        </div>
        
        <AlertDialogFooter className="flex gap-2 sm:gap-0">
          <AlertDialogCancel>Maybe Later</AlertDialogCancel>
          <AlertDialogAction onClick={onUpgrade} className="bg-gradient-to-r from-pink-500 to-purple-600">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface LockedContentTooltipProps {
  children: React.ReactNode;
  message: string;
}

export const LockedContentTooltip: React.FC<LockedContentTooltipProps> = ({ children, message }) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent>
        <div className="flex items-center gap-2">
          <Lock className="h-3 w-3" />
          <span>{message}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

interface UpgradePromptProps {
  onUpgrade: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({ onUpgrade }) => (
  <div className="mb-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <span className="text-sm text-yellow-800 dark:text-yellow-200">
          You&apos;ve used all your free messages
        </span>
      </div>
      <Button 
        size="sm" 
        onClick={onUpgrade}
        className="bg-gradient-to-r from-pink-500 to-purple-600"
      >
        <Crown className="h-3 w-3 mr-1" />
        Upgrade
      </Button>
    </div>
  </div>
);