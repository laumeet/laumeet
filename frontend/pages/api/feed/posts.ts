// pages/api/feed/posts.ts
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:5000"
  : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const url = `${BACKEND_URL}/api/posts`;

  console.log(`🔧 Feed Posts Proxy: ${req.method} ${url}`);
  console.log("🔧 Request body:", req.body);

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Cookie": req.headers.cookie || "",
        ...(req.headers.authorization && { Authorization: req.headers.authorization }),
      },
      credentials: "include" as RequestCredentials,
    };

    // Add body for POST requests
    if (req.method === "POST" && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const backendRes = await fetch(url, fetchOptions);

    console.log(`🔧 Backend response status: ${backendRes.status}`);

    const data = await backendRes.json();

    return res.status(backendRes.status).json(data);

  } catch (err) {
    console.error("❌ Feed posts proxy error:", err);
    return res.status(500).json({
      success: false,
      message: "Cannot connect to feed service"
    });
  }
}