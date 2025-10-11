/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import api from '@/lib/axio';

export interface UserSubscription {
  user_id: string;
  username: string;
  name: string;
  has_subscription: boolean;
  current_plan?: {
    id: string;
    name: string;
    tier: string;
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
    created_at: string;
  };
  subscription?: {
    id: string;
    user_id: string;
    plan: any;
    status: string;
    billing_cycle: string;
    dates: {
      start_date: string;
      end_date: string;
      canceled_at: string | null;
      trial_ends_at: string | null;
    };
    auto_renew: boolean;
    usage: {
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
    };
    is_active: boolean;
    days_remaining: number;
    created_at: string;
  };
  message?: string;
}

export interface UserSubscriptionResponse {
  success: boolean;
  user_id: string;
  username: string;
  name: string;
  has_subscription: boolean;
  current_plan?: any;
  subscription?: any;
  message?: string;
}

export const useUserSubscription = (userId?: string) => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserSubscription = async (targetUserId?: string) => {
    const id = targetUserId || userId;
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await api.get<UserSubscriptionResponse>(`/subscription/user/${id}`);
      if (response.data.success) {
        setSubscription(response.data);
      } else {
        setError(response.data.message || 'Failed to fetch user subscription');
      }
    } catch (err) {
      setError('Failed to fetch user subscription');
      console.error('Error fetching user subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserSubscription();
    }
  }, [userId]);

  return {
    subscription,
    loading,
    error,
    fetchUserSubscription
  };
};