/* eslint-disable @typescript-eslint/no-explicit-any */
// components/shared/auth/ForgotPasswordForm.tsx
'use client';

import { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, CheckCircle, UserRound, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/axio';

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: username, 2: security question, 3: reset password, 4: success
  const [username, setUsername] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Check if username exists and get security question
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/forgot-password', { username });
      
      if (response.data.success) {
        if (response.data.question) {
          setSecurityQuestion(response.data.question);
          setStep(2);
        } else {
          // Security best practice: don't reveal if username exists
          setError('If this username exists, a security question will be shown.');
        }
      } else {
        setError(response.data.message || 'Error processing your request.');
      }
    } catch (err: any) {
      console.error('Forgot password error:', err);
      const errorMessage = err.response?.data?.message || 'Network error. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify security answer and reset password
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/reset-password', {
        username,
        security_answer: securityAnswer,
        new_password: newPassword
      });

      if (response.data.success) {
        setStep(4);
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(response.data.message || 'Error resetting password.');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      const errorMessage = err.response?.data?.message || 'Network error. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleUsernameSubmit} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Forgot Password
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Enter your username to reset your password.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserRound className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    placeholder="Enter your username"
                    className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 animate-in fade-in duration-200">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3.5 rounded-lg font-medium shadow-lg shadow-pink-500/25 hover:shadow-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-pink-500/25 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        );

      case 2:
        return (
          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Security Verification
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Please answer your security question to verify your identity.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Security Question
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-800 dark:text-gray-200 font-medium">{securityQuestion}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="securityAnswer" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your Answer
                </label>
                <input
                  id="securityAnswer"
                  name="securityAnswer"
                  type="text"
                  required
                  placeholder="Enter your answer"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors duration-200"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="newPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter new password"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10 transition-colors duration-200"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    placeholder="Confirm new password"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10 transition-colors duration-200"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 animate-in fade-in duration-200">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !securityAnswer.trim() || !newPassword || !confirmPassword}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3.5 rounded-lg font-medium shadow-lg shadow-pink-500/25 hover:shadow-xl hover:from-pink-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-pink-500/25 flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        );

      case 3:
        return (
          <div className="text-center space-y-6 py-4 animate-in fade-in duration-500">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">
                Password Reset Successfully!
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Your password has been updated. Redirecting to login...
              </p>
            </div>
            
            <div className="flex flex-col gap-3">
              <Link 
                href="/login"
                className="inline-flex items-center justify-center w-full bg-pink-500 text-white py-3 rounded-lg font-medium hover:bg-pink-600 transition-colors duration-200"
              >
                Go to Login Now
              </Link>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Redirecting in 3 seconds...
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      {step > 1 && step < 3 && (
        <button
          onClick={() => setStep(step - 1)}
          className="inline-flex items-center text-sm text-pink-500 hover:text-pink-600 font-medium mb-4 transition-colors duration-200 group"
          disabled={isLoading}
        >
          <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform duration-200" />
          Back
        </button>
      )}

      {/* Main Content */}
      <div className="animate-in fade-in duration-300">
        {renderStep()}
      </div>

      {/* Back to Login Link */}
      {step === 1 && (
        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link 
            href="/login"
            className="inline-flex items-center text-sm text-pink-500 hover:text-pink-600 font-medium transition-colors duration-200 group"
          >
            <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform duration-200" />
            Back to login
          </Link>
        </div>
      )}
    </div>
  );
}