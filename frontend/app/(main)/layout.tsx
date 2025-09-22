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
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Extract active tab from pathname
    const tab = pathname.split('/').pop() || 'feed';
    setActiveTab(tab);
  }, [pathname]);

  const handleTabChange = (tab: string) => {
    setIsLoading(true);
    setActiveTab(tab);
    
    // Simulate navigation delay
    setTimeout(() => {
      router.push(`/${tab}`);
      setIsLoading(false);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Professional Header */}
      <ProfessionalHeader activeTab={activeTab} />
      
      {/* Main Content Area */}
      <div className="relative">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <main className="max-w-md mx-auto px-4 py-6">
            {children}
          </main>
        )}
      </div>
      
      {/* Advanced Bottom Navigation */}
      <AdvancedBottomNav 
        activeTab={activeTab} 
        onTabChange={handleTabChange}
      />
    </div>
  );
}