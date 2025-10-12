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

interface SwipeResponse {
  success: boolean;
  message: string;
  matched_with?: string;
  match?: boolean;
}

export const useLikedMe = () => {
  const [users, setUsers] = useState<UserWhoLikedMe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swiping, setSwiping] = useState<string | null>(null);

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

  const swipeUser = async (targetUserId: string, action: 'like' | 'pass') => {
    try {
      setSwiping(targetUserId);
      
      const response = await fetch('/api/matching/swipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          target_user_id: targetUserId,
          action: action
        })
      });

      const data: SwipeResponse = await response.json();

      if (data.success) {
        // Remove the user from the list after swiping
        setUsers(prev => prev.filter(user => user.id !== targetUserId));
        
        return {
          success: true,
          match: data.match,
          matched_with: data.matched_with,
          message: data.message
        };
      } else {
        throw new Error(data.message || 'Failed to process swipe');
      }
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to process swipe'
      };
    } finally {
      setSwiping(null);
    }
  };

  const likeBack = async (targetUserId: string) => {
    return await swipeUser(targetUserId, 'like');
  };

  const passUser = async (targetUserId: string) => {
    return await swipeUser(targetUserId, 'pass');
  };

  useEffect(() => {
    fetchUsersWhoLikedMe();
  }, []);

  return {
    users,
    loading,
    error,
    swiping,
    fetchUsersWhoLikedMe,
    likeBack,
    passUser
  };
};