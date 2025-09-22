// components/shared/onboarding/AnonymousOptionStep.tsx
'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Shield, Heart } from 'lucide-react';

interface AnonymousOptionStepProps {
  onNext: (isAnonymous: boolean) => void;
  onBack: () => void;
}

export default function AnonymousOptionStep({ onNext, onBack }: AnonymousOptionStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">How would you like to join?</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Choose the option that fits your comfort level</p>
      </div>
      
      <div className="grid gap-4">
        {/* Anonymous Option */}
        <Card 
          className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-100 dark:border-purple-800 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onNext(true)}
        >
          <CardContent className="p-6">
            <div className="flex items-start mb-4">
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-full mr-4">
                <EyeOff className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white text-lg">Anonymous</h3>
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                  More privacy for casual connections
                </p>
              </div>
            </div>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li className="flex items-center">
                <Shield className="h-4 w-4 text-purple-500 mr-2" />
                Face automatically blurred in photos
              </li>
              <li className="flex items-center">
                <Heart className="h-4 w-4 text-purple-500 mr-2" />
                Ideal for casual connections
              </li>
              <li className="flex items-center">
                <Eye className="h-4 w-4 text-purple-500 mr-2" />
                Maximum privacy control
              </li>
            </ul>
          </CardContent>
        </Card>
        
        {/* Not Anonymous Option */}
        <Card 
          className="bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 border-2 border-pink-100 dark:border-pink-800 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
          onClick={() => onNext(false)}
        >
          <CardContent className="p-6">
            <div className="flex items-start mb-4">
              <div className="bg-pink-100 dark:bg-pink-900/30 p-3 rounded-full mr-4">
                <Eye className="h-6 w-6 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-white text-lg">Not Anonymous</h3>
                <p className="text-sm text-pink-600 dark:text-pink-400 mt-1">
                  For serious relationships
                </p>
              </div>
            </div>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <li className="flex items-center">
                <Heart className="h-4 w-4 text-pink-500 mr-2" />
                Full profile visibility
              </li>
              <li className="flex items-center">
                <Shield className="h-4 w-4 text-pink-500 mr-2" />
                Ideal for serious relationships
              </li>
              <li className="flex items-center">
                <Eye className="h-4 w-4 text-pink-500 mr-2" />
                Build trust with complete profiles
              </li>
            </ul>
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