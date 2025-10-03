/* eslint-disable @typescript-eslint/no-explicit-any */
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
    console.log(`🔧 Forwarding login request to: ${BACKEND_URL}/swipe`);
    
    const backendRes = await fetch(`${BACKEND_URL}/swipe`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(req.body),
    });

    const data = await backendRes.json();
    const setCookie = backendRes.headers.get("set-cookie");
    
    if (setCookie) {
      res.setHeader("set-cookie", setCookie);
    }

    return res.status(backendRes.status).json(data);
    
  } catch (err: any) {
    console.error("❌ Login proxy error:", err);
    
    let errorMessage = "Unable to login. Please try again later.";
    
    if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed")) {
      errorMessage = "Cannot connect to authentication service. Please check if the backend server is running.";
    }
    
    return res.status(500).json({ 
      success: false,
      message: errorMessage
    });
  }
}