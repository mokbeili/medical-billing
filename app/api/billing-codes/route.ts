import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");
    const jurisdiction = searchParams.get("jurisdiction");
    const title = searchParams.get("title");
    const code = searchParams.get("code");
    const sectionCode = searchParams.get("sectionCode");
    const sectionTitle = searchParams.get("sectionTitle");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;
    const sortBy = searchParams.get("sortBy")?.split(",") || ["code"];
    const sortOrder = searchParams.get("sortOrder")?.split(",") || ["asc"];

    const where: any = {};
    if (provider) {
      where.section = {
        jurisdiction: {
          provider: {
            name: {
              contains: provider,
              mode: "insensitive",
            },
          },
        },
      };
    }
    if (jurisdiction) {
      where.section = {
        ...where.section,
        jurisdiction: {
          ...where.section?.jurisdiction,
          OR: [
            { country: { contains: jurisdiction, mode: "insensitive" } },
            { region: { contains: jurisdiction, mode: "insensitive" } },
          ],
        },
      };
    }
    if (title) {
      where.title = {
        contains: title,
        mode: "insensitive",
      };
    }
    if (code) {
      where.code = {
        contains: code,
        mode: "insensitive",
      };
    }
    if (sectionCode || sectionTitle) {
      where.section = {
        ...where.section,
        AND: [
          sectionCode
            ? {
                code: {
                  contains: sectionCode,
                  mode: "insensitive",
                },
              }
            : {},
          sectionTitle
            ? {
                title: {
                  contains: sectionTitle,
                  mode: "insensitive",
                },
              }
            : {},
        ],
      };
    }

    const [billingCodes, total] = await Promise.all([
      prisma.billingCode.findMany({
        where,
        include: {
          section: {
            include: {
              jurisdiction: {
                include: {
                  provider: true,
                },
              },
            },
          },
        },
        orderBy: [
          {
            section: {
              code: sortOrder[0] as Prisma.SortOrder,
            },
          },
          {
            code: sortOrder[1] as Prisma.SortOrder,
          },
        ],
        skip,
        take: limit,
      }),
      prisma.billingCode.count({ where }),
    ]);

    return NextResponse.json({
      data: billingCodes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching billing codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { code, title, description, sectionId } = body;

    if (!code || !title || !sectionId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const billingCode = await prisma.billingCode.create({
      data: {
        code,
        title,
        description,
        section_id: sectionId,
        openai_embedding: "", // This will be populated by a background job
      },
      include: {
        section: {
          include: {
            jurisdiction: {
              include: {
                provider: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(billingCode);
  } catch (error) {
    console.error("Error creating billing code:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
