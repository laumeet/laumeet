/* eslint-disable @typescript-eslint/no-explicit-any */
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



export const useExploreProfiles = () => {
  const [profiles, setProfiles] = useState<ExploreProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalProfiles, setTotalProfiles] = useState(0);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<ExploreResponse>('/explore/profiles');
      
      console.log('Explore API Response:', response.data);
      
      if (response.data.success) {
        // Safely handle profiles data with proper defaults
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
        
        setProfiles(processedProfiles);
        setTotalProfiles(response.data.total_profiles || processedProfiles.length);
        
        console.log('Processed profiles:', processedProfiles);
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

  useEffect(() => {
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