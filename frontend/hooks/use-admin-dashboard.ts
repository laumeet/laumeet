/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axio'
interface DashboardStats {
  user_stats: {
    total_users: number;
    new_users_today: number;
    online_users: number;
    premium_users: number;
    premium_percentage: number;
  };
  subscription_stats: {
    active_subscriptions: number;
    conversion_rate: number;
    plan_distribution: Array<{
      plan: string;
      count: number;
    }>;
  };
  revenue_stats: {
    total_revenue: number;
    today_revenue: number;
    monthly_recurring_revenue: number;
  };
  recent_activity: {
    recent_payments: any[];
    recent_subscriptions: any[];
  };
}

interface DashboardResponse {
  success: boolean;
  dashboard: DashboardStats;
  message?: string;
}

export const useAdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/admin/dashboard');

      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: DashboardResponse = await response.data
      
      if (data.success) {
        setDashboardData(data.dashboard);
      } else {
        setError(data.message || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      console.error('Admin dashboard fetch error:', err);
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDashboard = async () => {
    return await fetchDashboard();
  };

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { 
    dashboardData, 
    loading, 
    error, 
    refetch: fetchDashboard,
    refreshDashboard
  };
};