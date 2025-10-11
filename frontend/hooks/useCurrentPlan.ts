/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import api from '@/lib/axio';

export interface CurrentPlan {
  id: string;
  name: string;
  tier: string;
  status: string;
  billing_cycle: string;
  is_active: boolean;
  days_remaining: number;
  dates: {
    start_date: string;
    end_date: string;
    canceled_at: string | null;
    trial_ends_at: string | null;
  };
}

export interface CurrentPlanResponse {
  success: boolean;
  has_subscription: boolean;
  current_subscription?: CurrentPlan;
  current_plan?: any;
  message?: string;
}

export const useCurrentPlan = () => {
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentPlan = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<CurrentPlanResponse>('/subscription/current');
      if (response.data.success) {
        setCurrentPlan(response.data.current_subscription || null);
        setHasSubscription(response.data.has_subscription);
      } else {
        setError(response.data.message || 'Failed to fetch current plan');
      }
    } catch (err) {
      setError('Failed to fetch current plan');
      console.error('Error fetching current plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentPlan();
  }, []);

  return {
    currentPlan,
    hasSubscription,
    loading,
    error,
    fetchCurrentPlan
  };
};