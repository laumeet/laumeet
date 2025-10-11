// components/shared/ui/Header.tsx
'use client';

import { Bell, Search, Menu, Heart } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  activeTab: string;
}

export default function Header({ activeTab }: HeaderProps) {
  const [notificationsCount, setNotificationsCount] = useState(3);
  
  const getTitle = () => {
    switch (activeTab) {
      case 'profile': return 'My Profile';
      case 'explore': return 'Explore';
      case 'chat': return 'Messages';
      case 'feed': return 'Campus Feed';
      case 'settings': return 'Settings';
      default: return 'Laumeet';
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        {/* Left side - Menu and Title */}
        <div className="flex items-center space-x-3">
          <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {getTitle()}
          </h1>
        </div>

        {/* Right side - Icons */}
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors relative">
            <Search className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          
          <button className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors relative">
            <Bell className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            {notificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notificationsCount}
              </span>
            )}
          </button>
          
          <button className="p-2 rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 transition-colors">
            <Heart className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
    </header>
  );
}