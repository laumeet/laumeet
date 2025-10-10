// pages/api/feed/posts/[id].ts
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

  const url = `${BACKEND_URL}/api/posts/${id}`;

  console.log(`🔧 Individual Post API: ${req.method} ${url}`);
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

    const backendRes = await fetch(url, fetchOptions);

    console.log(`🔧 Backend post response status: ${backendRes.status}`);

    const data = await backendRes.json();

    return res.status(backendRes.status).json(data);

  } catch (err) {
    console.error("❌ Individual post proxy error:", err);
    return res.status(500).json({
      success: false,
      message: "Cannot connect to feed service"
    });
  }
}