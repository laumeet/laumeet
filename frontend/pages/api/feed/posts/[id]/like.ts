// pages/api/feed/posts/[id]/like.ts
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:5000"
  : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Post ID is required"
      });
    }

    const url = `${BACKEND_URL}/api/posts/${id}/like`;

    console.log(`🔧 Liking post: ${url}`);
    console.log("🔧 Cookies:", req.headers.cookie);

    const backendRes = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": req.headers.cookie || "",
        ...(req.headers.authorization && {
          Authorization: req.headers.authorization
        }),
      },
      credentials: "include" as RequestCredentials,
    });

    console.log(`🔧 Backend like response status: ${backendRes.status}`);

    const data = await backendRes.json();

    return res.status(backendRes.status).json(data);

  } catch (err) {
    console.error("❌ Like proxy error:", err);
    return res.status(500).json({
      success: false,
      message: "Cannot connect to feed service"
    });
  }
}