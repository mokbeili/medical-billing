import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

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

    const url = new URL(request.url);
    const query = url.searchParams.get("query") || "";
    const version = url.searchParams.get("version");
    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const searchType = url.searchParams.get("searchType") || "all";

    if (!query || query.length < 2) {
      return NextResponse.json({
        results: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
        searchType: "none",
      });
    }

    const offset = (page - 1) * limit;

    // Build where clause based on search type
    let whereClause: any = {};

    if (version) {
      whereClause.version = version;
    }

    switch (searchType) {
      case "code":
        whereClause.code = { contains: query, mode: "insensitive" };
        break;
      case "description":
        whereClause.description = { contains: query, mode: "insensitive" };
        break;
      case "exact_code":
        whereClause.code = query;
        break;
      case "all":
      default:
        whereClause.OR = [
          { code: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ];
        break;
    }

    // Get total count for pagination
    const total = await prisma.iCDCode.count({
      where: whereClause,
    });

    // Get results with ordering
    let results;

    if (query.length >= 2) {
      // Use full-text search for better performance and relevance
      const searchQuery = `
        SELECT 
          id,
          version,
          code,
          description,
          created_at,
          updated_at,
          ts_rank(to_tsvector('english', code || ' ' || description), plainto_tsquery('english', $1)) as rank
        FROM icd_codes 
        WHERE to_tsvector('english', code || ' ' || description) @@ plainto_tsquery('english', $1)
        ${version ? "AND version = $2" : ""}
        ORDER BY rank DESC, code ASC
        LIMIT $${version ? "3" : "2"} OFFSET $${version ? "4" : "3"}
      `;

      const params = version
        ? [query, version, limit, offset]
        : [query, limit, offset];
      results = await prisma.$queryRawUnsafe(searchQuery, ...params);
    } else {
      // Fallback to simple contains search for short queries
      results = await prisma.iCDCode.findMany({
        where: whereClause,
        orderBy: {
          code: "asc",
        },
        skip: offset,
        take: limit,
      });
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      results,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      searchType,
    });
  } catch (error) {
    console.error("Error searching ICD codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
