// lib/axios.ts
import axios from 'axios';


const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // ✅ CRITICAL: This sends cookies with requests


});

// ✅ FIXED: Add request interceptor to include auth tokens
api.interceptors.request.use(
  (config) => {
    // Add any auth headers if needed
    const token = getCookie('access_token_cookie');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ FIXED: Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ✅ FIXED: Helper function to get cookies
const getCookie = (name: string): string | null => {
  if (typeof window === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

export default api;