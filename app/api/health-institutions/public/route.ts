import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    const clinicNumber = searchParams.get("clinicNumber");

    if (clinicNumber) {
      // Search by clinic number
      const institution = await prisma.healthInstitution.findFirst({
        where: {
          number: clinicNumber,
        },
      });
      return NextResponse.json(institution ? [institution] : []);
    }

    if (!query || query.length < 2) {
      const institutions = await prisma.healthInstitution.findMany({
        take: 10,
        orderBy: { name: "asc" },
      });
      return NextResponse.json(institutions);
    }

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
