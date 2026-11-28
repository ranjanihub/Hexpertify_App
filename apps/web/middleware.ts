import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { matchZombieSlug } from "./lib/zombie-pages";

export const ROOT = "/";
// /login is the one sign-in and sign-up page (the client app)
export const PRIVATE_ROUTES = [/^\/profile$/];

// Paths the website itself owns; zombie pages never take these over
const RESERVED_PREFIXES = [
  "/services", "/login", "/signup", "/profile", "/dashboard", "/admin", "/consultant", "/client",
  "/media", "/blog", "/blogs", "/about-us", "/contact-us", "/hire-a-mentor", "/privacy-policy", "/terms-conditions",
  "/refund-policy", "/z", "/sitemap", "/portal", "/therapist", "/sessions", "/messages", "/activities",
  "/assessments", "/progress", "/resources",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The old website CMS (/dashboard) was removed: its homepage, assets, bookings, professions and consultants
  // tools live in the admin panel, so old links and bookmarks go there
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return NextResponse.redirect(new URL("/admin", request.url), 308);
  }

  // The website's separate sign-up page was removed: accounts are created on /login. A booking pop-up's return
  // address (callbackUrl, a path on this site only) is passed on so the visitor comes back to finish booking.
  if (pathname === "/signup" || pathname.startsWith("/signup/")) {
    const target = new URL("/login", request.url);
    target.searchParams.set("mode", "signup");
    const back = request.nextUrl.searchParams.get("callbackUrl") || "";
    if (back.startsWith("/") && !back.startsWith("//") && !back.startsWith("/\\")) target.searchParams.set("returnTo", back);
    return NextResponse.redirect(target, 308);
  }

  // Zombie (SEO) pages from the Super Admin panel render at their own path
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

  const isPrivateRoute = PRIVATE_ROUTES.some((route) =>
    route.test(nextUrl.pathname),
  );

  if (isPrivateRoute && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Node.js runtime (stable since Next 15.5): Vercel Services does not support Edge Functions
  runtime: "nodejs",
  // Static files never need the sign-in checks: the panels' content-hashed bundles (/assets, /admin/assets,
  // /consultant/assets) and any image, font, script or stylesheet in public/. Skipping them saves a
  // middleware run (and its latency) on each of the dozens of files a panel loads.
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|sitemap.xml|robots.txt|assets/|admin/assets/|consultant/assets/|.*\\.(?:js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf)$).*)",
  ],
};
