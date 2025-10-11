// components/shared/layout/AuthLayout.tsx
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
}

export default function AuthLayout({ 
  children, 
  title, 
  subtitle, 
  showBackButton = false 
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-purple-50 dark:from-gray-900 dark:to-purple-900/20 py-8 px-6">
      {/* Header */}
      <header className="mb-8">
        {showBackButton && (
          <Link href="/" className="inline-flex items-center text-sm text-gray-600 dark:text-gray-300 mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Link>
        )}
        
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent font-poppins">
            Laumeet
          </h1>
          <div className="mt-4">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">{title}</h2>
            {subtitle && (
              <p className="text-gray-600 dark:text-gray-300 mt-2">{subtitle}</p>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        {children}
      </div>

      {/* Footer */}
      <footer className="mt-6 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          By continuing, you agree to our{" "}
          <a href="#" className="text-pink-500 hover:underline">Terms of Service</a> and{" "}
          <a href="#" className="text-pink-500 hover:underline">Privacy Policy</a>
        </p>
      </footer>
    </div>
  );
}