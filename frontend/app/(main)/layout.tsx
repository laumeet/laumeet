// app/(main)/layout.tsx
'use client';
import ProfessionalHeader from '@/components/professional/ProfessionalHeader';
import AdvancedBottomNav from '@/components/professional/AdvancedBottomNav';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Professional Header */}
      <ProfessionalHeader />

      {/* Main Content Area */}
      <div className="relative">
        <main className="max-w-md mx-auto   min-h-[calc(100vh-140px)]">
          {children}
        </main>
      </div>

      {/* Advanced Bottom Navigation */}
      <AdvancedBottomNav />
    </div>
  );
}