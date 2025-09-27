// components/shared/onboarding/FemaleSignupForm.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
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
import { Shield, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { getFaceBlurProcessor } from '@/lib/faceBlur';
import { toast } from 'sonner';
import axios from 'axios'

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
    relationshipGoal: '',
    password: '',
    confirmPassword: '',
    securityQuestion: '',
    securityAnswer: ''
  });
  
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      Math.floor(100 + Math.random() * 900).toString(); // 3-digit numbers
    return [
      `${baseName}${randomNumbers()}`,
      `${baseName}_${randomNumbers()}`,
      `${baseName}${new Date().getFullYear()}`,
      `${baseName}${Math.floor(Math.random() * 10000)}`,
    ];
  };

  useEffect(() => {
    const loadModels = async () => {
      try {
        await getFaceBlurProcessor().ensureModelsLoaded();
        setModelsLoading(false);
      } catch (err) {
        console.error(err);
        setModelsError("Failed to load face detection models.");
        setModelsLoading(false);
      }
    };
    loadModels();
  }, []);

  // Scroll to error field when error occurs
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

    // Reset errors
    setUsernameError(null);
    setSuggestedUsernames([]);

    // Validate required fields and scroll to first error
    if (!formData.category) {
      toast.error("Please select what you're looking for");
      return;
    }

    if (formData.pictures.length === 0) {
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

    setIsProcessing(true);

    try {
      const processor = getFaceBlurProcessor();
      await processor.ensureModelsLoaded();

      const processedImagesData: string[] = [];

      for (const image of formData.pictures) {
        let base64: string;

        if (
          isAnonymous &&
          ["Hook Up", "Sex Chat", "Fuck Mate"].includes(formData.category)
        ) {
          const emojiBlob = await processor.maskFacesWithEmojis(image);
          if (emojiBlob) {
            // FIX: Properly convert blob to base64 for processed images
            base64 = await blobToBase64(emojiBlob);
          } else {
            // If face blur fails, fall back to original image
            console.warn('Face blur failed, using original image');
            base64 = await fileToBase64(image);
          }
        } else {
          // For non-anonymous or non-sensitive categories, use original image
          base64 = await fileToBase64(image);
        }

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
      console.error("❌ Error:", err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || err.message);
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // FIX: Improved blob to base64 conversion
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Ensure the result is a proper data URL
        if (result && result.startsWith('data:')) {
          resolve(result);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // FIX: Improved file to base64 conversion
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

  // FIX: Update image preview when processing anonymous images
  const handleImageUpload = async (files: FileList) => {
    const newPictures = Array.from(files);
    
    // For anonymous mode with sensitive categories, process images immediately for preview
    if (isAnonymous && ["Hook Up", "Sex Chat", "Fuck Mate"].includes(formData.category)) {
      try {
        const processor = getFaceBlurProcessor();
        await processor.ensureModelsLoaded();
        
        const processedPreviewUrls: string[] = [];
        
        for (const file of newPictures) {
          const emojiBlob = await processor.maskFacesWithEmojis(file);
          if (emojiBlob) {
            const previewUrl = URL.createObjectURL(emojiBlob);
            processedPreviewUrls.push(previewUrl);
          } else {
            // Fallback to original image if processing fails
            processedPreviewUrls.push(URL.createObjectURL(file));
          }
        }
        
        setUploadedImages(prev => [...prev, ...processedPreviewUrls]);
        setFormData(prev => ({
          ...prev,
          pictures: [...prev.pictures, ...newPictures], // Store original files for final processing
        }));
        
      } catch (error) {
        console.error('Error processing images for preview:', error);
        // Fallback to original images
        const originalPreviewUrls = newPictures.map(file => URL.createObjectURL(file));
        setUploadedImages(prev => [...prev, ...originalPreviewUrls]);
        setFormData(prev => ({
          ...prev,
          pictures: [...prev.pictures, ...newPictures],
        }));
      }
    } else {
      // For non-anonymous or non-sensitive categories, use normal preview
      const newPreviewUrls = newPictures.map(file => URL.createObjectURL(file));
      setUploadedImages(prev => [...prev, ...newPreviewUrls]);
      setFormData(prev => ({
        ...prev,
        pictures: [...prev.pictures, ...newPictures],
      }));
    }
  };

  const removeImage = (index: number) => {
    // Revoke object URL to prevent memory leaks
    if (uploadedImages[index]) {
      URL.revokeObjectURL(uploadedImages[index]);
    }
    
    setFormData(prev => ({
      ...prev,
      pictures: prev.pictures.filter((_, i) => i !== index),
    }));
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      uploadedImages.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear username error when user starts typing
    if (field === 'username' && usernameError) {
      setUsernameError(null);
      setSuggestedUsernames([]);
    }
    
    // If category changes and we're in anonymous mode, update image previews if needed
    if (field === 'category' && isAnonymous) {
      const isSensitiveCategory = ["Hook Up", "Sex Chat", "Fuck Mate"].includes(value);
      const wasSensitiveCategory = ["Hook Up", "Sex Chat", "Fuck Mate"].includes(formData.category);
      
      if (isSensitiveCategory !== wasSensitiveCategory && formData.pictures.length > 0) {
        // Re-process images with new category settings
        handleImageUpload(arrayToFileList(formData.pictures));
       }
    }
  };

  // Helper function to convert File[] to FileList
  function arrayToFileList(files: File[]): FileList {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    return dataTransfer.files;
  }

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
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Complete Your Profile</h2>
        <p className="text-gray-600 dark:text-gray-300 mt-1">Help others get to know you better</p>
      </div>
      
      {modelsLoading && (
        <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
          <AlertDescription className="text-blue-800 dark:text-blue-200">
            Loading face detection technology...
          </AlertDescription>
        </Alert>
      )}
      
      {modelsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{modelsError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category" className="text-gray-700 dark:text-gray-300">
            What are you looking for?
          </Label>
          <Select
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

        <div className="space-y-2">
          <Label className="text-gray-700 dark:text-gray-300">Upload Photos</Label>
          <ImageUploader
            onImageUpload={handleImageUpload}
            uploadedImages={uploadedImages}
            onRemoveImage={removeImage}
            ref={fileInputRef}
          />

          {isAnonymous &&
            ["Hook Up", "Sex Chat", "Fuck Mate"].includes(formData.category) && (
              <p className="text-amber-600 dark:text-amber-400 text-xs mt-2">
                Note: Your face will be automatically covered with emojis for privacy.
              </p>
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
          <Label htmlFor="interests" className="text-gray-700 dark:text-gray-300">Interests</Label>
          <Input
            id="interests"
            type="text"
            placeholder="e.g. Music, Travel, Sports"
            value={formData.interests}
            onChange={(e) => handleChange('interests', e.target.value)}
            required
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
          />
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
            disabled={isProcessing || modelsLoading}
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