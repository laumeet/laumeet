// components/shared/onboarding/GenderSelectionStep.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface GenderSelectionStepProps {
  onNext: (gender: string) => void;
  onBack: () => void;
}

export default function GenderSelectionStep({ onNext, onBack }: GenderSelectionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">I am a...</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Select your gender to continue</p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Male Option */}
        <Card 
          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-100 dark:border-blue-800 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
          onClick={() => onNext('male')}
        >
          <CardContent className="flex flex-col items-center p-6">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-4 mb-3">
             <p className='text-4xl'>🤴</p>
            </div>
            <span className="text-gray-800 dark:text-white font-medium">Male</span>
          </CardContent>
        </Card>
        
        {/* Female Option */}
        <Card 
          className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-2 border-pink-100 dark:border-pink-800 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
          onClick={() => onNext('female')}
        >
          <CardContent className="flex flex-col items-center p-6">
            <div className="bg-pink-100 dark:bg-pink-900/30 rounded-full p-4 mb-3">
              <p className='text-4xl'>👸</p>
            </div>
            <span className="text-gray-800 dark:text-white font-medium">Female</span>
          </CardContent>
        </Card>
      </div>
      
      <Button 
        onClick={onBack}
        variant="outline" 
        className="w-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3"
      >
        Back
      </Button>
    </div>
  );
}