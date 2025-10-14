// hooks/useSubscription.ts
import { useState, useEffect } from 'react';

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: 'free' | 'premium' | 'vip';
  description: string;
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
    yearly_savings: number;
  };
  features: {
    max_messages: number;
    max_likes: number;
    max_swipes: number;
    has_advanced_filters: boolean;
    has_priority_matching: boolean;
    has_read_receipts: boolean;
    has_verified_badge: boolean;
    can_see_who_liked_you: boolean;
    can_rewind_swipes: boolean;
    has_incognito_mode: boolean;
  };
  is_active: boolean;
  is_popular: boolean;
}

export interface Subscription {
  id: string;
  plan: SubscriptionPlan;
  status: 'active' | 'canceled' | 'expired' | 'past_due' | 'trial';
  billing_cycle: 'monthly' | 'yearly';
  dates: {
    start_date: string;
    end_date: string;
    canceled_at: string | null;
    trial_ends_at: string | null;
  };
  auto_renew: boolean;
  usage: {
    messages: { used: number; limit: number; remaining: number };
    likes: { used: number; limit: number; remaining: number };
    swipes: { used: number; limit: number; remaining: number };
  };
  is_active: boolean;
  days_remaining: number;
}

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  provider: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
  dates: {
    created_at: string;
    paid_at: string | null;
  };
  plan: SubscriptionPlan;
}

export interface UsageStats {
  messages: { used: number; limit: number; remaining: number };
  likes: { used: number; limit: number; remaining: number };
  swipes: { used: number; limit: number; remaining: number };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export const useSubscription = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Base API call function using your new API routes
  const callApi = async <T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> => {
    try {
      const response = await fetch(`/api/subscription/${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });

      const data: ApiResponse<T> = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'API request failed');
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      throw new Error(errorMessage);
    }
  };

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await callApi<{ plans: SubscriptionPlan[] }>('plans');
      if (response.data) {
        setPlans(response.data.plans || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription plans';
      setError(errorMessage);
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await callApi<{
        has_subscription: boolean;
        subscription?: Subscription;
        current_plan?: Subscription;
      }>('current');

      if (response.data) {
        if (response.data.has_subscription && response.data.subscription) {
          setCurrentSubscription(response.data.subscription);
        } else if (response.data.current_plan) {
          setCurrentSubscription(response.data.current_plan);
        } else {
          setCurrentSubscription(null);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch current subscription';
      setError(errorMessage);
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await callApi<{ usage: UsageStats }>('usage');
      if (response.data) {
        setUsageStats(response.data.usage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch usage stats';
      setError(errorMessage);
      console.error('Error fetching usage stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    try {
      setLoading(true);
      setError(null);
      const response = await callApi<{
        success: boolean;
        message: string;
        payment_id?: string;
        checkout_url?: string;
        subscription?: Subscription;
      }>('subscribe', {
        method: 'POST',
        body: JSON.stringify({
          plan_id: planId,
          billing_cycle: billingCycle,
          payment_provider: 'flutterwave'
        }),
      });

      if (response.data?.subscription) {
        setCurrentSubscription(response.data.subscription);
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe';
      setError(errorMessage);
      console.error('Error subscribing:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await callApi<{
        success: boolean;
        message: string;
        subscription?: Subscription;
      }>('cancel', {
        method: 'POST',
      });

      if (response.data?.subscription) {
        setCurrentSubscription(response.data.subscription);
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel subscription';
      setError(errorMessage);
      console.error('Error canceling subscription:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reactivateSubscription = async (billingCycle: 'monthly' | 'yearly') => {
    try {
      setLoading(true);
      setError(null);
      const response = await callApi<{
        success: boolean;
        message: string;
        subscription?: Subscription;
      }>('reactivate', {
        method: 'POST',
        body: JSON.stringify({
          billing_cycle: billingCycle
        }),
      });

      if (response.data?.subscription) {
        setCurrentSubscription(response.data.subscription);
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reactivate subscription';
      setError(errorMessage);
      console.error('Error reactivating subscription:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (paymentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await callApi<{
        success: boolean;
        message: string;
        payment_id?: string;
        subscription?: Subscription;
      }>('verify-payment', {
        method: 'POST',
        body: JSON.stringify({
          payment_id: paymentId
        }),
      });

      if (response.data?.subscription) {
        setCurrentSubscription(response.data.subscription);
      }

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify payment';
      setError(errorMessage);
      console.error('Error verifying payment:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const syncUsage = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await callApi<{
        success: boolean;
        message: string;
        real_usage?: any;
        subscription_usage?: any;
      }>('usage-sync', {
        method: 'POST',
      });

      // Refresh usage stats after sync
      await fetchUsageStats();

      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync usage';
      setError(errorMessage);
      console.error('Error syncing usage:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setError(null);

  // Initialize data
  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
    fetchUsageStats();
  }, []);

  return {
    // State
    plans,
    currentSubscription,
    usageStats,
    loading,
    error,

    // Methods
    fetchPlans,
    fetchCurrentSubscription,
    fetchUsageStats,
    subscribe,
    cancelSubscription,
    reactivateSubscription,
    verifyPayment,
    syncUsage,
    clearError,

    // Convenience properties
    hasSubscription: currentSubscription?.is_active || false,
    currentPlan: currentSubscription?.plan,
  };
};