'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
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
  const { socket, isConnected, connectionError, reconnect, disconnect, onlineUsers } = useSocket();

  // Enhanced auto-reconnect logic
  useEffect(() => {
    if (connectionError && !isConnected) {
      console.log('🔄 Connection error detected, attempting reconnect...');
      const timer = setTimeout(() => {
        reconnect();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionError, isConnected, reconnect]);

  // Monitor connection health
  useEffect(() => {
    if (!socket || isConnected) return;

    const checkConnection = () => {
      if (!isConnected && !connectionError) {
        console.log('🔄 Connection lost, attempting to reconnect...');
        reconnect();
      }
    };

    const interval = setInterval(checkConnection, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [socket, isConnected, connectionError, reconnect]);

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