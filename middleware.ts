import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for auth-related paths and test endpoint
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/mobile-auth") ||
    pathname === "/api/test" ||
    pathname.startsWith("/api/referring-physicians/public") ||
    pathname.startsWith("/api/health-institutions/public")
  ) {
    return NextResponse.next();
  }

  // Handle API routes
  if (pathname.startsWith("/api/")) {
    // Check for mobile app headers first
    const userId = request.headers.get("x-user-id");
    const userEmail = request.headers.get("x-user-email");
    const userRoles = request.headers.get("x-user-roles");

    if (userId && userEmail && userRoles) {
      // Mobile app authentication
      const user = {
        id: userId,
        email: userEmail,
        roles: userRoles.split(","),
      };

      // Clone the request and add user info
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user", JSON.stringify(user));

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    } else {
      // Try NextAuth session
      const token = await getToken({ req: request });
      if (!token) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
