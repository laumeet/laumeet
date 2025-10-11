
// hooks/useUsageStats.ts
import { useState, useEffect } from 'react';
import api from '@/lib/axio';
import { UsageStats } from './useSubscription';

export const useUsageStats = () => {
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscription/usage');
      if (response.data.success) {
        setUsage(response.data.usage);
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
    loading,
    error,
    fetchUsageStats
  };
};