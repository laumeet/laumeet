import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const { subscription_id } = req.query;

  if (!subscription_id) {
    return res.status(400).json({ success: false, message: "Subscription ID is required" });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/admin/subscriptions/${subscription_id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.cookie || "",
      },
      credentials: "include",
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("Admin subscription delete error:", err);
    return res.status(500).json({ success: false, message: "Cannot delete subscription" });
  }
}
