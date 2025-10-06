/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useSocket.ts - Fixed and Improved version
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
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const getBackendUrl = useCallback(() => {
    // ✅ Use environment variable if available, otherwise fallback
    if (typeof window !== 'undefined') {
      // Client-side: Use environment variable or fallback
      const socketUrl = process.env.BACKEND_URL;
      if (socketUrl) return socketUrl;
      
      // Fallback URLs based on environment
      if (process.env.NODE_ENV === "production") {
        return "https://laumeet.onrender.com";
      }
    }
    
    // Default development URL
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
      }
    }

    // ✅ Improved Socket Options
    const socketOptions: any = {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: false, // We'll handle reconnection manually
      autoConnect: true,
      forceNew: true,
      upgrade: true,
      // Add ping/pong timeouts
      pingTimeout: 10000,
      pingInterval: 25000
    };

    console.log('🔌 Socket.IO connection details:', {
      url: backendUrl,
      withCredentials: socketOptions.withCredentials,
      transports: socketOptions.transports
    });

    try {
      const socket = io(backendUrl, socketOptions);
      socketRef.current = socket;

      // ✅ Connection Events
      socket.on('connect', () => {
        console.log('✅ ✅ ✅ SOCKET.IO CONNECTED SUCCESSFULLY!');
        console.log('📡 Socket ID:', socket.id);
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on successful connection
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket.IO Disconnected. Reason:', reason);
        setIsConnected(false);

        // Don't auto-reconnect for these reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          console.log('🔄 Server disconnected, will attempt reconnect...');
          // Wait a bit before attempting reconnect
          setTimeout(() => {
            if (socketRef.current && !socketRef.current.connected) {
              socketRef.current.connect();
            }
          }, 2000);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('💥 Socket.IO Connection Error:');
        console.error('   Error:', error.name, error.message);
        
        setIsConnected(false);
        
        // Provide user-friendly error messages
        let errorMessage = 'Connection failed';
        if (error.message.includes('cross')) {
          errorMessage = 'CORS issue - check server configuration';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Connection timeout - server might be down';
        } else if (error.message.includes('cookie')) {
          errorMessage = 'Authentication issue - please refresh the page';
        } else {
          errorMessage = `Connection error: ${error.message}`;
        }
        
        setConnectionError(errorMessage);

        // Auto-reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          
          console.log(`🔄 Auto-reconnect attempt ${reconnectAttemptsRef.current} in ${delay}ms`);
          
          setTimeout(() => {
            if (socketRef.current && !socketRef.current.connected) {
              socketRef.current.connect();
            }
          }, delay);
        } else {
          console.error('💥 Max reconnection attempts reached');
          setConnectionError('Unable to connect after multiple attempts. Please refresh the page.');
        }
      });

      // ✅ Additional event listeners for debugging
      socket.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Reconnection attempt ${attempt}`);
      });

      socket.on('reconnect_failed', () => {
        console.error('💥 All reconnection attempts failed');
        setConnectionError('Failed to establish connection with the server.');
      });

      socket.on('error', (error) => {
        console.error('🚨 Socket.IO Error event:', error);
        setConnectionError(`Socket error: ${error.message}`);
      });

      // ✅ Authentication events
      socket.on('connection_success', (data) => {
        console.log('🎉 Socket authenticated successfully:', data);
      });

      socket.on('auth_error', (data) => {
        console.error('🔐 Socket authentication failed:', data);
        setConnectionError('Authentication failed. Please log in again.');
        // Optionally redirect to login page
        if (typeof window !== 'undefined') {
          // router.push('/login');
        }
      });

      return socket;
    } catch (error) {
      console.error('💥 Failed to initialize socket:', error);
      setConnectionError('Failed to initialize connection');
      return null;
    }
  }, [getBackendUrl]);

  // ✅ Manual reconnect function
  const reconnect = useCallback(() => {
    console.log('🔄 Manual reconnect triggered');
    setConnectionError(null);
    reconnectAttemptsRef.current = 0;
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Small delay before reinitializing
    setTimeout(() => {
      initializeSocket();
    }, 500);
  }, [initializeSocket]);

  // ✅ Manual disconnect function
  const disconnect = useCallback(() => {
    console.log('🔌 Manual disconnect triggered');
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setConnectionError(null);
  }, []);

  // ✅ Initialize socket on mount
  useEffect(() => {
    const socket = initializeSocket();

    // ✅ Connection health check
    const healthCheckInterval = setInterval(() => {
      if (socket && socket.connected) {
        // Socket is healthy, no action needed
        return;
      }
      
      // If socket exists but not connected, try to reconnect
      if (socket && !socket.connected && reconnectAttemptsRef.current < maxReconnectAttempts) {
        console.log('🏥 Socket health check: not connected, attempting reconnect...');
        socket.connect();
      }
    }, 30000); // Check every 30 seconds

    // ✅ Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      clearInterval(healthCheckInterval);
      
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      
      setIsConnected(false);
      setConnectionError(null);
    };
  }, [initializeSocket]);

  // ✅ Auto-reconnect when window gains focus (user comes back to tab)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleFocus = () => {
      if (!isConnected && socketRef.current && !socketRef.current.connected) {
        console.log('👀 Window focused, attempting reconnect...');
        reconnect();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isConnected, reconnect]);

  return { 
    socket: socketRef.current,
    isConnected, 
    connectionError,
    reconnect,
    disconnect
  };
};