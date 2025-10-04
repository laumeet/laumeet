// pages/api/chat/conversations/unread-count.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCookieValue } from "@/lib/utils";
import type { NextApiRequest, NextApiResponse } from "next";

const getBackendUrl = () => {
  if (process.env.NODE_ENV === "production" && process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  
  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_URL environment variable is required in production");
  }
  
  return "http://127.0.0.1:5000";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "OPTIONS") {
    return res.status(200).json({ success: true });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const BACKEND_URL = getBackendUrl();
    console.log(`🔧 Forwarding unread count request to: ${BACKEND_URL}/conversations/unread_count`);
    
    const token = getCookieValue(req.headers.cookie, 'access_token_cookie');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication token required" 
      });
    }

    const backendRes = await fetch(`${BACKEND_URL}/conversations/unread_count`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await backendRes.json();
    return res.status(backendRes.status).json(data);
    
  } catch (err: any) {
    console.error("❌ Unread count proxy error:", err);
    
    let errorMessage = "Unable to fetch unread count. Please try again later.";
    
    if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed")) {
      errorMessage = "Cannot connect to chat service. Please check if the backend server is running.";
    }
    
    return res.status(500).json({ 
      success: false,
      message: errorMessage
    });
  }
}