/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { createContext, useContext, useEffect, ReactNode, useCallback, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useSocket } from '@/hooks/useSocket';
import { useProfile } from '@/hooks/get-profile';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  onlineUsers: Set<string>;
  reconnect: () => void;
  disconnect: () => void;
  setOnlineStatusManually?: (userId: string, isOnline: boolean) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { socket, isConnected, connectionError, reconnect, disconnect, onlineUsers: initialOnlineUsers } = useSocket();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(initialOnlineUsers);
  const {profile} = useProfile(); // useProfile is a hook that fetches the current user's profile
  const userId = profile?.id
  // 🔹 Handle user_online_status updates from server
  const handleOnlineStatus = useCallback((data: any) => {
    console.log('👤 Global online status update:', data);
    setOnlineUsers(prev => {
      const updated = new Set(prev);
      if (data.is_online) {
        updated.add(data.user_id);
      } else {
        updated.delete(data.user_id);
      }
      return updated;
    });
  }, []);

  // 🔹 Emit user online when socket connects
  useEffect(() => {
    if (socket && isConnected && userId) {
      console.log('✅ Socket connected — marking user online:', userId);
      socket.emit('set_online', { user_id: userId, is_online: true });
    }
  }, [socket, isConnected, userId]);

  // 🔹 Emit offline before disconnect/unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (socket && userId) {
        socket.emit('set_online', { user_id: userId, is_online: false });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [socket, userId]);

  // 🔹 Listen to server broadcasts
  useEffect(() => {
    if (!socket) return;
    socket.on('user_online_status', handleOnlineStatus);

    return () => {
      socket.off('user_online_status', handleOnlineStatus);
    };
  }, [socket, handleOnlineStatus]);

  // 🔹 Auto-reconnect if connection error
  useEffect(() => {
    if (connectionError && !isConnected) {
      console.log('🔄 Connection error detected, attempting reconnect...');
      const timer = setTimeout(() => reconnect(), 3000);
      return () => clearTimeout(timer);
    }
  }, [connectionError, isConnected, reconnect]);

  // 🔹 Health check interval
  useEffect(() => {
    if (!socket || isConnected) return;

    const checkConnection = () => {
      if (!isConnected && !connectionError) {
        console.log('🔄 Connection lost, attempting to reconnect...');
        reconnect();
      }
    };
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, [socket, isConnected, connectionError, reconnect]);

  // 🔹 Manual setter (optional)
  const setOnlineStatusManually = useCallback((userId: string, isOnline: boolean) => {
    setOnlineUsers(prev => {
      const updated = new Set(prev);
      if (isOnline) updated.add(userId);
      else updated.delete(userId);
      return updated;
    });
  }, []);

  const value: SocketContextType = {
    socket,
    isConnected,
    connectionError,
    onlineUsers,
    reconnect,
    disconnect,
    setOnlineStatusManually,
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
