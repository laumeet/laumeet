// components/shared/auth/LoginForm.tsx
'use client';
import axios from 'axios'
import { useState } from 'react';
import { Eye, EyeOff,Lock, UserRound } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import api from '@/lib/axio';
export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const router = useRouter()
  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await api.post("/login", formData);
  
      if(res.status === 200 ){
        toast.success('Login Successful')
        setTimeout(() => {
          toast.success('Redirecting to homepage...')
          router.replace('/explore')
        }, 1000);
      }
    } catch (error) {
      
        if (axios.isAxiosError(error)) {
          toast.error(error.response?.data?.message);
        } else {
          toast.error('An unexpected error occurred');
        }
    }
   
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-4">
        {/* username Field */}
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
              type="username"
              required
              placeholder="Annie"
              className="pl-10 w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={formData.username}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <Link 
              href="/forgot-password" 
              className="text-sm text-pink-500 hover:text-pink-600"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Enter your password"
              className="pl-10 pr-10 w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              value={formData.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3.5 rounded-lg font-medium shadow-lg shadow-pink-500/25 hover:shadow-xl transition-all duration-300"
      >
        Log In
      </button>

      {/* Divider */}
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300 dark:border-gray-600" />
        </div>
      
      </div>

  
      {/* Sign Up Link */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-pink-500 font-medium hover:text-pink-600">
          Sign up
        </Link>
      </div>
    </form>
  );
}