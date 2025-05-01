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

    const physicians = await prisma.physician.findMany({
      where: {
        user: {
          id: parseInt(session.user.id),
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleInitial: true,
        billingNumber: true,
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
