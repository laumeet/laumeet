// hooks/useSocket.ts - FIXED VERSION
import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const getBackendUrl = useCallback(() => {
    // ✅ FIXED: Always use production URL in production
    if (process.env.NODE_ENV === "production") {
      return "https://laumeet.onrender.com";
    }
    return "http://127.0.0.1:5000";
  }, []);

  const initializeSocket = useCallback(() => {
    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const backendUrl = getBackendUrl();

    console.log('🔧 Socket.IO Debug - Starting connection...');
    console.log('🌐 Backend URL:', backendUrl);
    console.log('🏷️ Environment:', process.env.NODE_ENV);

    // ✅ Cookie Debugging
    if (typeof window !== 'undefined') {
      console.log('🍪 All cookies:', document.cookie);

      const cookies = document.cookie.split(';');
      let hasAccessToken = false;

      cookies.forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name === 'access_token_cookie') {
          hasAccessToken = true;
          console.log('✅ Found access_token_cookie, length:', value?.length || 0);
        }
      });

      if (!hasAccessToken) {
        console.log('❌ access_token_cookie NOT found in cookies');
        console.log('💡 User might need to log in again');
      }
    }

    // ✅ Improved Socket Options
    const socketOptions: any = {
      withCredentials: true, // ✅ CRITICAL for cookies
      transports: ['websocket', 'polling'],
      timeout: 15000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      forceNew: true,
    };

    console.log('🔌 Socket.IO connection options:', socketOptions);

    try {
      const socket = io(backendUrl, socketOptions);
      socketRef.current = socket;

      // ✅ Connection Events
      socket.on('connect', () => {
        console.log('✅ ✅ ✅ SOCKET.IO CONNECTED SUCCESSFULLY!');
        console.log('📡 Socket ID:', socket.id);
        setIsConnected(true);
        setConnectionError(null);
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket.IO Disconnected. Reason:', reason);
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('💥 Socket.IO Connection Error:', error.message);
        setIsConnected(false);
        setConnectionError(`Connection failed: ${error.message}`);
      });

      // ✅ Authentication events
      socket.on('auth_error', (data) => {
        console.error('🔐 Socket authentication failed:', data);
        setConnectionError('Authentication failed. Please log in again.');
      });

      return socket;
    } catch (error) {
      console.error('💥 Failed to initialize socket:', error);
      setConnectionError('Failed to initialize connection');
      return null;
    }
  }, [getBackendUrl]);

  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect triggered');
    setConnectionError(null);
    initializeSocket();
  }, [initializeSocket]);

  const disconnect = useCallback(() => {
    console.log('🔌 Manual disconnect triggered');
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  // ✅ Initialize socket on mount
  useEffect(() => {
    initializeSocket();

    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [initializeSocket]);

  return { 
    socket: socketRef.current,
    isConnected, 
    connectionError,
    reconnect,
    disconnect
  };
};