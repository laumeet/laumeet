// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("access_token_cookie")?.value;
  const isLoggedIn = req.cookies.get("is_logged_in")?.value === "true";

  const publicPages = [
    "/",
    "/login", 
    "/signup",
    "/forgot-password",
    "/reset-password"
  ];

  const isPublicPage = publicPages.includes(req.nextUrl.pathname);

  // Debug logging (remove in production)
  console.log('Middleware Debug:', {
    path: req.nextUrl.pathname,
    hasAccessToken: !!accessToken,
    isLoggedIn: isLoggedIn,
    isPublicPage: isPublicPage
  });

  // Not logged in and trying to access protected page → redirect to login
  if (!accessToken && !isPublicPage) {
    console.log('Redirecting to login: No access token');
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Logged in but visiting a public page → redirect to explore
  if (accessToken && isPublicPage && req.nextUrl.pathname !== "/") {
    console.log('Redirecting to explore: Already logged in');
    return NextResponse.redirect(new URL("/explore", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|models|api).*)"],
};