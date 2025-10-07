'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket } from '@/hooks/useSocket';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  onlineUsers: Set<string>;
  reconnect: () => void;
  disconnect: () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { socket, isConnected, connectionError, reconnect, disconnect } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  // Handle online status updates
  useEffect(() => {
    if (!socket || !isConnected) return;
    console.log('Hello world')

    const handleUserOnlineStatus = (data: { user_id: string; is_online: boolean }) => {
      console.log('dataaa',data)
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.is_online) {
          newSet.add(data.user_id);
        } else {
          newSet.delete(data.user_id);
        }
        console.log(`👥 Online users updated: ${newSet.size} users`);
        return newSet;
      });
    };

    socket.on('user_online_status', handleUserOnlineStatus);

    return () => {
      socket.off('user_online_status', handleUserOnlineStatus);
    };
  }, [socket, isConnected]);

  // Reset online users when disconnected
  useEffect(() => {
    if (!isConnected) {
      setOnlineUsers(new Set());
    }
  }, [isConnected]);

  // Auto-reconnect on authentication errors
  useEffect(() => {
    if (connectionError?.includes('Authentication') && !isConnected) {
      console.log('🔄 Authentication error detected, attempting reconnect in 2s...');
      const timer = setTimeout(() => {
        reconnect();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [connectionError, isConnected, reconnect]);

  const value: SocketContextType = {
    socket,
    isConnected,
    connectionError,
    onlineUsers,
    reconnect,
    disconnect
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocketContext = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};