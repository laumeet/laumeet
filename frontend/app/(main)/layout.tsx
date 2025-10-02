// app/(main)/layout.tsx
'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ProfessionalHeader from '@/components/professional/ProfessionalHeader';
import LoadingSpinner from '@/components/professional/LoadingSpinner';
import AdvancedBottomNav from '@/components/professional/AdvancedBottomNav';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState('feed');
  const [isLoading, setIsLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Determine active tab based on current pathname
  useEffect(() => {
    if (pathname) {
      if (pathname.startsWith('/feed')) {
        newActiveTab = 'feed';
      } else if (pathname.startsWith('/explore')) {
        newActiveTab = 'explore';
      } else if (pathname.startsWith('/chat') || pathname.startsWith('/messages')) {
        newActiveTab = 'chat';
      } else if (pathname.startsWith('/profile')) {
        newActiveTab = 'profile';
      } else if (pathname.startsWith('/create-post') || pathname.startsWith('/create-event')) {
        newActiveTab = 'create';
      } else if (pathname.startsWith('/settings')) {
        newActiveTab = 'settings';
      }

      setActiveTab(newActiveTab);
      setIsLoading(false);
    }
  }, [pathname]);

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return; // Don't navigate if already on the tab
    
    setIsNavigating(true);
    setActiveTab(tab);

    // Map tab IDs to actual routes
    const routeMap: { [key: string]: string } = {
      feed: '/feed',
      explore: '/explore',
      chat: '/chat',
      profile: '/profile',
      create: '/create-post' // Default create option
    };

    const route = routeMap[tab];
    
    // Simulate navigation delay for better UX
    setTimeout(() => {
      router.push(route);
      setIsNavigating(false);
    }, 150);
  };

  // Show loading spinner during initial load or navigation
  if (isLoading || isNavigating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400 text-sm">
            {isNavigating ? 'Navigating...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Professional Header */}
      <ProfessionalHeader activeTab={activeTab} />

      {/* Main Content Area */}
      <div className="relative">
        <main className="max-w-md mx-auto pb-32 min-h-[calc(100vh-140px)]">
          {children}
        </main>
      </div>

      {/* Advanced Bottom Navigation */}
      <AdvancedBottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
      />
    </div>
  );
}