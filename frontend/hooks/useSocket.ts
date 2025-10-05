// hooks/useSocket.ts
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
    console.log(`🔌 Connecting to Socket.IO at: ${backendUrl}`);

    // Connect to Socket.IO - cookies are sent automatically by browser
    const socket = io(backendUrl, {
      withCredentials: true, // This ensures cookies are sent
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection established
    socket.on('connect', () => {
      console.log('✅ Connected to Socket.IO');
      setIsConnected(true);
      setConnectionError(null);
    });

    // Connection lost
    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Socket.IO:', reason);
      setIsConnected(false);
    });

    // Connection error
    socket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setIsConnected(false);
      setConnectionError(`Connection failed: ${error.message}`);
    });

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      
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