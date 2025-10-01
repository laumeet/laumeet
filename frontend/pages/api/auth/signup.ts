// frontend/pages/api/auth/login.ts
import type { NextApiRequest, NextApiResponse } from "next";

// Your Flask backend URL
const BACKEND_URL = process.env.NODE_ENV === "development" ? process.env.BACKEND_URL || "http:laumeet.onrender.com" : "http://127.0.0.1:5000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Forward login request to Flask backend
    const backendRes = await fetch(`${BACKEND_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
      credentials: "include",
    });

    // Copy status and body
    const data = await backendRes.json();
    res.status(backendRes.status);

    // Copy cookies from Flask response → frontend domain
    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("set-cookie", setCookie);
    }

    res.json(data);
  } catch (err) {
    console.error("❌ Login proxy error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
