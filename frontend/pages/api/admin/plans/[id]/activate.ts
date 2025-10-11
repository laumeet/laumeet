import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== "PATCH") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/plans/${id}/activate`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: req.headers.cookie || "",
      },
      credentials: "include",
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("Activate plan fetch error:", err);
    return res.status(500).json({ success: false, message: "Cannot activate plan" });
  }
}