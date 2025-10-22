/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axio';

export interface UserSubscriptionResponse {
  success: boolean;
  message?: string;
  user_id?: string;
  username?: string;
  name?: string;
  has_subscription: boolean;
  current_plan?: any;
  subscription?: any;
}

export interface CurrentUserSubscriptionResponse {
  success: boolean;
  message?: string;
  has_subscription: boolean;
  current_plan?: any;
  subscription?: any;
}

export const useUserSubscription = (userId?: string) => {
  const [subscription, setSubscription] = useState<UserSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserSubscription = useCallback(async (targetUserId?: string) => {
    const id = targetUserId || userId;
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<UserSubscriptionResponse>(`/subscription/user?user_id=${id}`);
      console.log('use hook sub', data);
      
      if (data.success) {
        setSubscription(data);
      } else {
        setError(data.message || 'Failed to fetch user subscription');
      }
    } catch (err) {
      console.error('Error fetching user subscription:', err);
      setError('Failed to fetch user subscription');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchCurrentUserSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<CurrentUserSubscriptionResponse>('/subscription/current');
      console.log('use hook current sub', data);
      
      if (data.success) {
        // Convert current user response to match UserSubscriptionResponse format
        setSubscription({
          success: true,
          has_subscription: data.has_subscription,
          current_plan: data.current_plan,
          subscription: data.subscription,
          message: data.message
        });
      } else {
        setError(data.message || 'Failed to fetch current subscription');
      }
    } catch (err) {
      console.error('Error fetching current subscription:', err);
      setError('Failed to fetch current subscription');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserSubscription();
    }
  }, [userId, fetchUserSubscription]);

  return { 
    subscription, 
    loading, 
    error, 
    fetchUserSubscription,
    fetchCurrentUserSubscription 
  };
};