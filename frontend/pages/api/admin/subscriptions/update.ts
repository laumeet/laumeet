import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Expect subscription_id in query or body
  const subscriptionId = req.query.subscription_id || (req.body && req.body.subscription_id);

  if (req.method !== "PUT") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  if (!subscriptionId) {
    return res.status(400).json({ success: false, message: "Subscription ID is required" });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/admin/subscriptions/${subscriptionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.cookie || "",
      },
      body: JSON.stringify(req.body),
      credentials: "include",
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("Admin subscription update error:", err);
    return res.status(500).json({ success: false, message: "Cannot update subscription" });
  }
}
