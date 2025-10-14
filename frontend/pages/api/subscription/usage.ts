// pages/api/subscription/usage.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { apiHandler } from "@/lib/api/config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const result = await apiHandler("/usage", req); // Pass req here
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    return res.status(200).json(result.data);
  } catch (err) {
    console.error("Usage stats fetch error:", err);
    return res.status(500).json({ success: false, message: "Cannot fetch usage statistics" });
  }
}