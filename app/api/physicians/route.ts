import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Check for mobile app authentication first
    const userHeader = request.headers.get("x-user");
    let user = null;

    if (userHeader) {
      try {
        user = JSON.parse(userHeader);
      } catch (error) {
        console.error("Error parsing user header:", error);
      }
    }

    // If no mobile user, try NextAuth session
    if (!user) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return new NextResponse("Unauthorized", { status: 401 });
      }
      user = session.user;
    }

    const physicians = await prisma.physician.findMany({
      where: {
        user: {
          id: parseInt(user.id),
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleInitial: true,
        billingNumber: true,
        healthInstitution: {
          select: {
            city: true,
          },
        },
      },
      orderBy: {
        lastName: "asc",
      },
    });

    return NextResponse.json(physicians);
  } catch (error) {
    console.error("Error fetching physicians:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
