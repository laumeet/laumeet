// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // cookie name must match Flask's JWT_ACCESS_COOKIE_NAME
  const cookieToken = req.cookies.get("access_token")?.value;
  const sessionToken = sessionStorage.getItem("access_token"); // for testing in dev
  // fallback header (we'll attach this from client via axios)
  const headerToken = req.headers.get("x-access-token");

  const token = cookieToken || headerToken || sessionToken;
  console.log("Middleware check, token found:", token);
  // Public pages: landing ("/"), auth pages
  const isPublicPage =
    req.nextUrl.pathname === "/" ||
    req.nextUrl.pathname === "/login" ||
    req.nextUrl.pathname === "/signup" ||
    req.nextUrl.pathname === "/forgot-password";

  if (!token && !isPublicPage) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (token && isPublicPage) {
    return NextResponse.redirect(new URL("/explore", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|models).*)"],
};
