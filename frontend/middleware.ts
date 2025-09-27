// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Use a lightweight, non-HttpOnly cookie to detect login status
  const isLoggedIn = req.cookies.get("is_logged_in")?.value === "true";

  // Public pages that don't require authentication
  const isPublicPage =
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname === "/login" ||
    req.nextUrl.pathname === "/signup" ||
    req.nextUrl.pathname === "/forgot-password";

  // If user is NOT logged in and trying to access a protected page -> redirect to /login
  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If user IS logged in and visiting a public page -> redirect to /explore
  if (isLoggedIn && isPublicPage) {
    return NextResponse.redirect(new URL("/explore", req.url));
  }

  // Otherwise, allow the request to continue
  return NextResponse.next();
}

// Apply middleware to all routes except _next, static files, favicon, etc.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|models).*)"],
};
