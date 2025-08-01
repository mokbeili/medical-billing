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

    // Handle both array and object formats
    const serviceCodesToCreate = Array.isArray(body) ? body : body.billingCodes;

    if (
      !serviceCodesToCreate ||
      !Array.isArray(serviceCodesToCreate) ||
      serviceCodesToCreate.length === 0
    ) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Create service codes
    const serviceCodes = await Promise.all(
      serviceCodesToCreate.map(async (code) => {
        const billingCode = await prisma.billingCode.findUnique({
          where: { id: code.codeId },
          select: { code: true },
        });

        if (!billingCode) {
          throw new Error(`Billing code ${code.codeId} not found`);
        }

        return prisma.serviceCodes.create({
          data: {
            serviceId: code.serviceId,
            codeId: code.codeId,
            serviceStartTime: code.serviceStartTime
              ? new Date(code.serviceStartTime)
              : null,
            serviceEndTime: code.serviceEndTime
              ? new Date(code.serviceEndTime)
              : null,
            serviceDate: code.serviceDate ? new Date(code.serviceDate) : null,
            serviceEndDate: code.serviceEndDate
              ? new Date(code.serviceEndDate)
              : null,
            bilateralIndicator: code.bilateralIndicator,
            numberOfUnits: code.numberOfUnits || 1,
            specialCircumstances: code.specialCircumstances,
            serviceLocation: code.serviceLocation,
            locationOfService: code.locationOfService,
          },
          include: {
            service: true,
            billingCode: {
              include: {
                section: true,
              },
            },
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

    const serviceCodes = await prisma.serviceCodes.findMany({
      where: {
        service: {
          patient: {
            physician: {
              user: {
                id: parseInt(session.user.id),
              },
            },
          },
        },
      },
      include: {
        service: {
          include: {
            patient: true,
            physician: true,
            icdCode: true,
            healthInstitution: true,
            referringPhysician: true,
          },
        },
        billingCode: {
          include: {
            section: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json(serviceCodes);
  } catch (error) {
    console.error("Error fetching service codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids) {
      return new NextResponse("Missing service code IDs", { status: 400 });
    }

    const serviceCodeIds = ids.split(",").map((id) => parseInt(id.trim()));

    if (serviceCodeIds.some(isNaN)) {
      return new NextResponse("Invalid service code IDs", { status: 400 });
    }

    // Verify that all service codes belong to the authenticated user
    const existingServiceCodes = await prisma.serviceCodes.findMany({
      where: {
        id: { in: serviceCodeIds },
        service: {
          patient: {
            physician: {
              user: {
                id: parseInt(session.user.id),
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (existingServiceCodes.length !== serviceCodeIds.length) {
      return new NextResponse("Some service codes not found or unauthorized", {
        status: 404,
      });
    }

    // Delete the service codes
    const deletedServiceCodes = await prisma.serviceCodes.deleteMany({
      where: {
        id: { in: serviceCodeIds },
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${deletedServiceCodes.count} service code(s)`,
      deletedCount: deletedServiceCodes.count,
    });
  } catch (error) {
    console.error("Error deleting service codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
