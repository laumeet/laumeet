/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/api/matching/liked-me.ts
import { getCookieValue } from "@/lib/utils";
import type { NextApiRequest, NextApiResponse } from "next";

const getBackendUrl = () => {
  if (process.env.NODE_ENV === "production" && process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  return "http://127.0.0.1:5000";
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "OPTIONS") {
    return res.status(200).json({ success: true });
  }

  if (req.method === "GET") {
    try {
      const BACKEND_URL = getBackendUrl();
      
      console.log(`🔧 Fetching users who liked me`);
      
      const token = getCookieValue(req.headers.cookie, 'access_token_cookie');
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: "Authentication token required" 
        });
      }

      const backendRes = await fetch(`${BACKEND_URL}/users/liked-me`, {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
      });

      const data = await backendRes.json();
      return res.status(backendRes.status).json(data);
      
    } catch (err: any) {
      console.error("❌ Liked me proxy error:", err);
      
      let errorMessage = "Unable to fetch users who liked you. Please try again later.";
      
      if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed")) {
        errorMessage = "Cannot connect to service. Please check if the backend server is running.";
      }
      
      return res.status(500).json({ 
        success: false,
        message: errorMessage
      });
    }
  }

  return res.status(405).json({ message: "Method not allowed" });
}