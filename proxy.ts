import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function redirect(request: NextRequest, pathname: string): NextResponse {
  return NextResponse.redirect(new URL(pathname, request.url));
}

export function proxy(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  if (pathname === "/register" && !request.cookies.has("invitation_flow")) {
    return redirect(request, "/register?invalid=true");
  }
  if (pathname === "/change-password" && !request.cookies.has("forced_reset")) {
    return redirect(request, "/login");
  }
  if (pathname.startsWith("/api/users/") && pathname.endsWith("/avatar") && !request.cookies.has("session")) {
    return new NextResponse(null, {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  if ((pathname.startsWith("/users") || pathname.startsWith("/admin")) && !request.cookies.has("session")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/register",
    "/reset-password",
    "/change-password",
    "/auth/:path*",
    "/users/:path*",
    "/admin/:path*",
    "/api/users/:path*",
    "/api/health",
  ],
};
