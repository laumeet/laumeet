/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/axio';

interface ExploreProfile {
  id: string;
  username: string;
  name: string;
  age: number;
  bio: string;
  pictures: string[];
  category: string;
  isAnonymous: boolean;
  department: string;
  interests: string[];
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

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<ExploreResponse>('/explore/profiles');
      console.log('Explore API Response:', response.data);

      if (response.data.success) {
        const profilesData = response.data.profiles || [];
        // Optionally sanitize / normalize
        const processed = profilesData.map(p => ({
          id: p.id || '',
          username: p.username || '',
          name: p.name || p.username || 'Unknown',
          age: p.age,
          bio: p.bio || '',
          pictures: Array.isArray(p.pictures) ? p.pictures : [],
          category: p.category || '',
          isAnonymous: Boolean(p.isAnonymous),
          department: p.department || '',
          interests: Array.isArray(p.interests) ? p.interests : [],
          level: p.level || '',
          gender: p.gender || '',
          interestedIn: p.interestedIn || '',
          religious: p.religious || '',
          genotype: p.genotype || '',
          timestamp: p.timestamp || new Date().toISOString(),
        }));
        setProfiles(processed);
        setTotalProfiles(response.data.total_profiles ?? processed.length);
      } else {
        const msg = response.data.message || 'Failed to load profiles';
        setError(msg);
        setProfiles([]);
        setTotalProfiles(0);
      }
    } catch (err: any) {
      console.error('Error fetching profiles:', err);
      const msg = err.response?.data?.message || err.message || 'Error fetching profiles';
      setError(msg);
      setProfiles([]);
      setTotalProfiles(0);
    } finally {
      setLoading(false);
    }
  }, []);
  
const swipeProfile = useCallback(async (
  profileId: string,
  action: 'like' | 'pass'
): Promise<{ success: boolean; message: string; match?: boolean; matched_with?: string | null }> => {
  try {
    const resp = await api.post('/explore/swipes', {
      target_user_id: profileId,
      action
    });

    console.log('Swipe API Response:', resp.data);

    const data = resp.data;

    return {
      success: true,
      message: data.message || `Swiped ${action}`,
      match: !!data.matched_with,
      matched_with: data.matched_with ?? null
    };
  } catch (err: any) {
    console.error('Swipe error:', err);
    return {
      success: false,
      message: err.message || 'Swipe failed'
    };
  }
}, []);


  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  return {
    profiles,
    loading,
    error,
    totalProfiles,
    refetch: fetchProfiles,
    swipeProfile
  };
};

export default useExploreProfiles;
