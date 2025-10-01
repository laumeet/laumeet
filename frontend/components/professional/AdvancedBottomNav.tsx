// components/professional/AdvancedBottomNav.tsx
'use client';

import { Home, Search, MessageCircle, User, Plus, Heart, Image, Calendar } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AdvancedBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function AdvancedBottomNav({ activeTab, onTabChange }: AdvancedBottomNavProps) {
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const router = useRouter();

  const navItems = [
    { id: 'feed', icon: Home, label: 'Feed' },
    { id: 'explore', icon: Search, label: 'Explore' },
    { id: 'create', icon: Plus, label: 'Create', special: true },
    { id: 'chat', icon: MessageCircle, label: 'Chat' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  const handleNavClick = (itemId: string) => {
    if (itemId === 'create') {
      setShowCreateMenu(!showCreateMenu);
    } else {
      onTabChange(itemId);
      setShowCreateMenu(false);
      // Navigate to the corresponding page
      router.push(`/${itemId === 'feed' ? '' : itemId}`);
    }
  };

  const handleCreateOption = (option: 'post' | 'event') => {
    setShowCreateMenu(false);
    if (option === 'post') {
      router.push('/create-post');
    } else {
      router.push('/create-event');
    }
  };

  return (
    <>
      {/* Create Menu Overlay */}
      {showCreateMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-200"
          onClick={() => setShowCreateMenu(false)}
        />
      )}

      {/* Create Menu Modal */}
      {showCreateMenu && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-up duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-[200px]">
            <button 
              onClick={() => handleCreateOption('post')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Image className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">New Post</span>
            </button>
            <button 
              onClick={() => handleCreateOption('event')}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Calendar className="h-5 w-5 text-pink-500" />
              <span className="text-sm font-medium">Create Event</span>
            </button>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <nav className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60 px-4 py-2 z-50 max-w-md w-[calc(100%-2rem)]">
        <div className="flex justify-around items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isSpecial = item.special;

            if (isSpecial) {
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className="relative -top-6 bg-gradient-to-r from-pink-500 to-purple-600 p-4 rounded-2xl shadow-lg hover:from-pink-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-110"
                >
                  <Icon className="h-6 w-6 text-white" />
                </button>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all duration-200 min-w-[60px] ${
                  isActive 
                    ? 'text-pink-500 bg-pink-50 dark:bg-pink-900/20' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
                {isActive && (
                  <div className="w-1 h-1 bg-pink-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}