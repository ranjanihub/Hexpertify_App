import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const ROOT = "/";
export const AUTH_ROUTES = ["/login", "/signup"];
export const PRIVATE_ROUTES = [/^\/profile$/];
export const ADMIN_PRIVATE_ROUTES = [/^\/dashboard\/.*$/];

export async function middleware(request: NextRequest) {
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
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|sitemap.xml|robots.txt).*)",
  ],
};
