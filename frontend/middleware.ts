// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const token = req.cookies.get("access_token_cookie"); 
  // 👆 Flask-JWT-Extended default cookie name

  const isAuthPage = req.nextUrl.pathname.startsWith("/login") || req.nextUrl.pathname.startsWith("/signup");

  if (!token && !isAuthPage) {
    // Not logged in → redirect to login
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && isAuthPage) {
    // Already logged in → block login/signup
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

// Define where middleware runs
export const config = {
  matcher: ["/"],
};
