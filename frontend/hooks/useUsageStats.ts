/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import api from '@/lib/axio';

export interface UsageStats {
  messages: {
    used: number;
    limit: number;
    remaining: number;
  };
  likes: {
    used: number;
    limit: number;
    remaining: number;
  };
  swipes: {
    used: number;
    limit: number;
    remaining: number;
  };
}

export interface RealUsageBreakdown {
  messages_sent: number;
  post_likes: number;
  profile_likes: number;
  total_likes: number;
  swipes: number;
  period_start: string;
  period_end: string;
}

export interface SubscriptionUsage {
  messages_used_in_subscription: number;
  likes_used_in_subscription: number;
  swipes_used_in_subscription: number;
}

export interface UsageResponse {
  success: boolean;
  usage?: UsageStats;
  real_usage_breakdown?: RealUsageBreakdown;
  subscription_usage?: SubscriptionUsage;
  plan?: any;
  days_remaining?: number;
  message?: string;
}

export interface UsageSummary {
  subscription_info: {
    plan_name: string;
    tier: string;
    status: string;
    billing_cycle: string;
    is_active: boolean;
    days_remaining: number;
  };
  limits: {
    messages: number;
    likes: number;
    swipes: number;
    unlimited_messages: boolean;
    unlimited_likes: boolean;
    unlimited_swipes: boolean;
  };
  current_usage: {
    messages: number;
    likes: number;
    swipes: number;
  };
  remaining: {
    messages: number;
    likes: number;
    swipes: number;
  };
  usage_percentage: {
    messages: number;
    likes: number;
    swipes: number;
  };
  exceeded_limits: string[] | false;
  period: {
    start: string;
    end: string;
  };
  real_usage?: {
    messages: number;
    likes: number;
    swipes: number;
  };
  discrepancy?: {
    messages: number;
    likes: number;
    swipes: number;
  };
  breakdown?: {
    post_likes: number;
    profile_likes: number;
    total_likes: number;
  };
}

export interface SyncUsageResponse {
  success: boolean;
  message: string;
  real_usage: {
    messages: number;
    likes: number;
    swipes: number;
  };
  subscription_usage: {
    messages_used: number;
    likes_used: number;
    swipes_used: number;
  };
}

export const useUsageStats = () => {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [realUsageBreakdown, setRealUsageBreakdown] = useState<RealUsageBreakdown | null>(null);
  const [subscriptionUsage, setSubscriptionUsage] = useState<SubscriptionUsage | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [daysRemaining, setDaysRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<UsageResponse>('/subscription/usage');
      if (response.data.success) {
        setUsage(response.data.usage || null);
        setRealUsageBreakdown(response.data.real_usage_breakdown || null);
        setSubscriptionUsage(response.data.subscription_usage || null);
        setPlan(response.data.plan || null);
        setDaysRemaining(response.data.days_remaining || 0);
      } else {
        setError(response.data.message || 'Failed to fetch usage statistics');
      }
    } catch (err) {
      setError('Failed to fetch usage statistics');
      console.error('Error fetching usage stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageStats();
  }, []);

  return {
    usage,
    realUsageBreakdown,
    subscriptionUsage,
    plan,
    daysRemaining,
    loading,
    error,
    fetchUsageStats
  };
};