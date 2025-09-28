// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("access_token_cookie")?.value;

  const isPublicPage =
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname === "/login" ||
    req.nextUrl.pathname === "/signup" ||
    req.nextUrl.pathname === "/forgot-password";

  // Not logged in → redirect to /login
  if (!accessToken && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Logged in but visiting a public page → redirect to /explore
  if (accessToken && isPublicPage) {
    return NextResponse.redirect(new URL("/explore", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|models).*)"],
};
