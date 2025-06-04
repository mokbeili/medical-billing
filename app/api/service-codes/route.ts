import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const {
      physicianId,
      patientId,
      summary,
      billingCodes,
      icdCodeId,
      serviceDate,
      serviceStartTime,
      serviceEndTime,
      referringPhysicianId,
      healthInstitutionId,
      numberOfUnits,
      serviceLocation,
      specialCircumstances,
      bilateralIndicator,
      claimType,
    } = body;

    // Validate required fields
    if (!physicianId || !patientId || !serviceDate || !serviceLocation) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get physician to determine jurisdiction
    const physician = await prisma.physician.findUnique({
      where: { id: physicianId },
      include: { jurisdiction: true },
    });

    if (!physician) {
      return new NextResponse("Physician not found", { status: 404 });
    }

    // Create service codes
    const serviceCodes = await Promise.all(
      billingCodes.map(async (code: { codeId: number }) => {
        return prisma.serviceCode.create({
          data: {
            code: {
              connect: {
                id: code.codeId,
              },
            },
            patient: {
              connect: {
                id: patientId,
              },
            },
            icdCode: icdCodeId
              ? {
                  connect: {
                    id: icdCodeId,
                  },
                }
              : undefined,
            referringPhysician: referringPhysicianId
              ? {
                  connect: {
                    id: referringPhysicianId,
                  },
                }
              : undefined,
            healthInstitution: healthInstitutionId
              ? {
                  connect: {
                    id: healthInstitutionId,
                  },
                }
              : undefined,
            status: "PENDING",
            serviceDate: new Date(serviceDate),
            serviceStartTime: serviceStartTime
              ? new Date(serviceStartTime)
              : null,
            serviceEndTime: serviceEndTime ? new Date(serviceEndTime) : null,
            summary,
            numberOfUnits,
            serviceLocation,
            specialCircumstances,
            bilateralIndicator,
            claimType,
          },
          include: {
            code: {
              include: {
                section: true,
              },
            },
            patient: true,
            icdCode: true,
            referringPhysician: true,
            healthInstitution: true,
          },
        });
      })
    );

    return NextResponse.json(serviceCodes);
  } catch (error) {
    console.error("Error creating service codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const serviceCodes = await prisma.serviceCode.findMany({
      where: {
        patient: {
          physician: {
            user: {
              id: parseInt(session.user.id),
            },
          },
        },
      },
      include: {
        code: {
          include: {
            section: true,
          },
        },
        patient: true,
        icdCode: true,
        referringPhysician: true,
        healthInstitution: true,
        claim: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(serviceCodes);
  } catch (error) {
    console.error("Error fetching service codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
