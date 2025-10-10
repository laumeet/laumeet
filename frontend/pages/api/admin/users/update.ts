import type { NextApiRequest, NextApiResponse } from "next";

const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://laumeet.onrender.com";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!["POST", "PUT"].includes(req.method || "")) {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

   const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ success: false, message: "User ID is required" });
  }

  try {
    const response = await fetch(`${BACKEND_URL}/admin/users/${user_id}`, {
      method: req.method,
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
    console.error("Admin user update error:", err);
    return res.status(500).json({ success: false, message: "Cannot update user" });
  }
}
