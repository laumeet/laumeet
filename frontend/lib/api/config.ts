// lib/api/config.ts

import type { NextApiRequest } from "next";

const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://laumeet.onrender.com";

export const API_CONFIG = {
  BASE_URL: BACKEND_URL,
};

export async function apiHandler(
  endpoint: string,
  req: NextApiRequest,
  options: RequestInit = {}
) {
  try {
    // Extract and forward all cookies
    const cookies = req.headers.cookie || '';

    // Also extract authorization header if present
    const authHeader = req.headers.authorization;

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Forward cookies
    if (cookies) {
      headers["Cookie"] = cookies;
    }

    // Forward authorization header if present
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    console.log(`🔧 API Call: ${BACKEND_URL}${endpoint}`);
    console.log(`🔧 Cookies being sent: ${cookies ? 'Yes' : 'No'}`);

    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    // Check if response is HTML instead of JSON
    const contentType = response.headers.get('content-type');
    let data;

    if (contentType?.includes('text/html')) {
      // Handle HTML response (likely an error page)
      const htmlText = await response.text();
      console.error('❌ Backend returned HTML instead of JSON:', htmlText.substring(0, 500));

      throw new Error(`Backend returned HTML error page. Status: ${response.status}. Check if the endpoint exists.`);
    } else {
      // Try to parse as JSON
      try {
        data = await response.json();
      } catch (jsonError) {
        // If JSON parsing fails, get the text for debugging
        const responseText = await response.text();
        console.error('❌ JSON parse error. Response text:', responseText.substring(0, 500));
        throw new Error(`Invalid JSON response from backend. Status: ${response.status}`);
      }
    }

    // If we get a 401, the token might be invalid/expired
    if (response.status === 401) {
      throw new Error("Authentication required. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(data?.message || `HTTP error! status: ${response.status}`);
    }

    return { success: true, data };
  } catch (error) {
    console.error(`❌ API Error (${endpoint}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    };
  }
}