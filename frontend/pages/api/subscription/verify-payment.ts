// pages/api/subscription/verify-payment.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { apiHandler } from "@/lib/api/config";

interface VerifyPaymentRequest {
  payment_id: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { payment_id }: VerifyPaymentRequest = req.body;

    if (!payment_id) {
      return res.status(400).json({ success: false, message: "Payment ID is required" });
    }

    const result = await apiHandler(`/payments/${payment_id}/verify`, {
      method: "POST",
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    return res.status(200).json(result.data);
  } catch (err) {
    console.error("Payment verification error:", err);
    return res.status(500).json({ success: false, message: "Cannot verify payment" });
  }
}