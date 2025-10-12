/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
'use client';

import { toast } from 'sonner';
import api from '@/lib/axio';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSocketContext } from '@/lib/socket-context';
import { 
  Users, 
  Crown, 
  BarChart3, 
  Menu, 
  X,
  DollarSign,
  Calendar,
  Search,
  User,
  LogOut,
  ChevronDown,
  Home
} from 'lucide-react';
import { useProfile } from '@/hooks/get-profile';

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: BarChart3,
    description: 'Overview and analytics'
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'Manage all users',
    badge: 'updated'
  },
  {
    name: 'Subscriptions',
    href: '/admin/subscription',
    icon: Crown,
    description: 'Subscription management',
    badge: 'new'
  },
  {
    name: 'Payments',
    href: '/admin/payments',
    icon: DollarSign,
    description: 'Payment history'
  },

];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
   const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
  const { profile } = useProfile();
  if(!profile?.is_admin){
    router.push("/explore");
  }
  const { socket, disconnect } = useSocketContext();

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      console.log('trying with api instance');
      const response = await api.post("/auth/logout");
      if (socket && socket.connected) {
      disconnect(); // close the socket gracefully
    }
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
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600/80" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h1 className="text-xl font-bold text-gray-800 dark:text-white">LauMeet Admin</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Management Portal</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="px-2 flex flex-col py-4 space-y-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className={`cursor-pointer py-4 px-2 rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 dark:border-blue-700 shadow-sm'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent'
                    }`}>
                      <div >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            isActive 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${
                                isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                              }`}>
                                {item.name}
                              </span>
                              {item.badge && (
                                <Badge 
                                  variant={item.badge === 'new' ? 'default' : 'secondary'} 
                                  className="text-xs px-1.5 py-0 h-4"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0">
        <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          {/* Sidebar Header */}
          <div className="flex items-center gap-3 h-16 flex-shrink-0 px-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex-shrink-0">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 w-8 h-8 rounded-lg flex items-center justify-center">
                <Crown className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-gray-800 dark:text-white truncate">LauMeet Admin</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Management Portal</p>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs">
              Live
            </Badge>
          </div>
          
          {/* Navigation */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 p-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.name} href={item.href}>
                    <Card className={`cursor-pointer transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 dark:border-blue-700 shadow-sm'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border-transparent hover:border-gray-200'
                    }`}>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg transition-colors ${
                            isActive 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            <item.icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium text-sm ${
                                isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'
                              }`}>
                                {item.name}
                              </span>
                              {item.badge && (
                                <Badge 
                                  variant={item.badge === 'new' ? 'default' : 'secondary'} 
                                  className="text-xs px-1.5 py-0 h-4"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </nav>
            
            {/* Footer */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p className="font-medium">LauMeet Admin v1.0.0</p>
                <p>Secure Management Portal</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col flex-1">
        {/* Top header - UPDATED DESIGN */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            {/* Left side - Page title and breadcrumb */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div className="flex flex-col">
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {navigation.find(item => item.href === pathname)?.name || 'Dashboard'}
                </h1>
                <div className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400">
                  <span>Admin</span>
                  <span>•</span>
                  <span>{navigation.find(item => item.href === pathname)?.description || 'Overview'}</span>
                </div>
              </div>
            </div>

            {/* Right side - Search, Notifications, User menu */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>
              </div>

      

              {/* Date */}
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <Calendar className="h-4 w-4" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
              </div>

              {/* User menu */}
              <div className="relative">
                <Button
                  variant="ghost"
                  className="flex items-center space-x-2 px-3 py-2"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                 
                  <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </Button>

                {/* User dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {profile?.name || 'User'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        @{profile?.username || 'username'}
                      </div>
                    </div>
             
                       <button 
                     onClick={() => router.push('/')}
                    className="w-full px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center"
                  >
                   <Home className="h-4 w-4 mr-3 text-green-500" />
                    Home
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
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>

      {/* Close user menu when clicking outside */}
      {userMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setUserMenuOpen(false)}
        />
      )}
    </div>
  );
}