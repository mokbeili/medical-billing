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
          previousCodes: {
            include: {
              previous_code: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  section: {
                    select: {
                      code: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
          nextCodes: {
            include: {
              next_code: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  section: {
                    select: {
                      code: true,
                      title: true,
                    },
                  },
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
    const {
      code,
      title,
      description,
      sectionId,
      serviceClass,
      anaesthesiaIndicator,
      lowFee,
      highFee,
      addOnIndicator,
      multipleUnitIndicator,
      feeDeterminant,
      submitAt100Percent,
      referringPractitionerRequired,
      startTimeRequired,
      stopTimeRequired,
      technicalFee,
      interpretationComponentPrice,
      technicalAndInterpretationComponentPrice,
      technicalComponentPrice,
      billingRecordType,
      maxUnits,
      dayRange,
      previousCodes,
      nextCodes,
    } = await request.json();

    // Create the billing code
    const billingCode = await prisma.billingCode.create({
      data: {
        code,
        title,
        description,
        section_id: sectionId,
        service_class: serviceClass,
        anaesthesia_indicator: anaesthesiaIndicator,
        low_fee: lowFee,
        high_fee: highFee,
        add_on_indicator: addOnIndicator,
        multiple_unit_indicator: multipleUnitIndicator,
        fee_determinant: feeDeterminant,
        submit_at_100_percent: submitAt100Percent,
        referring_practitioner_required: referringPractitionerRequired,
        start_time_required: startTimeRequired,
        stop_time_required: stopTimeRequired,
        technical_fee: technicalFee,
        billing_record_type: billingRecordType,
        max_units: maxUnits,
        day_range: dayRange,
        openai_embedding: "", // This will be updated by the background job
        ...(interpretationComponentPrice !== undefined && {
          interpretation_component_price: String(interpretationComponentPrice),
        }),
        ...(technicalAndInterpretationComponentPrice !== undefined && {
          technical_and_interpretation_component_price: String(
            technicalAndInterpretationComponentPrice
          ),
        }),
        ...(technicalComponentPrice !== undefined && {
          technical_component_price: String(technicalComponentPrice),
        }),
        // Create relationships with previous codes
        ...(previousCodes &&
          previousCodes.length > 0 && {
            previousCodes: {
              create: previousCodes.map((codeId: number) => ({
                previous_code_id: codeId,
              })),
            },
          }),
        // Create relationships with next codes
        ...(nextCodes &&
          nextCodes.length > 0 && {
            nextCodes: {
              create: nextCodes.map((codeId: number) => ({
                next_code_id: codeId,
              })),
            },
          }),
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
        previousCodes: {
          include: {
            previous_code: {
              select: {
                id: true,
                code: true,
                title: true,
                section: {
                  select: {
                    code: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
        nextCodes: {
          include: {
            next_code: {
              select: {
                id: true,
                code: true,
                title: true,
                section: {
                  select: {
                    code: true,
                    title: true,
                  },
                },
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
