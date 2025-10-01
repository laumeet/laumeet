// components/professional/ProfessionalHeader.tsx
'use client';

import { Bell, Search, MessageCircle, User, Settings, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ProfessionalHeaderProps {
  activeTab: string;
}

export default function ProfessionalHeader({ activeTab }: ProfessionalHeaderProps) {
  // const [notifications, setNotifications] = useState(3);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [loading, setLoading] = useState(false)

  const getTitleConfig = () => {
    const config = {
      profile: { title: 'Profile', icon: User, gradient: 'from-blue-500 to-cyan-500' },
      explore: { title: 'Discover', icon: Search, gradient: 'from-purple-500 to-pink-500' },
      chat: { title: 'Messages', icon: MessageCircle, gradient: 'from-green-500 to-teal-500' },
      feed: { title: 'Campus Feed', icon: Bell, gradient: 'from-orange-500 to-red-500' },
      settings: { title: 'Settings', icon: Settings, gradient: 'from-gray-600 to-gray-700' }
    };
    return config[activeTab as keyof typeof config] || config.feed;
  };

  const titleConfig = getTitleConfig();
  const IconComponent = titleConfig.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

const getBackendUrl = () => {
  // Always use environment variable if set
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  
  // In production, don't fall back to localhost
  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_URL environment variable is required in production");
  }
  
  // Only use localhost in development
  return "http://localhost:5000";
};

const handleLogout = async () => {
  setLoading(true);
  try {
    const BACKEND_URL = getBackendUrl()

    // Call Flask backend directly
    const response = await fetch(`${BACKEND_URL}/logout`, {
      method: "POST",
      credentials: "include", // This will send cookies
    });

    if (response.ok) {
     toast.success("Logout successful");
      // Clear frontend cookies manually
      document.cookie = "access_token_cookie=; Path=/; Max-Age=0; SameSite=None; Secure";
      document.cookie = "refresh_token_cookie=; Path=/; Max-Age=0; SameSite=None; Secure";
      document.cookie = "is_logged_in=; Path=/; Max-Age=0; SameSite=None; Secure";
      
      router.push("/login");
    } else {
      throw new Error(`Logout failed: ${response.status}`);
    }
  } catch (error) {
    console.error("Logout failed:", error);
    // Still clear cookies and redirect as fallback
    document.cookie = "access_token_cookie=; Path=/; Max-Age=0";
    document.cookie = "refresh_token_cookie=; Path=/; Max-Age=0";
    document.cookie = "is_logged_in=; Path=/; Max-Age=0";
    router.push("/login");
  }finally{
    setLoading(false)
  }
};

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-700/60 sticky top-0 z-50">
      <div className="max-w-md mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Title with Icon */}
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl bg-gradient-to-r ${titleConfig.gradient} shadow-lg`}>
              <IconComponent className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {titleConfig.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Campus Vibes</p>
            </div>
          </div>

          {/* Right Section - Action Icons */}
          <div className="flex items-center space-x-2">
            {/* Search Button */}
            {/* <button 
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
            >
              <Search className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </button> */}

    
            {/* Profile Menu */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="p-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                <User className="h-5 w-5 text-white" />
              </button>
              
              {showProfileMenu && (
                <div className="absolute right-0 top-12 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                
                
                  <button 
                    onClick={handleLogout}
                    disabled={loading}
                    className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {loading ? 'Signing Out...' : 'Sign Out'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar
        {showSearch && (
          <div className="mt-3 animate-in slide-in-from-top-2 duration-300">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search connections, interests..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
        )} */}
      </div>
    </header>
  );
}