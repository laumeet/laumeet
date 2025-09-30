// frontend/pages/api/auth/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.BACKEND_URL || "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Tell Flask to clear cookies
    const backendRes = await fetch(`${BACKEND_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });

    res.status(backendRes.status);

    // Clear cookies on frontend domain
    res.setHeader("set-cookie", [
      `access_token_cookie=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure`,
      `refresh_token_cookie=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax; Secure`,
    ]);

    res.json({ message: "Logged out successfully" });
  } catch (err) {
    console.error("❌ Logout proxy error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
