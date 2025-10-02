// frontend/pages/api/auth/refresh.ts
import type { NextApiRequest, NextApiResponse } from "next";

// Your Flask backend URL
const BACKEND_URL = process.env.NODE_ENV !== "development" ? process.env.BACKEND_URL || "http:laumeet.onrender.com" : "http://127.0.0.1:5000";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Call Flask refresh endpoint
    const backendRes = await fetch(`${BACKEND_URL}/refresh`, {
      method: "POST",
      credentials: "include",
    });

    const data = await backendRes.json();
    res.status(backendRes.status);

    // Copy cookies
    const setCookie = backendRes.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("set-cookie", setCookie);
    }

    res.json(data);
  } catch (err) {
    console.error("❌ Refresh proxy error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
