// pages/api/test-backend.ts
import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL = process.env.NODE_ENV === "development"
  ? "http://localhost:5000"
  : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test basic connectivity
    const testResponse = await fetch(`${BACKEND_URL}/subscription/plans`, {
      headers: {
        "Cookie": req.headers.cookie || "",
      },
    });

    const contentType = testResponse.headers.get('content-type');
    let responseData;

    if (contentType?.includes('application/json')) {
      responseData = await testResponse.json();
    } else {
      const htmlText = await testResponse.text();
      responseData = { html: htmlText.substring(0, 500) };
    }

    res.status(200).json({
      backendUrl: BACKEND_URL,
      status: testResponse.status,
      contentType,
      data: responseData,
      cookiesSent: req.headers.cookie || 'No cookies',
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: BACKEND_URL,
    });
  }
}