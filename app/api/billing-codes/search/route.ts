import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Mark this route as dynamic
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const jurisdictionId = searchParams.get("jurisdictionId");

    if (!query || !jurisdictionId) {
      return new NextResponse("Missing required parameters", { status: 400 });
    }

    // Search for billing codes using multiple methods
    const codes = await prisma.billingCode.findMany({
      where: {
        section: {
          jurisdictionId: parseInt(jurisdictionId),
        },
        OR: [
          // Exact code match
          { code: query },
          // Title contains query
          { title: { contains: query, mode: "insensitive" } },
          // Description contains query
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        section: true,
      },
      take: 20, // Limit results
    });

    return NextResponse.json(codes);
  } catch (error) {
    console.error("Error searching billing codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
