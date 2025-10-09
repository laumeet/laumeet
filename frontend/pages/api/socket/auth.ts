/* eslint-disable @typescript-eslint/no-explicit-any */
//pages/api/socket/auth.ts (Pages Router version)

import { getCookieValue } from "@/lib/utils";
import type { NextApiRequest, NextApiResponse } from "next";
const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5000"
    : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("🔧 Explore profiles request cookies:", req.headers.cookie);
    const backendRes = await fetch(`${BACKEND_URL}/protected`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cookie": req.headers.cookie || "",
      },
      credentials: "include",
    });

    console.log("🔧 Backend explore response status:", backendRes.status);

    // Check if the response is OK
    if (!backendRes.ok) {
      throw new Error(`Backend returned ${backendRes.status}: ${backendRes.statusText}`);
    }

    const data = await backendRes.json();
    
    // Ensure the response has the correct structure
    const responseData = {
      token: getCookieValue(req.headers.cookie, 'access_token_cookie'),
      success: data.success || false,
      profiles: data.profiles || [],
      total_profiles: data.total_profiles || (data.profiles ? data.profiles.length : 0),
      message: data.message
    };
    
    console.log("🔧 Processed explore response:", responseData);
    
    return res.status(backendRes.status).json(responseData);
    
  } catch (err: any) {
    console.error("❌ Explore profiles proxy error:", err);
    return res.status(500).json({ 
      success: false, 
      message: err.message || "Cannot connect to explore service",
      profiles: [],
      total_profiles: 0
    });
  }
}
