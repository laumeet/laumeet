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
    const user_id = JSON.stringify(id)
    try {
      setLoading(true);
      setError(null);
      const { data } = await api.get<UserSubscriptionResponse>(`/subscription/user/id?user_id=${user_id}`);
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
  };
};