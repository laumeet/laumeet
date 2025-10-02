/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import api from '@/lib/axio';

interface AdminUser {
  id: string;
  public_id: string;
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

interface AdminUsersResponse {
  success: boolean;
  total_users: number;
  users: AdminUser[];
  message?: string;
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<AdminUsersResponse>('/admin/users');
      
      if (response.data.success) {
        setUsers(response.data.users);
        setTotalUsers(response.data.total_users);
      } else {
        setError(response.data.message || 'Failed to fetch users');
      }
    } catch (err: any) {
      console.error('Admin users fetch error:', err);
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      // Note: You'll need to implement a DELETE endpoint in your Flask backend
      const response = await api.delete(`/admin/users/${userId}`);
      if (response.data.success) {
        // Remove user from local state
        setUsers(prev => prev.filter(user => user.public_id !== userId));
        setTotalUsers(prev => prev - 1);
        return { success: true, message: 'User deleted successfully' };
      } else {
        return { success: false, message: response.data.message };
      }
    } catch (err: any) {
      console.error('Delete user error:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Failed to delete user' 
      };
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return { 
    users, 
    loading, 
    error, 
    totalUsers,
    refetch: fetchUsers,
    deleteUser 
  };
};