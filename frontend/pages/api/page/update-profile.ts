import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.NODE_ENV === "development" 
  ? "http://localhost:5000" 
  : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "PUT") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("🔧 Update profile request cookies:", req.headers.cookie);
    
    // Forward the update profile request to Flask WITH the cookies and body
    const backendRes = await fetch(`${BACKEND_URL}/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Cookie": req.headers.cookie || "", // Forward the cookies
      },
      body: JSON.stringify(req.body),
      credentials: "include",
    });

    console.log("🔧 Backend update profile response status:", backendRes.status);

    const data = await backendRes.json();
    
    // Return the backend response directly
    return res.status(backendRes.status).json(data);
    
  } catch (err) {
    console.error("❌ Update profile proxy error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Cannot connect to authentication service" 
    });
  }
}