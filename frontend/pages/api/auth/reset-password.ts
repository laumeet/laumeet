/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/api/reset-password.ts
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
    console.log(`🔧 Forwarding reset password request to: ${BACKEND_URL}/reset-password`);
    
    const backendRes = await fetch(`${BACKEND_URL}/reset-password`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(req.body),
    });

    const data = await backendRes.json();
    return res.status(backendRes.status).json(data);
    
  } catch (err: any) {
    console.error("❌ Reset password proxy error:", err);
    
    let errorMessage = "Unable to reset password. Please try again later.";
    
    if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed")) {
      errorMessage = "Cannot connect to authentication service. Please check if the backend server is running.";
    }
    
    return res.status(500).json({ 
      success: false,
      message: errorMessage
    });
  }
}