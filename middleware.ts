import { verify } from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Debug environment variables
  console.log("JWT_SECRET length:", process.env.JWT_SECRET?.length);
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set");
  }

  const token = request.cookies.get("auth_token")?.value;

  // Paths that don't require authentication
  const publicPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/api/auth/register",
    "/api/auth/login",
  ];

  if (publicPaths.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    verify(token, process.env.JWT_SECRET!);
    return NextResponse.next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
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
