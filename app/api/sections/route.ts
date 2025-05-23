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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const searchFields = searchParams.get("searchFields")?.split(",") || [
      "code",
      "title",
    ];

    const sections = await prisma.section.findMany({
      where: search
        ? {
            OR: searchFields.map((field) => ({
              [field]: {
                contains: search,
                mode: field === "code" ? "default" : "insensitive",
              },
            })),
          }
        : undefined,
      include: {
        jurisdiction: {
          include: {
            provider: true,
          },
        },
      },
      orderBy: [{ code: "asc" }, { title: "asc" }],
      take: 10,
    });

    return NextResponse.json(sections);
  } catch (error) {
    console.error("Error fetching sections:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
