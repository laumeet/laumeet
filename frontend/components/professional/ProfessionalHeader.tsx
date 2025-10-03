/* eslint-disable @typescript-eslint/no-explicit-any */
// components/professional/ProfessionalHeader.tsx
'use client';

import { Bell, Search, MessageCircle, User, Settings, LogOut, Home, Heart, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/axio';
import { useProfile } from '@/hooks/get-profile';
import { Button } from '../ui/button';

interface ProfessionalHeaderProps {
  activeTab: string;
}

export default function ProfessionalHeader({ activeTab }: ProfessionalHeaderProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const getTitleConfig = () => {
    const config = {
      profile: { title: 'My Profile', icon: User, gradient: 'from-blue-500 to-cyan-500' },
      explore: { title: 'Discover', icon: Search, gradient: 'from-purple-500 to-pink-500' },
      chat: { title: 'Messages', icon: MessageCircle, gradient: 'from-green-500 to-teal-500' },
      feed: { title: 'Campus Feed', icon: Home, gradient: 'from-orange-500 to-red-500' },
      create: { title: 'Create Post', icon: Heart, gradient: 'from-pink-500 to-purple-500' },
      settings: { title: 'Settings', icon: Settings, gradient: 'from-gray-600 to-gray-700' }
    };
    return config[activeTab as keyof typeof config] || config.feed;
  };
 const { profile, loading, error, refetch } = useProfile();


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      const response = await api.post("/auth/logout");

      if (response.data.success) {
        toast.success("Logged out successfully");
        
        // Clear all stored data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('campus-vibes-posts');
        localStorage.removeItem('campus-vibes-swipe-history');
        
        // Clear cookies
        document.cookie = "access_token_cookie=; Path=/; Max-Age=0; SameSite=None; Secure";
        document.cookie = "refresh_token_cookie=; Path=/; Max-Age=0; SameSite=None; Secure";
        document.cookie = "is_logged_in=; Path=/; Max-Age=0; SameSite=None; Secure";
        
        // Redirect to login
        router.push("/login");
      } else {
        throw new Error(response.data.message || 'Logout failed');
      }
    } catch (error: any) {
      console.error("Logout failed:", error);
      toast.error(error.response?.data?.message || "Logout failed");
      
      // Fallback: clear everything and redirect anyway
      localStorage.clear();
      document.cookie.split(";").forEach(cookie => {
        document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
      });
      router.push("/login");
    } finally {
      setLogoutLoading(false);
    }
  };

  const handleProfileClick = () => {
    setShowProfileMenu(false);
    router.push('/profile');
  };

  const handleSettingsClick = () => {
    setShowProfileMenu(false);
    router.push('/settings');
  };


  const titleConfig = getTitleConfig();
  const IconComponent = titleConfig.icon;

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
          
            </div>
          </div>

          {/* Right Section - Action Icons */}
          <div className="flex items-center space-x-2">
            {/* Profile Menu */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="p-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-all duration-200 shadow-lg"
              >
                <User className="h-5 w-5 text-white" />
              </button>
              
              {showProfileMenu && (
                <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in slide-in-from-top-2 duration-200">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {profile?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      @{profile?.username || 'username'}
                    </p>
                  </div>

                  {/* Menu Items */}
                  <button 
                    onClick={handleProfileClick}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center"
                  >
                    <User className="h-4 w-4 mr-3 text-blue-500" />
                    My Profile
                  </button>

                  <button 
                    onClick={handleSettingsClick}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center"
                  >
                    <Settings className="h-4 w-4 mr-3 text-gray-500" />
                    Settings
                  </button>

                  {/* Logout Button */}
                  <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                    <button 
                      onClick={handleLogout}
                      disabled={logoutLoading}
                      className="w-full px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center disabled:opacity-50"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      {logoutLoading ? 'Signing Out...' : 'Sign Out'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}