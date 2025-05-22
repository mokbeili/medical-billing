"use client";

import { Menu } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession({
    required: false,
  });

  const userRoles = session?.user?.roles || [];

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      router.push("/search");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (status === "loading") {
    return (
      <nav className="fixed top-0 w-full bg-white shadow-md z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 w-full bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <button
              onClick={onMenuClick}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 md:hidden"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link
              href="/"
              className="flex-shrink-0 flex items-center space-x-3"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-full"></div>
              <span className="text-xl font-semibold text-gray-900">
                Myon Health
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-8">
            {session ? (
              <>
                {session.user.roles.includes("PHYSICIAN") && (
                  <NavLink
                    href="/billing-claims"
                    active={pathname === "/billing-claims"}
                  >
                    Billing Claims
                  </NavLink>
                )}
                {session.user.roles.includes("ADMIN") && (
                  <NavLink href="/dashboard" active={pathname === "/dashboard"}>
                    Dashboard
                  </NavLink>
                )}
                <NavLink href="/search" active={pathname === "/search"}>
                  AI Code Search
                </NavLink>
                <NavLink href="/profile" active={pathname === "/profile"}>
                  Profile
                </NavLink>
              </>
            ) : (
              <>
                <NavLink href="/search" active={pathname === "/search"}>
                  AI Code Search
                </NavLink>
                <NavLink
                  href="/auth/signin"
                  active={pathname === "/auth/signin"}
                >
                  Sign In
                </NavLink>
                <NavLink
                  href="/auth/signup"
                  active={pathname === "/auth/signup"}
                >
                  Sign Up
                </NavLink>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center">
            {session ? (
              <button
                onClick={handleSignOut}
                className="ml-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Sign Out
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-1 pt-1 text-sm font-medium border-b-2 ${
        active
          ? "border-blue-500 text-gray-900"
          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
      }`}
    >
      {children}
    </Link>
  );
}
