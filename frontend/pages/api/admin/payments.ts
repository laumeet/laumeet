import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { page = 1, per_page = 20, status = "all", provider = "all", date_from = "", date_to = "" } = req.query;

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const q = new URLSearchParams({
      page: String(page),
      per_page: String(per_page),
      status: String(status),
      provider: String(provider),
      date_from: String(date_from),
      date_to: String(date_to),
    }).toString();

    const response = await fetch(`${BACKEND_URL}/admin/payments?${q}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.cookie || "",
      },
      credentials: "include",
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("Admin payments fetch error:", err);
    return res.status(500).json({ success: false, message: "Cannot fetch payments" });
  }
}
