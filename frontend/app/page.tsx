// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Heart, Users, Lock, Shield } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {
  const [userCount, setUserCount] = useState(12536);

  // Simulate increasing user count
  useEffect(() => {
    const interval = setInterval(() => {
      setUserCount(prev => prev + 1);
    }, 60000); // Add 1 user every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 dark:from-gray-900 dark:to-purple-900/20 flex flex-col">
      {/* Header */}
      <header className="px-6 pt-10 pb-6 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent font-poppins">
          Campus Vibes
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">
          Find your match, vibe, or friend — safely and privately.
        </p>
      </header>

      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="relative w-full max-w-xs">
          <div className="absolute -top-10 -left-6 w-24 h-24 bg-pink-200 dark:bg-pink-800 rounded-full opacity-50 blur-xl"></div>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-purple-200 dark:bg-purple-800 rounded-full opacity-50 blur-xl"></div>
          
          <div className="relative bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <Heart className="h-8 w-8 text-white" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white">
              Campus Connections
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center mt-2 text-sm">
              Join thousands of students finding meaningful connections on campus
            </p>
            
            <div className="mt-6 flex items-center justify-center space-x-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg py-2">
              <Users className="h-5 w-5 text-pink-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {userCount.toLocaleString()}+ students already vibing
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 mt-8 mb-6 grid grid-cols-2 gap-4">
        <div className="flex items-center">
          <div className="bg-pink-100 dark:bg-pink-900/30 p-2 rounded-lg mr-2">
            <Lock className="h-4 w-4 text-pink-500" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300">Private</span>
        </div>
        <div className="flex items-center">
          <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg mr-2">
            <Shield className="h-4 w-4 text-purple-500" />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300">Secure</span>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="px-6 pb-10 mt-auto">
        <div className="flex flex-col space-y-5">
          <Link href={'/signup'}>
          <button className="w-full cursor-pointer bg-gradient-to-r from-pink-500 to-purple-600 text-white py-4 rounded-xl font-medium shadow-lg shadow-pink-500/25 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5">
            Sign Up
          </button>
          </Link>
          <Link href={'/login'}>
          <button className="w-full cursor-pointer bg-white dark:bg-gray-800 text-gray-800 dark:text-white py-4 rounded-xl font-medium border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
            Log In
          </button>
          </Link>
        </div>
        
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-6">
          By joining, you agree to our Terms and Privacy Policy
        </p>
      </div>
    </div>
  );
}