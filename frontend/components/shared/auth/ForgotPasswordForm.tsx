// components/shared/auth/ForgotPasswordForm.tsx
'use client';

import { useState,} from 'react';
import {  ArrowLeft, Eye, EyeOff, CheckCircle, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UserData {
  username: string;
  securityQuestion: string;
  securityAnswer: string;
  password?: string;
  // other user fields
}

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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if username exists and get security question
  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Get users from localStorage
      const existingUsers = JSON.parse(
        localStorage.getItem('campusVibesUsers') || '[]'
      );

      // Find user by username
      const user = existingUsers.find((u: UserData) => u.username === username);
      
      if (!user) {
        setError('Username not found. Please check and try again.');
        setIsLoading(false);
        return;
      }

      if (!user.securityQuestion || !user.securityAnswer) {
        setError('No security question set for this account. Please contact support.');
        setIsLoading(false);
        return;
      }

      setUserData(user);
      setStep(2);
    } catch (err) {
      setError('Error retrieving account information. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify security answer
  const handleSecurityAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userData) return;

    // Simple case-insensitive comparison
    if (securityAnswer.toLowerCase().trim() !== userData.securityAnswer.toLowerCase().trim()) {
      setError('Incorrect security answer. Please try again.');
      return;
    }

    setStep(3);
  };

  // Reset password
  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

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
      // Get users from localStorage
      const existingUsers = JSON.parse(
        localStorage.getItem('campusVibesUsers') || '[]'
      );

      // Update user's password
      const updatedUsers = existingUsers.map((user: UserData) => 
        user.username === username ? { ...user, password: newPassword } : user
      );

      // Save back to localStorage
      localStorage.setItem('campusVibesUsers', JSON.stringify(updatedUsers));
      
      setStep(4);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError('Error resetting password. Please try again.');
      console.error(err);
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
                    className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3.5 rounded-lg font-medium shadow-lg shadow-pink-500/25 hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        );

      case 2:
        return (
          <form onSubmit={handleSecurityAnswerSubmit} className="space-y-6">
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-300">
                Please answer your security question to verify your identity.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Security Question
                </label>
                <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <p className="text-gray-800 dark:text-gray-200">{userData?.securityQuestion}</p>
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
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3.5 rounded-lg font-medium shadow-lg shadow-pink-500/25 hover:shadow-xl transition-all duration-300"
            >
              Verify Identity
            </button>
          </form>
        );

      case 3:
        return (
          <form onSubmit={handlePasswordReset} className="space-y-6">
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-300">
                Create a new password for your account.
              </p>
            </div>

            <div className="space-y-4">
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
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3.5 rounded-lg font-medium shadow-lg shadow-pink-500/25 hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        );

      case 4:
        return (
          <div className="text-center space-y-6 py-4">
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
            
            <Link 
              href="/login"
              className="inline-flex items-center justify-center w-full bg-pink-500 text-white py-3 rounded-lg font-medium hover:bg-pink-600 transition-colors"
            >
              Go to Login
            </Link>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {step > 1 && step < 4 && (
        <button
          onClick={() => setStep(step - 1)}
          className="inline-flex items-center text-sm text-pink-500 hover:text-pink-600 font-medium mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
      )}

      {renderStep()}

      {step === 1 && (
        <div className="text-center">
          <Link 
            href="/login"
            className="inline-flex items-center text-sm text-pink-500 hover:text-pink-600 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to login
          </Link>
        </div>
      )}
    </div>
  );
}