import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Paths that don't require authentication
  const publicPaths = [
    "/",
    "/auth/signin",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/api/auth/register",
    "/api/auth/signin",
    "/search",
  ];

  // If it's a public path, allow access without token verification
  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  try {
    // Get the token from the request
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token) {
      const homeUrl = new URL("/", request.url);
      return NextResponse.redirect(homeUrl);
    }

    // Add token to request headers for API routes
    if (request.nextUrl.pathname.startsWith("/api/")) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-user-id", token.id as string);
      requestHeaders.set("x-user-email", token.email as string);
      requestHeaders.set("x-user-roles", JSON.stringify(token.roles));

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // In case of error, redirect to home page
    const homeUrl = new URL("/", request.url);
    return NextResponse.redirect(homeUrl);
  }
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
