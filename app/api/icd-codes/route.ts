import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";

    let icdCodes;

    if (search.length >= 2) {
      // Use full-text search for better performance and relevance
      icdCodes = await prisma.$queryRaw`
        SELECT 
          id,
          version,
          code,
          description,
          created_at,
          updated_at,
          ts_rank(to_tsvector('english', code || ' ' || description), plainto_tsquery('english', ${search})) as rank
        FROM icd_codes 
        WHERE to_tsvector('english', code || ' ' || description) @@ plainto_tsquery('english', ${search})
        ORDER BY rank DESC, code ASC
        LIMIT 50
      `;
    } else {
      // Fallback to simple contains search for short queries
      icdCodes = await prisma.iCDCode.findMany({
        where: {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        },
        orderBy: {
          code: "asc",
        },
        take: 50,
      });
    }

    return NextResponse.json(icdCodes);
  } catch (error) {
    console.error("Error fetching ICD codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user has admin role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { roles: true },
    });

    if (!user?.roles.includes("ADMIN")) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await request.json();
    const { version, code, description } = body;

    // Validate required fields
    if (!version || !code || !description) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const icdCode = await prisma.iCDCode.create({
      data: {
        version,
        code,
        description,
      },
    });

    return NextResponse.json(icdCode);
  } catch (error) {
    console.error("Error creating ICD code:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
