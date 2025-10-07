/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useSocket.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";

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

  const backendUrl =
    process.env.NODE_ENV === "production"
      ? "https://laumeet.onrender.com"
      : "http://127.0.0.1:5000";

  // 🔐 Authenticate user through Next.js API route
  const authenticate = useCallback(async (): Promise<boolean> => {
    try {
      console.log("🔐 Authenticating socket via /api/socket/auth...");
      const res = await fetch("/api/socket/auth", {
        method: "GET",
        credentials: "include",
      });
      const data = await res.json();

      if (data.success && data.authenticated) {
        console.log("✅ Socket authentication success!");
        return true;
      } else {
        setConnectionError(data.message || "Authentication failed");
        return false;
      }
    } catch (err) {
      console.error("💥 Socket auth failed:", err);
      setConnectionError("Authentication service unavailable");
      return false;
    }
  }, []);

  const initializeSocket = useCallback(async () => {
    // 🧹 Clean up old connection first
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const authed = await authenticate();
    if (!authed) {
      console.log("❌ Auth failed. Socket not connecting.");
      return;
    }

    const socket = io(backendUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
      forceNew: true,
    });

    socketRef.current = socket;

    // Connection Events
    socket.on("connect", () => {
      console.log("✅ Connected to Socket.IO server:", socket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on("disconnect", (reason) => {
      console.warn("❌ Socket disconnected:", reason);
      setIsConnected(false);
    });

    socket.on("connect_error", (err) => {
      console.error("💥 Socket connect error:", err.message);
      setIsConnected(false);
      setConnectionError(err.message);
    });

    socket.on("auth_error", (data) => {
      console.error("🔐 Socket authentication failed:", data);
      setConnectionError("Authentication failed. Please log in again.");
    });

    return socket;
  }, [authenticate, backendUrl]);

  const reconnect = useCallback(async () => {
    console.log("🔄 Manual reconnect requested");
    await initializeSocket();
  }, [initializeSocket]);

  const disconnect = useCallback(() => {
    console.log("🔌 Disconnecting socket...");
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (mounted) initializeSocket();
    return () => {
      mounted = false;
      console.log("🧹 Cleaning up socket connection...");
      socketRef.current?.disconnect();
    };
  }, [initializeSocket]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    reconnect,
    disconnect,
  };
};
