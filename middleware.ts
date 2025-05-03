import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Paths that don't require authentication
  const publicPaths = [
    "/auth/signin",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/api/auth/register",
    "/api/auth/signin",
  ];

  // If it's a public path, allow access without token verification
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Get the token from the request
  const token = await getToken({ req: request });

  if (!token) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  // Check if the path exists
  const response = await fetch(request.url);
  if (response.status === 404) {
    return NextResponse.redirect(new URL("/profile", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/auth routes
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api/auth).*)",
  ],
};
