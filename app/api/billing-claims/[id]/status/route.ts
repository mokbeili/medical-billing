import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { id } = params;
    const { status } = await request.json();

    if (
      !status ||
      !["PENDING", "SENT", "APPROVED", "REJECTED"].includes(status)
    ) {
      return new NextResponse("Invalid status", { status: 400 });
    }

    // Update all services in the claim to the new status
    const updatedClaim = await prisma.billingClaim.update({
      where: { id },
      data: {
        services: {
          updateMany: {
            where: {},
            data: { status },
          },
        },
      },
      include: {
        physician: true,
        jurisdiction: true,
        services: {
          include: {
            serviceCodes: {
              include: {
                billingCode: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(updatedClaim);
  } catch (error) {
    console.error("Error updating claim status:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
