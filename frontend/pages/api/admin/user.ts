import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.NODE_ENV === "development" 
  ? "http://localhost:5000" 
  : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests for fetching users
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("🔧 Admin users request cookies:", req.headers.cookie);
    
    // Forward the request to Flask admin endpoint WITH authentication cookies
    const backendRes = await fetch(`${BACKEND_URL}/admin/users`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Cookie": req.headers.cookie || "", // Forward authentication cookies
      },
      credentials: "include",
    });

    console.log("🔧 Backend admin users response status:", backendRes.status);

    const data = await backendRes.json();
    
    // Return the backend response directly
    return res.status(backendRes.status).json(data);
    
  } catch (err) {
    console.error("❌ Admin users proxy error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Cannot connect to admin service" 
    });
  }
}