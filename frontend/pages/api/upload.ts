/* eslint-disable @typescript-eslint/no-explicit-any */
// pages/api/feed/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { IncomingForm, Files, Fields } from "formidable";
import { promisify } from "util";
import fs from "fs";

const readFile = promisify(fs.readFile);

const BACKEND_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:5000"
    : "https://laumeet.onrender.com";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    console.log("🔧 Starting file upload process...");

    const form = new IncomingForm();

    // ✅ Explicitly type err, fields, files
    const [fields, files] = await new Promise<[Fields, Files]>((resolve, reject) => {
      form.parse(req, (err: Error | null, fields: Fields, files: Files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const imageFile = Array.isArray(files.image) ? files.image[0] : (files.image as any);

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: "No image file provided",
      });
    }

    console.log("🔧 File parsed successfully:", imageFile.originalFilename);

    // ✅ Use FormData and Blob properly
    const formData = new FormData();
    const fileBuffer = await readFile(imageFile.filepath);
    const blob = new Blob([fileBuffer], {
      type: imageFile.mimetype || "image/jpeg",
    });
    formData.append("image", blob, imageFile.originalFilename || "image.jpg");

    const backendUrl = `${BACKEND_URL}/api/upload`;
    console.log(`🔧 Forwarding to: ${backendUrl}`);

    const backendRes = await fetch(backendUrl, {
      method: "POST",
      headers: {
        Cookie: req.headers.cookie || "",
      },
      body: formData,
    });

    console.log(`🔧 Backend response status: ${backendRes.status}`);

    const data = await backendRes.json();

    // Clean up temp file
    try {
      fs.unlinkSync(imageFile.filepath);
    } catch (cleanupError) {
      console.warn("Could not clean up temp file:", cleanupError);
    }

    return res.status(backendRes.status).json(data);
  } catch (err) {
    console.error("❌ Upload proxy error:", err);
    return res.status(500).json({
      success: false,
      message: "Cannot connect to upload service",
    });
  }
}
