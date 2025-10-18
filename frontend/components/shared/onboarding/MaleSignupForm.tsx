/* eslint-disable @typescript-eslint/no-explicit-any */

// components/shared/onboarding/MaleSignupForm.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, Eye, EyeOff, User, UserX } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import api from '@/lib/axio';
import { useSocket } from '@/hooks/useSocket';
import ImageUploader from '@/components/shared/onboarding/ImageUploader';

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
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const { socket, isConnected } = useSocket();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [suggestedUsernames, setSuggestedUsernames] = useState<string[]>([]);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const securityQuestionRef = useRef<HTMLButtonElement>(null);
  const securityAnswerRef = useRef<HTMLInputElement>(null);

  const interestsOptions = ["male", "female", "both"];

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

  const handleImageUpload = (urls: string[]) => {
    setUploadedImageUrls(urls);
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setUsernameError(null);
    setSuggestedUsernames([]);

    // Validate required fields
    if (!formData.username) {
      setUsernameError("Username is required");
      scrollToElement(usernameInputRef.current);
      return;
    }

    if (!formData.age) {
      toast.error("Please enter your age");
      return;
    }

    // Validate passwords
    if (!formData.password) {
      toast.error("Password is required");
      scrollToElement(passwordInputRef.current);
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      scrollToElement(passwordInputRef.current);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match!");
      scrollToElement(confirmPasswordInputRef.current);
      return;
    }

    // Validate security question and answer
    if (!formData.securityQuestion) {
      toast.error("Please select a security question");
      scrollToElement(securityQuestionRef.current);
      return;
    }

    if (!formData.securityAnswer) {
      toast.error("Please provide an answer to the security question");
      scrollToElement(securityAnswerRef.current);
      return;
    }

    if (!formData.bio) {
      toast.error("Please write a bio");
      return;
    }

    if (!formData.interests) {
      toast.error("Please select who you're interested in");
      return;
    }

    // For non-anonymous users, require at least one image
    if (!isAnonymous && uploadedImageUrls.length === 0) {
      toast.error("Please upload at least one profile picture");
      return;
    }

    const payload = {
      username: formData.username,
      password: formData.password,
      security_question: formData.securityQuestion,
      security_answer: formData.securityAnswer,
      age: formData.age,
      gender: "male",
      bio: formData.bio,
      interestedIn: formData.interests,
      is_anonymous: isAnonymous,
      profile_images: uploadedImageUrls,
    };

    setIsProcessing(true);
    try {
      const res = await api.post('/auth/signup', payload);
      
      if (res.data) {
        toast.success('Profile created successfully!');
        // Set user as online immediately after successful login
        if (socket && isConnected) {
          console.log('✅ Login successful - setting user online');
          socket.emit('set_online', { 
            user_id: res.data.user?.id || res.data.user_id, 
            is_online: true 
          });
        } else {
          console.log('⚠️ Socket not connected, online status will be set when socket connects');
        }

        onNext();
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        if (error.response?.data?.message === "Username already taken") {
          setUsernameError("This username is already taken.");
          setSuggestedUsernames(generateSuggestions(formData.username));
          scrollToElement(usernameInputRef.current);
        }
        toast.error(error.response.data.message);
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'username' && usernameError) {
      setUsernameError(null);
      setSuggestedUsernames([]);
    }
  };

  const securityQuestions = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was the name of your elementary school?",
    "What was your childhood nickname?",
    "What is the name of your favorite childhood friend?",
    "What street did you grow up on?",
    "What was the make of your first car?",
    "What is your favorite movie?",
    "What is your favorite book?"
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Complete Your Profile</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Tell us about yourself</p>
      </div>

      {/* Anonymous Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          {isAnonymous ? (
            <UserX className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <User className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          )}
          <div>
            <Label htmlFor="anonymous-mode" className="text-gray-700 dark:text-gray-300 font-medium">
              Anonymous Mode
            </Label>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isAnonymous ? 'Your profile will be hidden from other users' : 'Your profile will be visible to other users'}
            </p>
          </div>
        </div>
        <Switch
          id="anonymous-mode"
          checked={isAnonymous}
          onCheckedChange={setIsAnonymous}
        />
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

        {/* Image Uploader - Only show if not anonymous */}
        {!isAnonymous && (
          <div className="space-y-2">
            <Label className="text-gray-700 dark:text-gray-300">Profile Picture</Label>
            <ImageUploader 
              onImageUpload={handleImageUpload}
              onRemoveImage={handleRemoveImage}
              isAnonymous={isAnonymous}
              category=""
              maxImages={5}
            />
          </div>
        )}

        {/* Password Fields */}
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
            <div className="relative">
              <Input
                ref={passwordInputRef}
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
                ref={confirmPasswordInputRef}
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
              value={formData.securityQuestion}
              onValueChange={(value) => handleChange('securityQuestion', value)}
              required
            >
              <SelectTrigger 
                ref={securityQuestionRef}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              >
                <SelectValue placeholder="Select a security question" />
              </SelectTrigger>
              <SelectContent>
                {securityQuestions.map((question, index) => (
                  <SelectItem key={index} value={question}>
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
              ref={securityAnswerRef}
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
          <Textarea
            id="bio"
            placeholder="Tell others about yourself"
            value={formData.bio}
            onChange={(e) => handleChange('bio', e.target.value)}
            required
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 min-h-[100px]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="interests" className="text-gray-700 dark:text-gray-300">
            Interested In
          </Label>
          <Select
            value={formData.interests}
            onValueChange={(value) => handleChange('interests', value)}
            required
          >
            <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <SelectValue placeholder="Who are you interested in?" />
            </SelectTrigger>
            <SelectContent>
              {interestsOptions.map((interest) => (
                <SelectItem key={interest} value={interest}>
                  {interest.charAt(0).toUpperCase() + interest.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            {isAnonymous 
              ? "In anonymous mode, your profile will be hidden from other users for enhanced privacy."
              : "Your privacy is our priority. We never share your personal data without your consent."
            }
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