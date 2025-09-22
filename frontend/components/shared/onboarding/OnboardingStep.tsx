// components/shared/onboarding/OnboardingStep.tsx
'use client';

import { useState } from 'react';
import AuthLayout from '../layout/AuthLayout';
import GenderSelectionStep from './GenderSelectionStep';
import AnonymousOptionStep from './AnonymousOptionStep';
import MaleSignupForm from './MaleSignupForm';
import FemaleSignupForm from './FemaleSignupForm';
import { toast } from 'sonner';
;

export default function OnboardingStep() {
  const [step, setStep] = useState(0);
  const [gender, setGender] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState<boolean | null>(null);

  const handleGenderSelect = (selectedGender: string) => {
    setGender(selectedGender);
    setStep(1);
  };

  const handleAnonymousSelect = (anonymous: boolean) => {
    setIsAnonymous(anonymous);
    setStep(2);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    // Redirect to main app or show success message
    toast.success('Login Successful')
    setTimeout(() => {
         toast.success('Redirecting to Homepage...')
    }, 4000);
    console.log('Onboarding completed');
  };

  const getStepTitle = () => {
    switch (step) {
      case 0: return 'Select Your Gender';
      case 1: return gender === 'male' ?  'Complete Your Profile' :  'Privacy Preference';
      case 2: return 'Complete Your Profile';
      default: return 'Onboarding';
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <GenderSelectionStep onNext={handleGenderSelect} onBack={() => window.history.back()} />;
      case 1:
        return gender === 'male' ? (
          <MaleSignupForm onBack={handleBack} onNext={handleComplete} />
        ) : (
        <AnonymousOptionStep onNext={handleAnonymousSelect} onBack={handleBack} />
        )
      case 2:
        return <FemaleSignupForm isAnonymous={isAnonymous} onBack={handleBack} onNext={handleComplete} />
    
      default:
        return null;
    }
  };

  return (
    <AuthLayout
      title={getStepTitle()}
      subtitle={`Step ${step + 1} of ${gender === 'male' ? '2' : '3'}`}
      showBackButton={false}
    >
      {renderStep()}
    </AuthLayout>
  );
}