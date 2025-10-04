// app/api/chat/messages/[conversationId]/route.ts
import { getCookieValue } from "@/lib/utils";
import { NextRequest, NextResponse } from "next/server";

const getBackendUrl = () => {
  if (process.env.NODE_ENV === "production" && process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("BACKEND_URL environment variable is required in production");
  }
  return "http://127.0.0.1:5000";
};

export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const BACKEND_URL = getBackendUrl();
    const { conversationId } = params;

    if (!conversationId) {
      return NextResponse.json(
        { success: false, message: "Conversation ID is required" },
        { status: 400 }
      );
    }

    console.log(`🔧 Fetching messages for conversation: ${conversationId}`);
    console.log(`🔧 Backend URL: ${BACKEND_URL}/messages/${conversationId}`);

    const token = getCookieValue(request.headers.get("cookie") || "", 'access_token_cookie');
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Authentication token required" },
        { status: 401 }
      );
    }

    const backendRes = await fetch(`${BACKEND_URL}/messages/${conversationId}`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${token}`
      },
      cache: "no-store"
    });

    if (!backendRes.ok) {
      console.error(`❌ Backend responded with status: ${backendRes.status}`);
      const errorText = await backendRes.text();
      console.error(`❌ Backend error response: ${errorText}`);
    }

    const data = await backendRes.json();
    console.log(`✅ Backend response:`, data);

    return NextResponse.json(data, { status: backendRes.status });

  } catch (err: any) {
    console.error("❌ Messages proxy error:", err);

    let errorMessage = "Unable to fetch messages. Please try again later.";
    if (err.message?.includes("ECONNREFUSED") || err.message?.includes("fetch failed")) {
      errorMessage = "Cannot connect to chat service. Please check if the backend server is running.";
    }

    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}
