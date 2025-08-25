import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServiceStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { status } = await request.json();

    if (!status || !Object.values(ServiceStatus).includes(status)) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    // Check if service exists and belongs to the user's patients
    const existingService = await prisma.service.findFirst({
      where: {
        id: parseInt(id),
        patient: {
          physician: {
            userId: parseInt(session.user.id),
          },
        },
      },
    });

    if (!existingService) {
      return new NextResponse("Service not found", { status: 404 });
    }

    // Update the service status
    const updatedService = await prisma.service.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        patient: true,
        healthInstitution: true,
        physician: true,
        referringPhysician: true,
        icdCode: true,
        serviceCodes: {
          include: {
            billingCode: {
              include: {
                section: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedService);
  } catch (error) {
    console.error("Error updating service status:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
