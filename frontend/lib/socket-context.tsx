'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Set<string>;
  typingUsers: Map<string, { username: string; conversationId: string }>;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  onlineUsers: new Set(),
  typingUsers: new Map(),
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [typingUsers, setTypingUsers] = useState<Map<string, { username: string; conversationId: string }>>(new Map());
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
  useEffect(() => {
    // Only connect if we're in the browser
    if (typeof window === 'undefined') return;
    
    const socketUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    
    console.log('🔌 Connecting to Socket.IO:', socketUrl);

    const socketInstance = io(socketUrl, {
      withCredentials: true, // ✅ This sends cookies for JWT authentication
      transports: ['websocket', 'polling'], // Fallback options
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    socketInstance.on('connect', () => {
      console.log('✅ Socket.IO Connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('❌ Socket.IO Disconnected:', reason);
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('💥 Socket.IO Connection Error:', error);
      setIsConnected(false);
    });

    socketInstance.on('connection_success', (data) => {
      console.log('🎉 Socket.IO Authenticated:', data);
    });

    socketInstance.on('auth_error', (data) => {
      console.error('🔐 Socket.IO Auth Error:', data);
      // Redirect to login if authentication fails
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    });

    // Online status events
    socketInstance.on('user_online_status', (data) => {
      console.log('👤 Online status update:', data);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.is_online) {
          newSet.add(data.user_id);
        } else {
          newSet.delete(data.user_id);
        }
        return newSet;
      });
    });

    // Typing events
    socketInstance.on('user_typing', (data) => {
      console.log('⌨️ Typing event:', data);
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        const userKey = `${data.user_id}-${data.conversation_id}`;
        
        if (data.is_typing) {
          newMap.set(userKey, {
            username: data.username,
            conversationId: data.conversation_id
          });
        } else {
          newMap.delete(userKey);
        }
        return newMap;
      });
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      socketInstance.disconnect();
    };
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};