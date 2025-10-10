// lib/axio.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api', // Points to Next.js API routes
  withCredentials: true, // ✅ CRITICAL: This sends cookies with requests
});

// ✅ FIXED: Add request interceptor to include auth tokens and handle API routing
api.interceptors.request.use(
  (config) => {
    // For feed-related requests, route through the feed proxy
    if (config.url?.startsWith('feed/')) {
      // The URL is already correct - no need to modify
      console.log(`🔧 Feed API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }

    // Add any auth headers if needed (for Bearer token if using both methods)
    const token = getCookie('access_token_cookie');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // For FormData requests, let the browser set the Content-Type with boundary
    if (config.data instanceof FormData) {
      // Remove the Content-Type header to let browser set it automatically
      delete config.headers['Content-Type'];
    }

    console.log(`🔧 Axio Request: ${config.method?.toUpperCase()} ${config.url}`, config.headers);
    return config;
  },
  (error) => {
    console.error('❌ Axio Request Error:', error);
    return Promise.reject(error);
  }
);

// ✅ FIXED: Add response interceptor to handle auth errors and API responses
api.interceptors.response.use(
  (response) => {
    console.log(`🔧 Axio Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('❌ Axio Response Error:', error.response?.status, error.config?.url);

    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      if (typeof window !== 'undefined') {
        console.log('🔧 Redirecting to login due to 401');
        window.location.href = '/login';
      }
    }

    // Handle network errors or backend connection issues
    if (!error.response) {
      console.error('❌ Network error - Backend might be down');
      // You could show a user-friendly message here
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

// lib/axio.ts - Fix the feedApi methods
export const feedApi = {
  // Posts - FIXED: Use GET method for fetching posts
  getPosts: (page: number = 1, per_page: number = 20) =>
    api.get(`feed/posts?page=${page}&per_page=${per_page}`),

  getPost: (postId: string) =>
    api.get(`feed/posts/${postId}`),

  createPost: (postData: { text: string; image?: string; category?: string; location?: string }) =>
    api.post('feed/posts', postData),

  deletePost: (postId: string) =>
    api.delete(`feed/posts/${postId}`),

 // Likes
  likePost: (postId: string) =>
    api.post(`feed/posts/${postId}/like`),


  // Comments - Make sure these endpoints match your backend
  getComments: (postId: string, page: number = 1, per_page: number = 50) =>
    api.get(`feed/posts/${postId}/comments?page=${page}&per_page=${per_page}`),

  createComment: (postId: string, text: string) =>
    api.post(`feed/posts/${postId}/comments`, { text }),

  // Upload
  uploadImage: (formData: FormData) =>
    api.post('upload', formData),
  getComments: (postId: string, page: number = 1, per_page: number = 50) =>
    api.get(`feed/posts/${postId}/comments?page=${page}&per_page=${per_page}`),

  createComment: (postId: string, text: string) =>
    api.post(`feed/posts/${postId}/comments`, { text }),
};

export default api;