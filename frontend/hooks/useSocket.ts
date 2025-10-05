// hooks/useSocket.ts - Fixed version
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const getBackendUrl = () => {
    // ✅ FIX: Use hardcoded URL for production since env vars might not be working
    if (process.env.NODE_ENV === "production") {
      return "https://laumeet.onrender.com"; // Direct URL
    }

    // Development
    return "http://127.0.0.1:5000";
  };

  useEffect(() => {
    const backendUrl = getBackendUrl();

    console.log('🔧 Socket.IO Debug - Starting connection...');
    console.log('🌐 Backend URL:', backendUrl);
    console.log('🏷️ Environment:', process.env.NODE_ENV);

    // ✅ IMPROVED Cookie Debugging
    console.log('🍪 All cookies:', document.cookie);

    const cookies = document.cookie.split(';');
    let hasAccessToken = false;
    let tokenValue = null;

    cookies.forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name === 'access_token_cookie') {
        hasAccessToken = true;
        tokenValue = value;
        console.log('✅ Found access_token_cookie, length:', value.length);
      }
    });

    if (!hasAccessToken) {
      console.log('❌ access_token_cookie NOT found in cookies');
      console.log('💡 Make sure you are logged in and cookies are enabled');
    } else {
      console.log('✅ Token is present, proceeding with connection');
    }

    // ✅ IMPROVED Socket Options
    const socketOptions: any = {
      withCredentials: true, // 👈 CRITICAL for cookies
      transports: ['websocket', 'polling'],
      timeout: 20000, // Increased timeout
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      // ✅ Add explicit authentication methods
      auth: tokenValue ? { token: tokenValue } : undefined,
      query: tokenValue ? { token: tokenValue } : {},
      // ✅ Force new connection to avoid cached connections
      forceNew: true,
      // ✅ Upgrade mechanism
      upgrade: true
    };

    console.log('🔌 Socket.IO connection details:', {
      url: backendUrl,
      withCredentials: socketOptions.withCredentials,
      hasToken: !!tokenValue,
      transports: socketOptions.transports
    });

    const socket = io(backendUrl, socketOptions);
    socketRef.current = socket;

    // ✅ ENHANCED Event Listeners with Better Debugging
    socket.on('connect', () => {
      console.log('✅ ✅ ✅ SOCKET.IO CONNECTED SUCCESSFULLY!');
      console.log('📡 Socket ID:', socket.id);
      console.log('🔗 Connected to:', backendUrl);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO Disconnected. Reason:', reason);
      setIsConnected(false);

      // Auto-reconnect on server disconnect
      if (reason === 'io server disconnect') {
        console.log('🔄 Server disconnected us, reconnecting...');
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error('💥 Socket.IO Connection Error Details:');
      console.error('   Error Name:', error.name);
      console.error('   Error Message:', error.message);
      console.error('   Error Description:', error.description);

      setIsConnected(false);
      setConnectionError(`Connection failed: ${error.message}`);

      // Additional debugging for common errors
      if (error.message.includes('cross')) {
        console.error('🚨 CORS Issue Detected - Check backend CORS configuration');
      }
      if (error.message.includes('cookie')) {
        console.error('🚨 Cookie Issue Detected - Check cookie settings');
      }
    });

    // ✅ ADDITIONAL DEBUG EVENTS
    socket.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 Reconnection attempt ${attempt}`);
    });

    socket.on('reconnect', (attempt) => {
      console.log(`✅ Reconnected after ${attempt} attempts`);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('reconnect_failed', () => {
      console.error('💥 All reconnection attempts failed');
      setConnectionError('Failed to reconnect after all attempts');
    });

    socket.on('error', (error) => {
      console.error('🚨 Socket.IO Error event:', error);
    });

    // ✅ TEST EVENTS - Remove in production
    socket.on('ping', () => {
      console.log('🏓 Received ping from server');
    });

    socket.on('pong', () => {
      console.log('🏓 Received pong from server');
    });

    // ✅ Connection timeout safety
    const connectionTimeout = setTimeout(() => {
      if (!socket.connected) {
        console.log('⏰ Connection timeout - taking too long to connect');
        socket.disconnect();
      }
    }, 25000);

    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      clearTimeout(connectionTimeout);
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  return { 
    socket: socketRef.current,
    isConnected, 
    connectionError 
  };
};