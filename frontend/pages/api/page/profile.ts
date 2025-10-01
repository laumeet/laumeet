import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.NODE_ENV === "development" 
  ? "http://localhost:5000" 
  : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("🔧 Profile request cookies:", req.headers.cookie);
    
    // Forward the profile request to Flask WITH the cookies
    const backendRes = await fetch(`${BACKEND_URL}/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cookie": req.headers.cookie || "", // Forward the cookies from the frontend request
      },
      credentials: "include",
    });

    console.log("🔧 Backend profile response status:", backendRes.status);

    const data = await backendRes.json();
    
    // Return the backend response directly
    return res.status(backendRes.status).json(data);
    
  } catch (err) {
    console.error("❌ Profile proxy error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Cannot connect to authentication service" 
    });
  }
}