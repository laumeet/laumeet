import type { NextApiRequest, NextApiResponse } from "next";

// Get backend URL from environment variable with proper fallbacks
const getBackendUrl = () => {
  // Always use environment variable if set
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  
  // In production, don't fall back to localhost
  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_URL environment variable is required in production");
  }
  
  // Only use localhost in development
  return "http://localhost:5000";
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
    console.log(`🔧 Forwarding signup request to: ${BACKEND_URL}/signup`);
    
    const backendRes = await fetch(`${BACKEND_URL}/signup`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(req.body),
    });

    const data = await backendRes.json();
    
    console.log(`🔧 Backend signup response status: ${backendRes.status}`);

    // Copy cookies from backend response
    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("set-cookie", setCookie);
    }

    return res.status(backendRes.status).json(data);
    
  } catch (err: any) {
    console.error("❌ Signup proxy error:", err);
    
    // Provide better error messages
    let errorMessage = "Unable to create account. Please try again later.";
    
    if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed")) {
      errorMessage = "Cannot connect to authentication service. Please check if the backend server is running.";
    } else if (err.message?.includes("BACKEND_URL")) {
      errorMessage = "Server configuration error. Please contact support.";
    }
    
    return res.status(500).json({ 
      success: false,
      message: errorMessage
    });
  }
}