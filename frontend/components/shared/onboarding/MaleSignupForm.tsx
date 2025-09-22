/* eslint-disable @typescript-eslint/no-explicit-any */
// components/shared/onboarding/MaleSignupForm.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MaleSignupFormProps {
  onBack: () => void;
  onNext: () => void;
}

const saveToLocalStorage = (data: any) => {
  const userData = {
    ...data,
    gender: 'male',
    timestamp: new Date().toISOString(),
    id: Math.random().toString(36).substr(2, 9)
  };
  
  const existingUsers = JSON.parse(localStorage.getItem('campusVibesUsers') || '[]');
  existingUsers.push(userData);
  localStorage.setItem('campusVibesUsers', JSON.stringify(existingUsers));
};

export default function MaleSignupForm({ onBack, onNext }: MaleSignupFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    age: '',
    bio: '',
    interests: '',
    confirmPassword: '',
    securityQuestion: '',
    securityAnswer: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
        // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    
    // Validate security question and answer
    if (!formData.securityQuestion || !formData.securityAnswer) {
      alert("Please complete the security question section.");
      return;
    }

    setIsProcessing(true);
    
    // Simulate processing delay
    setTimeout(() => {
      saveToLocalStorage(formData);
      onNext();
      setIsProcessing(false);
    }, 1000);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const securityQuestions = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your elementary school?",
    "What was your childhood nickname?",
    "What is the name of your favorite childhood friend?",
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Complete Your Profile</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Tell us about yourself</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="Choose a username"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            required
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>

        
        <div className="space-y-2">
          <Label htmlFor="age" className="text-gray-700 dark:text-gray-300">Age</Label>
          <Input
            id="age"
            type="number"
            min="18"
            max="35"
            placeholder="Your age"
            value={formData.age}
            onChange={(e) => handleChange('age', e.target.value)}
            required
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>


                
        {/* Password Fields */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                required
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
        
        {/* Security Question Section */}
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-800 dark:text-white">Security Settings</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            These will help you recover your account if you forget your password.
          </p>
          
          <div className="space-y-2">
            <Label htmlFor="securityQuestion" className="text-gray-700 dark:text-gray-300">
              Security Question
            </Label>
            <Select
              onValueChange={(value) => handleChange('securityQuestion', value)}
              required
              
            >
              <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                <SelectValue placeholder="Select a security question" />
              </SelectTrigger>
              <SelectContent>
                {securityQuestions.map((question, index) => (
                  <SelectItem  key={index} value={question}>
                    {question}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="securityAnswer" className="text-gray-700 dark:text-gray-300">
              Security Answer
            </Label>
            <Input
              id="securityAnswer"
              type="text"
              placeholder="Your answer"
              value={formData.securityAnswer}
              onChange={(e) => handleChange('securityAnswer', e.target.value)}
              required
              className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
            />
          </div>
        </div>
        
        
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-gray-700 dark:text-gray-300">Bio</Label>
          <Input
            id="bio"
            type="text"
            placeholder="Tell us about yourself"
            value={formData.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            required
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="interests" className="text-gray-700 dark:text-gray-300">Interests</Label>
          <Input
            id="interests"
            type="text"
            placeholder="e.g. Sports, Music, Gaming"
            value={formData.interests}
            onChange={(e) => handleChange('interests', e.target.value)}
            required
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>
        
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Your privacy is our priority. We never share your personal data without your consent.
          </AlertDescription>
        </Alert>
        
        <div className="flex space-x-4">
          <Button 
            type="button"
            onClick={onBack}
            variant="outline" 
            className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-3"
          >
            Back
          </Button>
          <Button 
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-3"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}