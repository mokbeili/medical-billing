import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user has ADMIN role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!user || !user.roles.includes("ADMIN")) {
      return new NextResponse("Forbidden: Admin access required", {
        status: 403,
      });
    }

    const physicians = await prisma.physician.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleInitial: true,
        billingNumber: true,
        groupNumber: true,
        jurisdiction: {
          select: {
            country: true,
            region: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json(physicians);
  } catch (error) {
    console.error("Error fetching all physicians:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
