/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';

interface SubscriptionData {
  plan_name: string;
  tier: string;
  status: string;
  billing_cycle: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  auto_renew: boolean;
}

interface UsageData {
  messages_used: number;
  messages_limit: number;
  likes_used: number;
  likes_limit: number;
  swipes_used: number;
  swipes_limit: number;
}

interface PaymentSummary {
  total_payments: number;
  successful_payments: number;
  total_revenue: number;
}

interface AdminUser {
  id: string;
  username: string;
  name: string;
  age: string;
  gender: string;
  department: string;
  genotype: string;
  level: string;
  interestedIn: string;
  religious: string;
  isAnonymous: boolean;
  category: string;
  bio: string;
  pictures: string[];
  timestamp: string;
  is_admin: boolean;
  subscription?: SubscriptionData;
  usage?: UsageData;
  payment_summary?: PaymentSummary;
}

interface Statistics {
  total_users: number;
  premium_users: number;
  free_users: number;
  premium_percentage: number;
  total_revenue: number;
  monthly_revenue: number;
  arpu: number;
}

interface PaginationData {
  page: number;
  per_page: number;
  total_pages: number;
  total_users: number;
  has_next: boolean;
  has_prev: boolean;
}

interface AdminUsersResponse {
  success: boolean;
  total_users: number;
  users: AdminUser[];
  statistics?: Statistics;
  pagination?: PaginationData;
  message?: string;
}

interface FetchUsersParams {
  page?: number;
  per_page?: number;
  search?: string;
  subscription?: string;
  sort_by?: string;
  sort_order?: string;
}

interface UpdateUserData {
  name?: string;
  department?: string;
  level?: string;
  genotype?: string;
  religious?: string;
  interestedIn?: string;
  category?: string;
  bio?: string;
  is_admin?: boolean;
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  const fetchUsers = useCallback(async (params: FetchUsersParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      if (params.page) queryParams.append('page', params.page.toString());
      if (params.per_page) queryParams.append('per_page', params.per_page.toString());
      if (params.search) queryParams.append('search', params.search);
      if (params.subscription) queryParams.append('subscription', params.subscription);
      if (params.sort_by) queryParams.append('sort_by', params.sort_by);
      if (params.sort_order) queryParams.append('sort_order', params.sort_order);

      const url = `/api/admin/users?${queryParams.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AdminUsersResponse = await response.json();
      
      if (data.success) {
        setUsers(data.users || []);
        setTotalUsers(data.total_users);
        setStatistics(data.statistics || null);
        setPagination(data.pagination || null);
      } else {
        setError(data.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      console.error('Admin users fetch error:', err);
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/delete?user_id=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();
      
      if (data.success) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        setTotalUsers(prev => prev - 1);
        
        if (statistics) {
          setStatistics(prev => prev ? {
            ...prev,
            total_users: prev.total_users - 1,
            premium_users: users.find(user => user.id === userId)?.subscription ? 
              prev.premium_users - 1 : prev.premium_users,
            free_users: users.find(user => user.id === userId)?.subscription ? 
              prev.free_users : prev.free_users - 1,
          } : null);
        }
        
        return { success: true, message: 'User deleted successfully' };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err: any) {
      console.error('Delete user error:', err);
      return { 
        success: false, 
        message: err.message || 'Failed to delete user' 
      };
    }
  };

  const updateUser = async (userId: string, updates: UpdateUserData) => {
    try {
      const response = await fetch(`/api/admin/users/update?user_id=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId, ...updates }),
      });

      const data = await response.json();
      
      if (data.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, ...updates }
            : user
        ));
        return { success: true, message: 'User updated successfully', user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err: any) {
      console.error('Update user error:', err);
      return { 
        success: false, 
        message: err.message || 'Failed to update user' 
      };
    }
  };

  const updateUserSubscription = async (userId: string, updates: Partial<SubscriptionData>) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/subscription`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      const data = await response.json();
      
      if (data.success) {
        setUsers(prev => prev.map(user => 
          user.id === userId 
            ? { ...user, subscription: { ...user.subscription, ...updates } as SubscriptionData }
            : user
        ));
        return { success: true, message: 'Subscription updated successfully' };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err: any) {
      console.error('Update subscription error:', err);
      return { 
        success: false, 
        message: err.message || 'Failed to update subscription' 
      };
    }
  };

  const exportUsers = async (filters: FetchUsersParams = {}) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });

      const response = await fetch(`/api/admin/users?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AdminUsersResponse = await response.json();
      
      if (data.success) {
        const headers = ['ID', 'Username', 'Name', 'Email', 'Age', 'Gender', 'Department', 'Level', 'Subscription Tier', 'Status', 'Revenue', 'Admin'];
        const csvData = data.users.map(user => [
          user.id,
          user.username,
          user.name || '',
          user.username,
          user.age,
          user.gender,
          user.department || '',
          user.level || '',
          user.subscription?.tier || 'free',
          user.subscription?.status || 'active',
          user.payment_summary?.total_revenue || 0,
          user.is_admin ? 'Yes' : 'No'
        ]);

        const csvContent = [headers, ...csvData]
          .map(row => row.map(field => `"${field}"`).join(','))
          .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lauMeet-users-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        return { success: true, message: 'Users exported successfully' };
      } else {
        return { success: false, message: data.message || 'Failed to export users' };
      }
    } catch (err: any) {
      console.error('Export users error:', err);
      return { 
        success: false, 
        message: err.message || 'Failed to export users' 
      };
    }
  };

  const refreshStatistics = async () => {
    try {
      const response = await fetch('/api/admin/users?per_page=1', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AdminUsersResponse = await response.json();
      
      if (data.success && data.statistics) {
        setStatistics(data.statistics);
        return { success: true, statistics: data.statistics };
      } else {
        return { success: false, message: data.message };
      }
    } catch (err: any) {
      console.error('Refresh statistics error:', err);
      return { 
        success: false, 
        message: err.message || 'Failed to refresh statistics' 
      };
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { 
    users, 
    loading, 
    error, 
    totalUsers,
    statistics,
    pagination,
    refetch: fetchUsers,
    deleteUser,
    updateUser,
    updateUserSubscription,
    exportUsers,
    refreshStatistics
  };
};