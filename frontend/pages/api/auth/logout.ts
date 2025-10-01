// pages/api/auth/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";

const getBackendUrl = () => {
  // Always use environment variable if set
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  
  // In production, don't fall back to localhost
  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_URL environment variable is required in production");
  }
  
  // Only use localhost in development
  return "http://localhost:5000";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }
const BACKEND_URL = getBackendUrl()

  // Get all cookies from the incoming request
  const cookies = req.headers.cookie || "";

  try {
    const backendRes = await fetch(`${BACKEND_URL}/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": cookies, // Forward ALL cookies
      },
      credentials: "include",
    });

    const responseData = await backendRes.json().catch(() => ({}));

    // Always clear cookies regardless of backend response
    const clearCookies = [
      "access_token_cookie=; Path=/; HttpOnly; Max-Age=0; SameSite=None; Secure",
      "refresh_token_cookie=; Path=/; HttpOnly; Max-Age=0; SameSite=None; Secure", 
      "is_logged_in=; Path=/; Max-Age=0; SameSite=None; Secure",
    ];

    res.setHeader("Set-Cookie", clearCookies);

    // Return success even if backend had issues, since we cleared cookies
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
      backendResponse: responseData
    });

  } catch (error) {
    console.error("Logout error:", error);
    
    // Clear cookies on error too
    res.setHeader("Set-Cookie", [
      "access_token_cookie=; Path=/; HttpOnly; Max-Age=0; SameSite=None; Secure",
      "refresh_token_cookie=; Path=/; HttpOnly; Max-Age=0; SameSite=None; Secure",
      "is_logged_in=; Path=/; Max-Age=0; SameSite=None; Secure",
    ]);

    return res.status(200).json({
      success: true,
      message: "Logged out (local cleanup completed)"
    });
  }
}