// components/shared/onboarding/FemaleSignupForm.tsx
'use client';

import { useState, useRef} from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ImageUploader from './ImageUploader';
import { Shield, Loader2, Eye, EyeOff, Camera, CameraOff } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/axio';

interface FemaleSignupFormProps {
  isAnonymous: boolean | null;
  onBack: () => void;
  onNext: () => void;
}

export default function FemaleSignupForm({
  isAnonymous,
  onBack,
  onNext,
}: FemaleSignupFormProps) {
  const [formData, setFormData] = useState({
    category: '',
    pictures: [] as File[],
    age: '',
    username: '',
    bio: '',
    interests: '',
    password: '',
    confirmPassword: '',
    securityQuestion: '',
    securityAnswer: '',
    department: '',
    level: '',
    genotype: '',
    religious: '',
    name: ''
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [suggestedUsernames, setSuggestedUsernames] = useState<string[]>([]);

  // Refs for scrolling to errors
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const confirmPasswordInputRef = useRef<HTMLInputElement>(null);
  const securityQuestionRef = useRef<HTMLButtonElement>(null);
  const securityAnswerRef = useRef<HTMLInputElement>(null);

  const generateSuggestions = (baseName: string): string[] => {
    const randomNumbers = () =>
      Math.floor(100 + Math.random() * 900).toString();
    return [
      `${baseName}${randomNumbers()}`,
      `${baseName}_${randomNumbers()}`,
      `${baseName}${new Date().getFullYear()}`,
      `${baseName}${Math.floor(Math.random() * 10000)}`,
    ];
  };

  const scrollToElement = (element: HTMLElement | null) => {
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
      element.focus();
    }
  };

  // Check if image upload should be shown
  const shouldShowImageUploader = () => {
    if (!isAnonymous) {
      return true; // Always show for non-anonymous users
    }
    
    // For anonymous users, only show for specific categories
    const sensitiveCategories = ["Hook Up", "Sex Chat", "Fuck Mate"];
    return sensitiveCategories.includes(formData.category);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setUsernameError(null);
    setSuggestedUsernames([]);

    // Validate required fields and scroll to first error
    if (!formData.category) {
      toast.error("Please select what you're looking for");
      return;
    }

    // Only validate images if uploader is shown
    if (shouldShowImageUploader() && formData.pictures.length === 0) {
      toast.error("Please upload at least one photo");
      return;
    }

    if (!formData.age) {
      toast.error("Please enter your age");
      return;
    }

    if (!formData.username) {
      setUsernameError("Username is required");
      scrollToElement(usernameInputRef.current);
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
      toast.error("Please enter your interests");
      return;
    }

    // For non-anonymous users, require additional fields
    if (!isAnonymous) {
      if (!formData.department) {
        toast.error("Please enter your department");
        return;
      }
      if (!formData.level) {
        toast.error("Please select your academic level");
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Convert files to base64 for submission
      const processedImagesData: string[] = [];
      
      for (const file of formData.pictures) {
        const base64 = await fileToBase64(file);
        processedImagesData.push(base64);
      }

      const payload = {
        username: formData.username,
        password: formData.password,
        security_question: formData.securityQuestion,
        security_answer: formData.securityAnswer,
        age: formData.age,
        gender: "female",
        isAnonymous: isAnonymous,
        category: formData.category,
        bio: formData.bio,
        interestedIn: formData.interests,
        pictures: processedImagesData,
        department: formData.department,
        level: formData.level,
        genotype: formData.genotype,
        religious: formData.religious,
        name: formData.name
      };

      const res = await api.post('/auth/signup', payload);
      if(res.data){
        toast.success('Profile created successfully!');
        onNext();
      }
    } catch (error: unknown) {
      console.error('Signup error:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as { response?: { data?: { message?: string } } };
        if (apiError.response?.data?.message === "Username already taken") {
          setUsernameError("This username is already taken.");
          setSuggestedUsernames(generateSuggestions(formData.username));
          scrollToElement(usernameInputRef.current);
        }
        toast.error(apiError.response?.data?.message || 'An error occurred');
      } else {
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (result && result.startsWith('data:')) {
          resolve(result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0]; // Only take the first file
    
    // Check if adding new file would exceed the limit
    if (formData.pictures.length >= 5) {
      toast.error(`You can only upload up to 5 photos. You already have ${formData.pictures.length}.`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      pictures: [...prev.pictures, file],
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pictures: prev.pictures.filter((_, i) => i !== index),
    }));
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'username' && usernameError) {
      setUsernameError(null);
      setSuggestedUsernames([]);
    }

    // If category changes and user is anonymous, clear images if switching away from sensitive categories
    if (field === 'category' && isAnonymous) {
      const sensitiveCategories = ["Hook Up", "Sex Chat", "Fuck Mate"];
      const wasSensitive = sensitiveCategories.includes(formData.category);
      const isSensitive = sensitiveCategories.includes(value);
      
      if (wasSensitive && !isSensitive) {
        // Switching from sensitive to non-sensitive category, clear images
        setFormData(prev => ({
          ...prev,
          pictures: []
        }));
        toast.info("Photo upload disabled for selected category");
      }
    }
  };

  const categories = isAnonymous
    ? [
        "Serious Relationship",
        "Friend With Benefits",
        "Hook Up",
        "Sex Chat",
        "Fuck Mate",
        "Friend to Vibe With",
      ]
    : ["Serious Relationship", "Friend With Benefits", "Friend to Vibe With"];

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

  const interestsOptions = ["male", "female", "both"];

  const academicLevels = [
    "100 Level",
    "200 Level",
    "300 Level",
    "400 Level",
    "500 Level",
    "Postgraduate"
  ];

  const genotypes = [
    "AA", "AS", "SS", "AC", "SC", "CC"
  ];

  const religions = [
    "Christianity", "Islam", "Traditional", "Other", "Atheist"
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Complete Your Profile</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Help others get to know you better</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category" className="text-gray-700 dark:text-gray-300">
            What are you looking for?
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) => handleChange('category', value)}
            required
          >
            <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <SelectValue placeholder="Select what you're looking for" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conditional Image Uploader */}
        {shouldShowImageUploader() ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-gray-700 dark:text-gray-300">Upload Photos</Label>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formData.pictures.length}/5 photos
              </span>
            </div>
            
            <ImageUploader
              onImageUpload={handleImageUpload}
              onRemoveImage={removeImage}
              isAnonymous={isAnonymous}
              category={formData.category}
              maxImages={5}
            />
          </div>
        ) : (
          // Show message when image upload is disabled for anonymous users
          isAnonymous && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <CameraOff className="h-4 w-4" />
                  Photo Upload
                </Label>
              </div>
              
              <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <Camera className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <span className="font-semibold">Photo upload is not required</span> for your selected category. 
                  Your privacy is protected with anonymous mode.
                </AlertDescription>
              </Alert>
            </div>
          )
        )}

        {/* Rest of the form */}
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

        {/* Full Name - Optional for all users */}
        <div className="space-y-2">
          <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">
            Full Name (Optional)
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Your full name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">User Name</Label>
          <Input
            ref={usernameInputRef}
            id="username"
            type="text"
            placeholder="Anita"
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

        {/* Additional Fields for Non-Anonymous Users */}
        {!isAnonymous && (
          <>
            <div className="space-y-2">
              <Label htmlFor="department" className="text-gray-700 dark:text-gray-300">
                Department *
              </Label>
              <Input
                id="department"
                type="text"
                placeholder="e.g. Computer Science, Medicine, Law"
                value={formData.department}
                onChange={(e) => handleChange('department', e.target.value)}
                required={!isAnonymous}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="level" className="text-gray-700 dark:text-gray-300">
                Academic Level *
              </Label>
              <Select
                value={formData.level}
                onValueChange={(value) => handleChange('level', value)}
                required={!isAnonymous}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select your level" />
                </SelectTrigger>
                <SelectContent>
                  {academicLevels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="genotype" className="text-gray-700 dark:text-gray-300">
                Blood Genotype (Optional)
              </Label>
              <Select
                value={formData.genotype}
                onValueChange={(value) => handleChange('genotype', value)}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select your genotype" />
                </SelectTrigger>
                <SelectContent>
                  {genotypes.map((geno) => (
                    <SelectItem key={geno} value={geno}>
                      {geno}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="religious" className="text-gray-700 dark:text-gray-300">
                Religion (Optional)
              </Label>
              <Select
                value={formData.religious}
                onValueChange={(value) => handleChange('religious', value)}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select your religion" />
                </SelectTrigger>
                <SelectContent>
                  {religions.map((religion) => (
                    <SelectItem key={religion} value={religion}>
                      {religion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Password Fields */}
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

        <Alert className="bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800">
          <Shield className="h-4 w-4 text-pink-600 dark:text-pink-400" />
          <AlertDescription className="text-pink-800 dark:text-pink-200">
            <span className="font-semibold">Your Safety Matters:</span> Campus Vibes is designed for genuine connections only. 
            We have zero tolerance for harassment or harmful activities.
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
            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Profile...
              </>
            ) : (
              'Join Campus Vibes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}