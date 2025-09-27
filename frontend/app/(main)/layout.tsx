'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import ProfessionalHeader from '@/components/professional/ProfessionalHeader';
import LoadingSpinner from '@/components/professional/LoadingSpinner';
import AdvancedBottomNav from '@/components/professional/AdvancedBottomNav';
import api from '@/lib/axio';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [activeTab, setActiveTab] = useState('feed');
  const [isLoading, setIsLoading] = useState(true); // start with loading true
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // If there's no localStorage token, rely on cookie presence (middleware) — but still try verify:
    const localToken = localStorage.getItem("access_token");

    // Try to verify by calling backend. This confirms token is valid (not expired).
    api.get("/protected")
      .then(() => {
        setChecking(false); // valid; allow render
      })
      .catch(() => {
        // invalid or expired - remove any stored token and send to login
        localStorage.removeItem("access_token");
        router.replace("/login");
      });
  }, [router]);

  useEffect(() => {
    // Determine active tab based on pathname
    if (pathname.startsWith('/feed')) {
      setActiveTab('feed');
    } else if (pathname.startsWith('/explore')) {
      setActiveTab('explore');
    
    } else if (pathname.startsWith('/jobs')) {
      setActiveTab('jobs');
    } else if (pathname.startsWith('/messages')) {
      setActiveTab('messages');
    } else if (pathname.startsWith('/notifications')) {
      setActiveTab('notifications');
    } else {
      setActiveTab('feed'); // default tab
    }
    setIsLoading(false); // done loading after initial tab set
  }, [pathname]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span>Checking authentication…</span>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    setIsLoading(true);
    setActiveTab(tab);

    // Simulate navigation delay
    setTimeout(() => {
      router.push(`/${tab}`);
      setIsLoading(false);
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Professional Header */}
      <ProfessionalHeader activeTab={activeTab} />

      {/* Main Content Area */}
      <div className="relative">
        <main className="max-w-md mx-auto px-4 py-6">
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
