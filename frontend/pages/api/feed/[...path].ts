// pages/api/feed/[...path].ts
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:5000"
  : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;

  // Get the full path from query parameters
  const pathArray = Array.isArray(path) ? path : [path];
  const backendPath = pathArray.join('/');

  // Skip if it's a like or comments route (handled by specific files)
  if (backendPath.includes('/like') || backendPath.includes('/comments')) {
    return res.status(404).json({
      success: false,
      message: "Route not found - use specific API routes"
    });
  }

  const url = `${BACKEND_URL}/api/${backendPath}`;

  console.log(`🔧 Feed API Proxy: ${req.method} ${url}`);
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

    // Only add body for non-GET requests
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const backendRes = await fetch(url, fetchOptions);

    console.log(`🔧 Backend response status: ${backendRes.status}`);

    const data = await backendRes.json();

    return res.status(backendRes.status).json(data);

  } catch (err) {
    console.error("❌ Feed API proxy error:", err);
    return res.status(500).json({
      success: false,
      message: "Cannot connect to feed service"
    });
  }
}