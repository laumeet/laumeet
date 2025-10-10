// hooks/useSubscription.ts
import { useState, useEffect } from 'react';
import api from '@/lib/axio';

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

export const useSubscription = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscription');
      if (response.data.success) {
        setPlans(response.data.plans || []);
      }
    } catch (err) {
      setError('Failed to fetch subscription plans');
      console.error('Error fetching plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscription/current');
      if (response.data.success) {
        setCurrentSubscription(response.data.subscription || response.data.current_subscription);
      }
    } catch (err) {
      setError('Failed to fetch current subscription');
      console.error('Error fetching subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async (planId: string, billingCycle: 'monthly' | 'yearly') => {
    try {
      setLoading(true);
      const response = await api.post('/subscription/subscribe', {
        plan_id: planId,
        billing_cycle: billingCycle,
        payment_provider: 'flutterwave'
      });
      return response.data;
    } catch (err) {
      setError('Failed to subscribe');
      console.error('Error subscribing:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.post('/subscription/cancel');
      if (response.data.success) {
        await fetchCurrentSubscription();
      }
      return response.data;
    } catch (err) {
      setError('Failed to cancel subscription');
      console.error('Error canceling subscription:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const reactivateSubscription = async (billingCycle: 'monthly' | 'yearly') => {
    try {
      setLoading(true);
      const response = await api.post('/subscription/reactivate', {
        billing_cycle: billingCycle
      });
      if (response.data.success) {
        await fetchCurrentSubscription();
      }
      return response.data;
    } catch (err) {
      setError('Failed to reactivate subscription');
      console.error('Error reactivating subscription:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    fetchCurrentSubscription();
  }, []);

  return {
    plans,
    currentSubscription,
    loading,
    error,
    fetchPlans,
    fetchCurrentSubscription,
    subscribe,
    cancelSubscription,
    reactivateSubscription
  };
};
