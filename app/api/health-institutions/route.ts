import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";

    const institutions = await prisma.healthInstitution.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { city: { contains: query, mode: "insensitive" } },
          { state: { contains: query, mode: "insensitive" } },
        ],
      },
      take: 10,
      orderBy: { name: "asc" },
    });

    return NextResponse.json(institutions);
  } catch (error) {
    console.error("Error fetching health institutions:", error);
    return NextResponse.json(
      { error: "Failed to fetch health institutions" },
      { status: 500 }
    );
  }
}
