import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { matchZombieSlug } from "./lib/zombie-pages";

export const ROOT = "/";
// /login is the panels' login page (the client app); only the website's own sign-up redirects signed-in users
export const AUTH_ROUTES = ["/signup"];
export const PRIVATE_ROUTES = [/^\/profile$/];
export const ADMIN_PRIVATE_ROUTES = [/^\/dashboard\/.*$/];

// Paths the website itself owns; zombie pages never take these over
const RESERVED_PREFIXES = [
  "/services", "/login", "/signup", "/profile", "/dashboard", "/admin", "/consultant", "/client",
  "/media", "/blog", "/blogs", "/about-us", "/contact-us", "/hire-a-mentor", "/privacy-policy", "/terms-conditions",
  "/refund-policy", "/z", "/sitemap", "/portal", "/therapist", "/sessions", "/messages", "/activities",
  "/assessments", "/progress", "/resources",
];

export async function middleware(request: NextRequest) {
  // Zombie (SEO) pages from the Super Admin panel render at their own path
  const { pathname } = request.nextUrl;
  const isReserved = pathname === "/" || RESERVED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!isReserved && !pathname.includes(".")) {
    const zombieId = await matchZombieSlug(pathname, request.nextUrl.origin);
    if (zombieId) {
      return NextResponse.rewrite(new URL(`/z/${encodeURIComponent(zombieId)}`, request.url));
    }
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const user = token || null;
  const { nextUrl } = request;

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "ADMIN";

  const isAuthRoute = AUTH_ROUTES.includes(nextUrl.pathname);
  const isPrivateRoute = PRIVATE_ROUTES.some((route) =>
    route.test(nextUrl.pathname),
  );
  const isAdminRoute = ADMIN_PRIVATE_ROUTES.some((route) =>
    route.test(nextUrl.pathname),
  );

  if (isPrivateRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAdminRoute && !isAdmin) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(
      new URL(isAdmin ? "/dashboard" : "/", request.url),
    );
  }

  if (isAdmin && !isAdminRoute && nextUrl.pathname !== "/dashboard") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Node.js runtime (stable since Next 15.5): Vercel Services does not support Edge Functions
  runtime: "nodejs",
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|sitemap.xml|robots.txt).*)",
  ],
};
