/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  ReactNode,
  useCallback,
  useState,
  useMemo,
} from 'react';
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
  // ✅ All hooks declared unconditionally
  const { socket, isConnected, connectionError, reconnect, disconnect, onlineUsers: initialOnlineUsers } = useSocket();
  const { profile } = useProfile();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(initialOnlineUsers);
  const [isAuthPage, setIsAuthPage] = useState(false);

  const userId = profile?.id;

  // ✅ Determine if current page is unauthenticated (login/signup/root)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      setIsAuthPage(['/login', '/signup', '/'].includes(path));
    }
  }, []);

  // ✅ Do not run socket-related effects when on auth pages or without user
  const shouldUseSocket = !isAuthPage && !!userId;

  // 🔹 Handle user_online_status updates
  const handleOnlineStatus = useCallback((data: any) => {
    console.log('👤 Global online status update:', data);
    setOnlineUsers((prev) => {
      const updated = new Set(prev);
      if (data.is_online) {
        updated.add(data.user_id);
      } else {
        updated.delete(data.user_id);
      }
      return updated;
    });
  }, []);

  // 🔹 Emit online when connected
  useEffect(() => {
    if (!shouldUseSocket || !socket || !isConnected || !userId) return;
    console.log('✅ Socket connected — marking user online:', userId);
    socket.emit('set_online', { user_id: userId, is_online: true });
  }, [shouldUseSocket, socket, isConnected, userId]);

  // 🔹 Emit offline before unload
  useEffect(() => {
    if (!shouldUseSocket || !socket || !userId) return;
    const handleBeforeUnload = () => {
      socket.emit('set_online', { user_id: userId, is_online: false });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [shouldUseSocket, socket, userId]);

  // 🔹 Listen to server broadcasts
  useEffect(() => {
    if (!shouldUseSocket || !socket) return;
    socket.on('user_online_status', handleOnlineStatus);
    return () => {
      socket.off('user_online_status', handleOnlineStatus);
    };
  }, [shouldUseSocket, socket, handleOnlineStatus]);

  // 🔹 Auto-reconnect if connection error
  useEffect(() => {
    if (!shouldUseSocket) return;
    if (connectionError && !isConnected) {
      console.log('🔄 Connection error detected, attempting reconnect...');
      const timer = setTimeout(reconnect, 3000);
      return () => clearTimeout(timer);
    }
  }, [shouldUseSocket, connectionError, isConnected, reconnect]);

  // 🔹 Health check interval
  useEffect(() => {
    if (!shouldUseSocket || !socket) return;
    const interval = setInterval(() => {
      if (!isConnected && !connectionError) {
        console.log('🔄 Connection lost, attempting to reconnect...');
        reconnect();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [shouldUseSocket, socket, isConnected, connectionError, reconnect]);

  // 🔹 Manual setter
  const setOnlineStatusManually = useCallback((userId: string, isOnline: boolean) => {
    setOnlineUsers((prev) => {
      const updated = new Set(prev);
      if (isOnline) updated.add(userId);
      else updated.delete(userId);
      return updated;
    });
  }, []);

  // ✅ Memoized context value
  const value: SocketContextType = useMemo(
    () => ({
      socket,
      isConnected,
      connectionError,
      onlineUsers,
      reconnect,
      disconnect,
      setOnlineStatusManually,
    }),
    [socket, isConnected, connectionError, onlineUsers, reconnect, disconnect, setOnlineStatusManually]
  );

  // ✅ Always render children — no early return (no conditional hooks)
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

// ✅ Hook for easy context use
export const useSocketContext = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
};
