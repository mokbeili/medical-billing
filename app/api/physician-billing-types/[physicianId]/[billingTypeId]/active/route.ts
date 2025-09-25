import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  {
    params,
  }: { params: Promise<{ physicianId: string; billingTypeId: string }> }
) {
  try {
    const { physicianId, billingTypeId } = await params;

    // Check for mobile app authentication first
    const userHeader = request.headers.get("x-user");
    const userId = request.headers.get("x-user-id");
    const userEmail = request.headers.get("x-user-email");
    const userRoles = request.headers.get("x-user-roles");
    let user = null;

    if (userHeader) {
      try {
        user = JSON.parse(userHeader);
      } catch (error) {
        console.error("Error parsing user header:", error);
      }
    } else if (userId && userEmail && userRoles) {
      // Handle individual headers from mobile app
      user = {
        id: userId,
        email: userEmail,
        roles: userRoles.split(","),
      } as any;
    }

    // If no mobile user, try NextAuth session
    if (!user) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      user = session.user;
    }

    // Verify the physician belongs to the user
    const physician = await prisma.physician.findFirst({
      where: {
        id: physicianId,
        userId: parseInt(user.id),
      },
    });

    if (!physician) {
      return NextResponse.json(
        { error: "Physician not found" },
        { status: 404 }
      );
    }

    // First, set all billing types for this physician to inactive
    await prisma.physicianBillingType.updateMany({
      where: {
        physicianId: physicianId,
      },
      data: {
        active: false,
      },
    });

    // Then set the selected billing type to active
    const updatedBillingType = await prisma.physicianBillingType.updateMany({
      where: {
        physicianId: physicianId,
        id: parseInt(billingTypeId),
      },
      data: {
        active: true,
      },
    });

    if (updatedBillingType.count === 0) {
      return NextResponse.json(
        { error: "Billing type not found for this physician" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Billing type updated successfully",
      success: true,
    });
  } catch (error) {
    console.error("Error updating billing type:", error);
    return NextResponse.json(
      { error: "Failed to update billing type" },
      { status: 500 }
    );
  }
}
