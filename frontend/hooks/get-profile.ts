/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/axio';
import { useState, useEffect } from 'react';

interface Subscription {
  id: string;
  tier: string;
  status: string;
  billing_cycle: string;
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  plan?: {
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
  };
}

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
  subscription?: Subscription | null;
  current_subscription?: Subscription | null;
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

  const fetchCurrentSubscription = async () => {
    try {
      setLoading(true);
      const response = await api.get('/subscription/current');
      if (response.data.success) {
        const subscriptionData = response.data.subscription || response.data.current_subscription;
        
        // Update profile with subscription data
        setProfile(prev => prev ? {
          ...prev,
          subscription: subscriptionData,
          current_subscription: subscriptionData
        } : null);
        
        return subscriptionData;
      }
    } catch (err) {
      console.error('Error fetching subscription:', err);
      // Don't set error for subscription fetch to avoid breaking the profile
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileAndSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch profile first
      const profileResponse = await api.get('/page/profile');
      if (profileResponse.data.success) {
        const userProfile = profileResponse.data.user;
        
        // Then fetch subscription
        try {
          const subscriptionResponse = await api.get('/subscription/current');
          if (subscriptionResponse.data.success) {
            const subscriptionData = subscriptionResponse.data.subscription || subscriptionResponse.data.current_subscription;
            
            // Merge profile with subscription data
            setProfile({
              ...userProfile,
              subscription: subscriptionData,
              current_subscription: subscriptionData
            });
          } else {
            // If subscription fails, just set profile without subscription
            setProfile(userProfile);
          }
        } catch (subscriptionErr) {
          // If subscription fails, just set profile without subscription
          console.warn('⚠️ Could not fetch subscription:', subscriptionErr);
          setProfile(userProfile);
        }
      } else {
        setError(profileResponse.data.message);
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

  // Helper function to check subscription features
  const canSendRestrictedContent = () => {
    return profile?.subscription?.tier !== 'free';
  };

  const canUseAdvancedFilters = () => {
    return profile?.subscription?.plan?.features?.has_advanced_filters || false;
  };

  const canSeeWhoLikedYou = () => {
    return profile?.subscription?.plan?.features?.can_see_who_liked_you || false;
  };

  const getMessageLimit = () => {
    return profile?.subscription?.plan?.features?.max_messages || 50;
  };

  const getRemainingMessages = () => {
    const limit = getMessageLimit();
    // You might want to track actual usage in your backend
    return limit === -1 ? -1 : limit; // -1 means unlimited
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

    fetchProfileAndSubscription();
  }, []);

  return { 
    profile, 
    loading, 
    error, 
    refetch: fetchProfileAndSubscription,
    fetchSubscription: fetchCurrentSubscription,
    // Monetization helper functions
    canSendRestrictedContent,
    canUseAdvancedFilters,
    canSeeWhoLikedYou,
    getMessageLimit,
    getRemainingMessages,
    // Direct subscription access
    subscription: profile?.subscription,
    currentSubscription: profile?.current_subscription
  };
};