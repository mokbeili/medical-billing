import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const claims = await prisma.billingClaim.findMany({
      where: {
        physician: {
          user: {
            id: parseInt(session.user.id),
          },
        },
      },
      include: {
        physician: true,
        jurisdiction: true,
        serviceCodes: {
          include: {
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(claims);
  } catch (error) {
    console.error("Error fetching billing claims:", error);
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
    const { serviceCodeIds } = body;

    if (
      !serviceCodeIds ||
      !Array.isArray(serviceCodeIds) ||
      serviceCodeIds.length === 0
    ) {
      return new NextResponse("Missing or invalid service code IDs", {
        status: 400,
      });
    }

    // Get the first service code to determine physician and jurisdiction
    const firstServiceCode = await prisma.serviceCode.findUnique({
      where: { id: serviceCodeIds[0] },
      include: {
        patient: {
          include: {
            physician: {
              include: {
                jurisdiction: true,
              },
            },
          },
        },
      },
    });

    if (!firstServiceCode) {
      return new NextResponse("Service code not found", { status: 404 });
    }

    // Generate unique IDs
    const id = uuidv4();
    const friendlyId = `CLAIM-${Date.now()}`;

    // Create the billing claim
    const claim = await prisma.billingClaim.create({
      data: {
        id,
        friendlyId,
        physicianId: firstServiceCode.patient.physician.id,
        jurisdictionId: firstServiceCode.patient.physician.jurisdiction.id,
        serviceCodes: {
          connect: serviceCodeIds.map((id) => ({ id })),
        },
      },
      include: {
        physician: true,
        jurisdiction: true,
        serviceCodes: {
          include: {
            code: true,
            patient: true,
          },
        },
      },
    });

    return NextResponse.json(claim);
  } catch (error) {
    console.error("Error creating billing claim:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
