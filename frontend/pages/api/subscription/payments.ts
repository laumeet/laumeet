// pages/api/subscription/payments.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { apiHandler } from "@/lib/api/config";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { page = "1", limit = "10" } = req.query;
    
    const result = await apiHandler(`/payments?page=${page}&limit=${limit}`);
    
    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    return res.status(200).json(result.data);
  } catch (err) {
    console.error("Payment history fetch error:", err);
    return res.status(500).json({ success: false, message: "Cannot fetch payment history" });
  }
}