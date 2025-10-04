// pages/api/chat/conversations/create.ts
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

  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const BACKEND_URL = getBackendUrl();
    console.log(`🔧 Forwarding create conversation request to: ${BACKEND_URL}/conversations`);
   const token = getCookieValue(req.headers.cookie, 'access_token_cookie');
    
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: "Authentication token required" 
      });
    }

    const backendRes = await fetch(`${BACKEND_URL}/conversations`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(req.body),
    });

    const data = await backendRes.json();
    return res.status(backendRes.status).json(data);
    
  } catch (err: any) {
    console.error("❌ Create conversation proxy error:", err);
    
    let errorMessage = "Unable to create conversation. Please try again later.";
    
    if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed")) {
      errorMessage = "Cannot connect to chat service. Please check if the backend server is running.";
    }
    
    return res.status(500).json({ 
      success: false,
      message: errorMessage
    });
  }
}