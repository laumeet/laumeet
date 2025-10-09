// hooks/useSocket.ts

import api from "@/lib/axio";
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  onlineUsers: Set<string>;
  reconnect: () => void;
  disconnect: () => void;
}

export const useSocket = (): UseSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const backendUrl =
    process.env.NODE_ENV === "production"
      ? "https://laumeet.onrender.com"
      : "http://127.0.0.1:5000";

  // 🔐 Authenticate user through Next.js API route
  const authenticate = useCallback(async (): Promise<string | null> => {
    try {
      console.log("🔐 Authenticating socket via /api/socket/auth...");
      const res = await api.get("/socket/auth", {
        withCredentials: true,
      });
      const data = res.data;
      
      if (data.success && data.token) {
        console.log("✅ Socket authentication success!");
        tokenRef.current = data.token;
        return data.token;
      } else {
        setConnectionError(data.message || "Authentication failed");
        return null;
      }
    } catch (err) {
      console.error("💥 Socket auth failed:", err);
      setConnectionError("Authentication service unavailable");
      return null;
    }
  }, []);

  const initializeSocket = useCallback(async () => {
    // Prevent multiple initializations
    if (initializedRef.current && socketRef.current?.connected) {
      console.log("🚫 Socket already initialized and connected");
      return socketRef.current;
    }

    // 🧹 Clean up old connection first
    if (socketRef.current) {
      console.log("🧹 Cleaning up previous socket connection");
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    // Skip socket connection on auth pages

  
    if (pathname && pathname === '/login' || pathname ==='/signup' || pathname === '/') return
    const token = await authenticate();
    if (!token) {
      console.log("❌ Auth failed. Socket not connecting.");
      return null;
    }

    console.log("🔌 Creating new socket connection with token...");
    
    const socket = io(backendUrl, {
      withCredentials: true,
      query: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 30000, // Increased timeout to 30 seconds
      forceNew: true,
      autoConnect: true
    });

    socketRef.current = socket;
    initializedRef.current = true;
    reconnectAttemptsRef.current = 0;

    // Connection Events
    socket.on("connect", () => {
      console.log("✅ Connected to Socket.IO server:", socket.id);
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0;
    });

    socket.on("disconnect", (reason) => {
      console.warn("❌ Socket disconnected:", reason);
      setIsConnected(false);
      
      // Auto-reconnect on unexpected disconnects
      if (reason !== "io client disconnect" && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        console.log(`🔄 Auto-reconnecting... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        setTimeout(() => {
          if (!socketRef.current?.connected) {
            initializeSocket();
          }
        }, 3000);
      }
    });

    socket.on("connect_error", (err) => {
      console.error("💥 Socket connect error:", err.message);
      setIsConnected(false);
      setConnectionError(err.message);
      
      // Auto-retry on connection errors
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        console.log(`🔄 Connection error - retrying... Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        setTimeout(() => {
          if (!socketRef.current?.connected) {
            initializeSocket();
          }
        }, 5000);
      }
    });

    socket.on("auth_error", (data) => {
      console.error("🔐 Socket authentication failed:", data);
      setConnectionError("Authentication failed. Please log in again.");
    });

    socket.on("connection_success", (data) => {
      console.log("🎉 Socket connection authenticated:", data);
    });

    // Online users tracking
    socket.on("online_users", (users: string[]) => {
      console.log("👥 Online users received:", users);
      setOnlineUsers(new Set(users));
    });

    socket.on("user_online_status", (data: { user_id: string; is_online: boolean }) => {
      console.log("👤 User online status update:", data);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.is_online) {
          newSet.add(data.user_id);
        } else {
          newSet.delete(data.user_id);
        }
        console.log("👥 Online users updated:", Array.from(newSet));
        return newSet;
      });
    });
    // Connect the socket
    socket.connect();
    return socket;
  }, [authenticate, backendUrl, pathname]);

  const reconnect = useCallback(async () => {
    console.log("🔄 Manual reconnect requested");
    initializedRef.current = false;
    reconnectAttemptsRef.current = 0;
    await initializeSocket();
  }, [initializeSocket]);

  const disconnect = useCallback(() => {
    console.log("🔌 Disconnecting socket...");
    initializedRef.current = false;
    reconnectAttemptsRef.current = 0;
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
    setOnlineUsers(new Set());
  }, []);

  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (mounted && !initializedRef.current) {
        await initializeSocket();
      }
    };
    
    init();

    return () => {
      mounted = false;
      console.log("🧹 Component unmounted, keeping socket connection alive");
    };
  }, [initializeSocket]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    reconnect,
    disconnect,
    onlineUsers,
  };
};