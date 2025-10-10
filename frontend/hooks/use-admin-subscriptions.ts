/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import api from '@/lib/axio';

interface AdminSubscription {
  id: string;
  user_id: string;
  username: string;
  plan_name: string;
  tier: string;
  status: string;
  billing_cycle: string;
  start_date: string;
  end_date: string;
  days_remaining: number;
  auto_renew: boolean;
  created_at: string;
}

interface SubscriptionStatistics {
  total_subscriptions: number;
  active_subscriptions: number;
  cancelled_subscriptions: number;
  expired_subscriptions: number;
  monthly_revenue: number;
  yearly_revenue: number;
  average_revenue_per_user: number;
}

interface PaginationData {
  page: number;
  per_page: number;
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_prev: boolean;
}

interface AdminSubscriptionsResponse {
  success: boolean;
  subscriptions: AdminSubscription[];
  statistics?: SubscriptionStatistics;
  pagination?: PaginationData;
  message?: string;
}

interface FetchSubscriptionsParams {
  page?: number;
  per_page?: number;
  search?: string;
  status?: string;
  plan?: string;
  sort_by?: string;
  sort_order?: string;
}

export const useAdminSubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<SubscriptionStatistics | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);

  const fetchSubscriptions = async (params: FetchSubscriptionsParams = {}) => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) queryParams.append(key, value.toString());
      });

      const response = await fetch(`/api/admin/subscriptions?${queryParams.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data: AdminSubscriptionsResponse = await response.json();

      if (data.success) {
        setSubscriptions(data.subscriptions);
        setStatistics(data.statistics || null);
        setPagination(data.pagination || null);
      } else {
        setError(data.message || 'Failed to fetch subscriptions');
      }
    } catch (err: any) {
      console.error('Admin subscriptions fetch error:', err);
      setError(err.message || 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionStatus = async (id: string, status: string) => {
    try {
      const response = await api.put(`/admin/subscriptions/${id}`, { status });
      if (response.data.success) {
        setSubscriptions(prev =>
          prev.map(sub => (sub.id === id ? { ...sub, status } : sub))
        );
        return { success: true, message: 'Subscription status updated successfully' };
      }
      return { success: false, message: response.data.message };
    } catch (err: any) {
      console.error('Update subscription status error:', err);
      return { success: false, message: err.message };
    }
  };

  const exportSubscriptions = async () => {
    try {
      const response = await fetch('/api/admin/subscriptions', {
        method: 'GET',
        credentials: 'include',
      });

      const data: AdminSubscriptionsResponse = await response.json();
      if (!data.success) throw new Error(data.message || 'Export failed');

      const headers = [
        'Subscription ID',
        'Username',
        'Plan',
        'Tier',
        'Status',
        'Start Date',
        'End Date',
        'Billing Cycle',
        'Auto Renew',
      ];

      const csv = [headers, ...data.subscriptions.map(s => [
        s.id, s.username, s.plan_name, s.tier, s.status, s.start_date, s.end_date, s.billing_cycle, s.auto_renew ? 'Yes' : 'No'
      ])].map(r => r.join(',')).join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
    } catch (err: any) {
      console.error('Export subscriptions error:', err);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  return { subscriptions, loading, error, statistics, pagination, fetchSubscriptions, updateSubscriptionStatus, exportSubscriptions };
};
