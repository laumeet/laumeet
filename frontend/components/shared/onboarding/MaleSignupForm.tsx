
// components/shared/onboarding/MaleSignupForm.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
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
import { toast } from 'sonner';
import axios from 'axios';

interface MaleSignupFormProps {
  onBack: () => void;
  onNext: () => void;
}



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
  const [suggestedUsernames, setSuggestedUsernames] = useState<string[]>([]);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const generateSuggestions = (baseName: string): string[] => {
    const randomNumbers = () =>
      Math.floor(100 + Math.random() * 900).toString(); // 3-digit numbers
    return [
      `${baseName}${randomNumbers()}`,
      `${baseName}_${randomNumbers()}`,
      `${baseName}${new Date().getFullYear()}`,
      `${baseName}${Math.floor(Math.random() * 10000)}`,
    ];
  };
    useEffect(() => {
      if (usernameError && usernameInputRef.current) {
        usernameInputRef.current.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        usernameInputRef.current.focus();
      }
    }, [usernameError]);
  
    const scrollToElement = (element: HTMLElement | null) => {
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        element.focus();
      }
    };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
        // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }
    
    // Validate security question and answer
    if (!formData.securityQuestion || !formData.securityAnswer) {
      toast.error("Please complete the security question section.");
      return;
    }

    setIsProcessing(true);
    try{
      
            const payload = {
              username: formData.username,
              password: formData.password,
              security_question: formData.securityQuestion,
              security_answer: formData.securityAnswer,
              age: formData.age,
              gender: "male",
              bio: formData.bio,
              interestedIn: formData.interests, 
             
              
            };
      
       const res = await axios.post('http://127.0.0.1:5000/signup', payload);
 
      if (res.status === 200) {
        onNext();
      } else if (res.data?.message?.includes("Username already taken")) {
        setUsernameError("This username is already taken.");
        setSuggestedUsernames(generateSuggestions(formData.username));
        scrollToElement(usernameInputRef.current);
      } else {
        toast.error(res.data?.message || "Signup failed");
      }

      
          } catch (err) {
      
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message);
      } else {
        toast.error("An unexpected error occurred.");
      }
          } finally {
            setIsProcessing(false);
          }

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
            ref={usernameInputRef}
            id="username"
            type="text"
            placeholder="Tom"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            required
            className={`bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 ${
              usernameError ? 'border-red-500 dark:border-red-400' : ''
            }`}
          />
          {usernameError && (
            <div className="text-red-600 dark:text-red-400 text-sm mt-1">
              {usernameError}
              <div className="mt-1">
                <span className="font-medium">Try one of these:</span>
                <ul className="list-disc list-inside">
                  {suggestedUsernames.map((sug, idx) => (
                    <li
                      key={idx}
                      className="cursor-pointer text-blue-600 dark:text-blue-400 hover:underline"
                      onClick={() => {
                        handleChange("username", sug);
                        setUsernameError(null);
                        setSuggestedUsernames([]);
                      }}
                    >
                      {sug}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
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