// pages/api/subscription/subscribe.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { apiHandler } from "@/lib/api/config";

interface SubscribeRequest {
  plan_id: string;
  billing_cycle: "monthly" | "yearly";
  payment_provider?: string;
  mock_payment?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const { plan_id, billing_cycle, payment_provider = "flutterwave", mock_payment = false }: SubscribeRequest = req.body;

    if (!plan_id || !billing_cycle) {
      return res.status(400).json({ success: false, message: "Plan ID and billing cycle are required" });
    }

    const result = await apiHandler("/subscribe", req, { // Pass req here
      method: "POST",
      body: JSON.stringify({
        plan_id,
        billing_cycle,
        payment_provider,
        mock_payment,
      }),
    });

    if (!result.success) {
      return res.status(500).json({ success: false, message: result.error });
    }

    return res.status(201).json(result.data);
  } catch (err) {
    console.error("Subscription creation error:", err);
    return res.status(500).json({ success: false, message: "Cannot create subscription" });
  }
}