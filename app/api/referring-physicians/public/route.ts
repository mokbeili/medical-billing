import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    if (!search || search.length < 2) {
      const referringPhysicians = await prisma.referringPhysician.findMany({
        orderBy: {
          name: "asc",
        },
        take: 50, // Limit results when no search query
      });
      return NextResponse.json(referringPhysicians);
    }

    // Use full-text search for better performance and relevance
    const searchQuery = `
      SELECT 
        id,
        jurisdiction_id,
        code,
        name,
        location,
        specialty,
        physician_id,
        created_at,
        updated_at,
        ts_rank(to_tsvector('english', code || ' ' || name || ' ' || specialty || ' ' || location), plainto_tsquery('english', $1)) as rank
      FROM referring_physicians 
      WHERE to_tsvector('english', code || ' ' || name || ' ' || specialty || ' ' || location) @@ plainto_tsquery('english', $1)
      ORDER BY rank DESC, name ASC
      LIMIT 50
    `;

    const results = await prisma.$queryRawUnsafe(searchQuery, search);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching referring physicians:", error);
    return NextResponse.json(
      { error: "Failed to fetch referring physicians" },
      { status: 500 }
    );
  }
}
