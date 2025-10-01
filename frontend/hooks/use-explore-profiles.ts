/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/use-explore-profiles.ts
import { useState, useEffect } from 'react';
import api from '@/lib/axio';

interface ExploreProfile {
  id: string;
  username: string;
  name: string;
  age: number;
  bio: string;
  images: string[];
  category: string;
  isAnonymous: boolean;
  department: string;
  interests: string[];
  distance: number;
  compatibility: number;
  level: string;
  gender: string;
  interestedIn: string;
  religious: string;
  genotype: string;
  timestamp: string;
}

interface ExploreResponse {
  success: boolean;
  profiles?: ExploreProfile[];
  total_profiles?: number;
  message?: string;
}

interface SwipeHistory {
  profileId: string;
  action: 'like' | 'pass';
  timestamp: number;
}

const SWIPE_HISTORY_KEY = 'campus-vibes-swipe-history';
const SWIPE_COOLDOWN = 30 * 60 * 1000; // 30 minutes in milliseconds

export const useExploreProfiles = () => {
  const [profiles, setProfiles] = useState<ExploreProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProfiles, setTotalProfiles] = useState(0);

  // Get swipe history from localStorage
  const getSwipeHistory = (): SwipeHistory[] => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(SWIPE_HISTORY_KEY) || '[]');
    } catch {
      return [];
    }
  };

  // Save swipe to history
  const saveSwipeToHistory = (profileId: string, action: 'like' | 'pass') => {
    if (typeof window === 'undefined') return;
    
    const history = getSwipeHistory();
    const newHistory = history.filter(swipe => 
      swipe.profileId !== profileId // Remove existing entry for this profile
    );
    
    newHistory.push({
      profileId,
      action,
      timestamp: Date.now()
    });
    
    localStorage.setItem(SWIPE_HISTORY_KEY, JSON.stringify(newHistory));
  };

  // Filter out recently swiped profiles
  const filterSwipedProfiles = (profilesData: ExploreProfile[]): ExploreProfile[] => {
    const history = getSwipeHistory();
    const now = Date.now();
    
    return profilesData.filter(profile => {
      const swipe = history.find(s => s.profileId === profile.id);
      if (!swipe) return true; // Never swiped, show profile
      
      // If liked, never show again
      if (swipe.action === 'like') return false;
      
      // If passed, only show after cooldown period
      if (swipe.action === 'pass') {
        return (now - swipe.timestamp) > SWIPE_COOLDOWN;
      }
      
      return true;
    });
  };

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<ExploreResponse>('/explore/profiles');
      
      console.log('Explore API Response:', response.data);
      
      if (response.data.success) {
        const profilesData = response.data.profiles || [];
        
        const processedProfiles = profilesData.map(profile => ({
          id: profile.id || '',
          username: profile.username || '',
          name: profile.name || profile.username || 'Unknown User',
          age: typeof profile.age === 'number' ? profile.age : 0,
          bio: profile.bio || "No bio available",
          images: Array.isArray(profile.images) ? profile.images : [],
          category: profile.category || 'Not specified',
          isAnonymous: Boolean(profile.isAnonymous),
          department: profile.department || 'Not specified',
          interests: Array.isArray(profile.interests) ? profile.interests : [],
          distance: typeof profile.distance === 'number' ? profile.distance : 1.0,
          compatibility: typeof profile.compatibility === 'number' ? profile.compatibility : 50,
          level: profile.level || 'Not specified',
          gender: profile.gender || 'Not specified',
          interestedIn: profile.interestedIn || 'Not specified',
          religious: profile.religious || 'Not specified',
          genotype: profile.genotype || 'Not specified',
          timestamp: profile.timestamp || new Date().toISOString()
        }));
        
        // Filter out recently swiped profiles
        const filteredProfiles = filterSwipedProfiles(processedProfiles);
        
        setProfiles(filteredProfiles);
        setTotalProfiles(response.data.total_profiles || filteredProfiles.length);
        
        console.log('Filtered profiles:', filteredProfiles);
      } else {
        const errorMessage = response.data.message || 'Failed to fetch profiles';
        setError(errorMessage);
        setProfiles([]);
        setTotalProfiles(0);
        console.error('Explore API error:', errorMessage);
      }
    } catch (err: any) {
      console.error('Explore profiles fetch error:', err);
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Failed to fetch explore profiles';
      setError(errorMessage);
      setProfiles([]);
      setTotalProfiles(0);
    } finally {
      setLoading(false);
    }
  };

  const swipeProfile = async (profileId: string, action: 'like' | 'pass') => {
    try {
      console.log(`${action} profile:`, profileId);
      
      // Save to swipe history immediately
      saveSwipeToHistory(profileId, action);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Remove the swiped profile from local state for smooth UX
      setProfiles(prev => prev.filter(profile => profile.id !== profileId));
      setTotalProfiles(prev => prev - 1);
      
      return { 
        success: true, 
        message: `${action === 'like' ? 'Liked' : 'Passed on'} profile`,
        match: action === 'like' && Math.random() > 0.7 // 30% chance of match for demo
      };
      
    } catch (err: any) {
      console.error('Swipe error:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to process swipe' 
      };
    }
  };

  const likeProfile = async (profileId: string) => {
    return swipeProfile(profileId, 'like');
  };

  const passProfile = async (profileId: string) => {
    return swipeProfile(profileId, 'pass');
  };

  const resetProfiles = () => {
    setProfiles([]);
    setTotalProfiles(0);
    setError(null);
    setLoading(true);
    fetchProfiles();
  };

  // Clear old swipe history (older than 24 hours)
  const clearOldSwipeHistory = () => {
    if (typeof window === 'undefined') return;
    
    const history = getSwipeHistory();
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    
    const filteredHistory = history.filter(swipe => 
      (now - swipe.timestamp) < oneDay
    );
    
    localStorage.setItem(SWIPE_HISTORY_KEY, JSON.stringify(filteredHistory));
  };

  useEffect(() => {
    clearOldSwipeHistory();
    fetchProfiles();
  }, []);

  return { 
    profiles, 
    loading, 
    error, 
    totalProfiles,
    refetch: fetchProfiles,
    swipeProfile,
    likeProfile,
    passProfile,
    resetProfiles
  };
};

export default useExploreProfiles;