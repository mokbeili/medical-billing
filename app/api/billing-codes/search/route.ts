import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

// Mark this route as dynamic
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const jurisdictionId = searchParams.get("jurisdictionId") || "1";

    if (!query) {
      return new NextResponse("Missing query parameter", { status: 400 });
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
        section: {
          include: {
            jurisdiction: true,
          },
        },
      },
      take: 20, // Limit results
    });

    // Transform the data to match the expected format
    const transformedCodes = codes.map((code) => ({
      id: code.id,
      code: code.code,
      title: code.title,
      description: code.description,
      billing_record_type: code.billing_record_type,
      section: {
        code: code.section.code,
        title: code.section.title,
      },
      jurisdiction: {
        id: code.section.jurisdiction.id,
        name: `${code.section.jurisdiction.country} - ${code.section.jurisdiction.region}`,
      },
      provider: {
        id: 1, // Default provider
        name: "Default Provider",
      },
    }));

    return NextResponse.json(transformedCodes);
  } catch (error) {
    console.error("Error searching billing codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
