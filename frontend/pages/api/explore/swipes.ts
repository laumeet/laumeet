/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/api/explore/swipe.ts
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.NODE_ENV === "development" 
  ? "http://localhost:5000" 
  : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("🔧 Swipe request received. Cookie:", req.headers.cookie);

    const backendRes = await fetch(`${BACKEND_URL}/swipe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pass the original cookie from the browser for session/auth
        Cookie: req.headers.cookie || "",
      },
      // Make sure cookies are included
      credentials: "include",
      body: JSON.stringify(req.body),
    });

    const data = await backendRes.json();

    console.log("✅ Backend swipe response:", backendRes.status, data);

    return res.status(backendRes.status).json(data);
  } catch (err: any) {
    console.error("❌ Swipe proxy error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Unable to reach swipe service",
    });
  }
}
