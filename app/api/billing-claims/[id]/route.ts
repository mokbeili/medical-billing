import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServiceStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const claim = await prisma.billingClaim.findUnique({
      where: {
        id: id,
        physician: {
          user: {
            id: parseInt(session.user.id),
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

    if (!claim) {
      return new NextResponse("Claim not found", { status: 404 });
    }

    return NextResponse.json(claim);
  } catch (error) {
    console.error("Error fetching billing claim:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Find the claim and check if it has any PENDING services
    const claim = await prisma.billingClaim.findUnique({
      where: {
        id: id,
        physician: {
          user: {
            id: parseInt(session.user.id),
          },
        },
      },
      include: {
        services: true,
      },
    });

    if (!claim) {
      return new NextResponse("Claim not found", { status: 404 });
    }

    // Check if all services are PENDING
    const hasNonPendingServices = claim.services.some(
      (service) => service.status !== ServiceStatus.PENDING
    );

    if (hasNonPendingServices) {
      return new NextResponse("Cannot delete claim with non-PENDING services", {
        status: 400,
      });
    }

    // Delete the claim and its associated services
    await prisma.billingClaim.delete({
      where: {
        id: id,
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting billing claim:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
