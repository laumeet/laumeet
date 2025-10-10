// pages/api/feed/posts/[id]/comments.ts
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:5000"
  : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      success: false,
      message: "Post ID is required"
    });
  }

  const url = `${BACKEND_URL}/api/posts/${id}/comments`;

  console.log(`🔧 Comments API: ${req.method} ${url}`);
  console.log("🔧 Cookies:", req.headers.cookie);

  try {
    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        "Cookie": req.headers.cookie || "",
        ...(req.headers.authorization && {
          Authorization: req.headers.authorization
        }),
      },
      credentials: "include" as RequestCredentials,
    };

    // Add body for POST requests
    if (req.method === "POST" && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const backendRes = await fetch(url, fetchOptions);

    console.log(`🔧 Backend comments response status: ${backendRes.status}`);

    const data = await backendRes.json();

    return res.status(backendRes.status).json(data);

  } catch (err) {
    console.error("❌ Comments proxy error:", err);
    return res.status(500).json({
      success: false,
      message: "Cannot connect to feed service"
    });
  }
}