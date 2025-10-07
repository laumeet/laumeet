/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/api/socket/conversations.ts
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.NODE_ENV === "development" 
  ? "http://127.0.0.1:5000" 
  : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("🔧 Fetching conversations via API proxy");
    
    const backendRes = await fetch(`${BACKEND_URL}/chat/conversations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cookie": req.headers.cookie || "",
      },
      credentials: "include",
    });

    console.log("🔧 Backend conversations response status:", backendRes.status);

    if (!backendRes.ok) {
      if (backendRes.status === 401) {
        return res.status(401).json({ 
          success: false, 
          message: "Authentication failed",
          conversations: []
        });
      }
      throw new Error(`Backend returned ${backendRes.status}: ${backendRes.statusText}`);
    }

    const data = await backendRes.json();
    
    return res.status(200).json({
      success: true,
      conversations: data.conversations || [],
      total: data.total || 0,
      message: data.message
    });
    
  } catch (err: any) {
    console.error("❌ Conversations proxy error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Cannot fetch conversations",
      conversations: [],
      total: 0
    });
  }
}