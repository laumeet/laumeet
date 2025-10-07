/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/socket/auth/route.ts (App Router version)
// or pages/api/socket/auth.ts (Pages Router version)
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5000"
    : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("🔧 [Socket Auth] Request cookies:", req.headers.cookie);

    // ✅ Verify the cookie/JWT via backend protected route
    const backendRes = await fetch(`${BACKEND_URL}/protected`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // Forward cookies to backend for auth
        Cookie: req.headers.cookie || "",
      },
      credentials: "include",
    });

    console.log("🔧 [Socket Auth] Backend status:", backendRes.status);

    if (backendRes.status === 401) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        message: "Authentication failed",
      });
    }

    if (!backendRes.ok) {
      const text = await backendRes.text();
      throw new Error(`Backend error ${backendRes.status}: ${text}`);
    }

    const data = await backendRes.json();

    console.log("✅ [Socket Auth] User verified:", data.user?.public_id);

    return res.status(200).json({
      success: true,
      authenticated: true,
      user: data.user,
      message: "Authentication successful",
    });
  } catch (err: any) {
    console.error("❌ [Socket Auth] Proxy error:", err.message);
    return res.status(500).json({
      success: false,
      authenticated: false,
      message: err.message || "Cannot connect to authentication service",
    });
  }
}
