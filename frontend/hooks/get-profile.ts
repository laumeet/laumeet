/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/axio';
import { useState, useEffect } from 'react';

interface UserProfile {
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
}

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/page/profile');
      if (response.data.success) {
        setProfile(response.data.user);
      } else {
        setError(response.data.message);
      }
    } catch (err: any) {
      // ✅ Handle unauthenticated access gracefully
      if (err.response?.status === 401) {
        console.warn('⚠️ Not authenticated — skipping profile fetch.');
        setProfile(null);
        setError(null);
      } else {
        setError(err.response?.data?.message || 'Failed to fetch profile');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // ✅ Skip fetching profile on auth pages
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const isAuthPage = ['/login', '/signup', '/'].includes(path);
      if (isAuthPage) {
        setLoading(false);
        return;
      }
    }

    fetchProfile();
  }, []);

  return { profile, loading, error, refetch: fetchProfile };
};
