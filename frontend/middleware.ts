// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("access_token")?.value;
  
  // Debug logging
  console.log('🔐 Middleware Debug:', {
    path: req.nextUrl.pathname,
    hasAccessToken: !!accessToken,
    accessTokenLength: accessToken?.length,
    allCookies: Object.fromEntries(req.cookies.getAll().map(c => [c.name, c.value.length]))
  });

  const publicPages = [
    "/",
    "/login", 
    "/signup",
    "/forgot-password",
    "/reset-password"
  ];

  const isPublicPage = publicPages.includes(req.nextUrl.pathname);

  // Not logged in and trying to access protected page → redirect to login
  if (!accessToken && !isPublicPage) {
    console.log('🚫 Redirecting to login: No access token');
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Logged in but visiting login/signup → redirect to explore
  if (accessToken && (req.nextUrl.pathname === "/login" || req.nextUrl.pathname === "/signup")) {
    console.log('✅ Redirecting to explore: Already logged in');
    return NextResponse.redirect(new URL("/explore", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|models|api).*)"],
};