/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useLikedMe.ts
import { useState, useEffect } from 'react';

export interface UserWhoLikedMe {
  id: string;
  username: string;
  name: string;
  age: string;
  gender: string;
  department: string;
  bio: string;
  pictures: string[];
  liked_at?: string;
  is_mutual_match?: boolean;
}

interface UsersWhoLikedMeResponse {
  success: boolean;
  users: UserWhoLikedMe[];
  count: number;
  total_count: number;
  page: number;
  limit: number;
  has_more: boolean;
}



export const useLikedMe = () => {
  const [users, setUsers] = useState<UserWhoLikedMe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsersWhoLikedMe = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/matching/liked-me');
      const data: UsersWhoLikedMeResponse = await response.json();

      if (data.success) {
        setUsers(data.users);
      } else {
        setError('Failed to fetch users who liked you');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users who liked you');
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchUsersWhoLikedMe();
  }, []);

  return {
    users,
    loading,
    error,
    fetchUsersWhoLikedMe,
   
  };
};