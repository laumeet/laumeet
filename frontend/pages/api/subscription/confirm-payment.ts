// pages/api/subscription/confirm-payment.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { apiHandler } from "@/lib/api/config";

interface ConfirmPaymentRequest {
  payment_id: string;
  provider_payment_id: string;
  provider_reference: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { payment_id, provider_payment_id, provider_reference }: ConfirmPaymentRequest = req.body;

    if (!payment_id) {
      return res.status(400).json({ success: false, message: "Payment ID is required" });
    }

    const result = await apiHandler(`/payments/${payment_id}/confirm`, {
      method: "POST",
      body: JSON.stringify({
        provider_payment_id,
        provider_reference,
      }),
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    return res.status(200).json(result.data);
  } catch (err) {
    console.error("Payment confirmation error:", err);
    return res.status(500).json({ success: false, message: "Cannot confirm payment" });
  }
}