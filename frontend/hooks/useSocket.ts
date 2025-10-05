// hooks/useSocket.ts - Debug version (fixed)
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const getBackendUrl = () => {
    if (process.env.NODE_ENV === "production" && process.env.BACKEND_URL) {
      return process.env.BACKEND_URL;
    }

    if (process.env.NODE_ENV === "production") {
      throw new Error("BACKEND_URL environment variable is required in production");
    }

    return "http://127.0.0.1:5000";
  };

  useEffect(() => {
    const backendUrl = getBackendUrl();

    // Debug cookie situation
    console.log('🍪 All cookies:', document.cookie);
    console.log('🔐 Has access_token_cookie:', document.cookie.includes('access_token_cookie'));
    
    const tokenCookie = document.cookie.split(';').find(c => c.trim().startsWith('access_token_cookie='));
    console.log('🔐 Token cookie value:', tokenCookie ? 'PRESENT' : 'MISSING');
    
    if (tokenCookie) {
      console.log('🔐 Token cookie length:', tokenCookie.length);
      // Don't log the actual token for security, but you can check if it's empty
      console.log('🔐 Token is empty?:', tokenCookie.split('=')[1] === '');
    }

    const socketOptions: any = {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 15000,
      reconnection: true,
      reconnectionAttempts: 3, // Reduce for quicker debugging
      reconnectionDelay: 1000,
    };

    console.log(`🔌 Attempting connection to: ${backendUrl}`);

    const socket = io(backendUrl, socketOptions);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO');
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected. Reason:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error);
      console.error('❌ Error name:', error.name);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      setIsConnected(false);
      setConnectionError(`Connection rejected: ${error.message}`);
    });

    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      if (socket.connected) {
        socket.disconnect();
      }
    };
  }, []);

  return { 
    socket: socketRef.current, 
    isConnected, 
    connectionError 
  };
};