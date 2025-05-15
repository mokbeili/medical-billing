import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const referringPhysicians = await prisma.referringPhysician.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
              { specialty: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(referringPhysicians);
  } catch (error) {
    console.error("Error fetching referring physicians:", error);
    return NextResponse.json(
      { error: "Failed to fetch referring physicians" },
      { status: 500 }
    );
  }
}
