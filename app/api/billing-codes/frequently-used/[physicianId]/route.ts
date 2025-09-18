import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { physicianId: string } }
) {
  try {
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
      };
    }

    // If no mobile user, try NextAuth session
    if (!user) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      user = session.user;
    }

    const physicianId = params.physicianId;

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

    // Get frequently used billing codes for this physician
    const frequentlyUsedCodes = await prisma.frequentlyUsedCode.findMany({
      where: {
        physicianId: physicianId,
      },
      orderBy: {
        sortMetric: "desc",
      },
      take: 20, // Limit to top 20 most frequently used
      select: {
        billingCode: {
          select: {
            id: true,
            code: true,
            title: true,
            description: true,
            billing_record_type: true,
            fee_determinant: true,
            multiple_unit_indicator: true,
          },
        },
      },
    });

    // Transform the data to match the expected format
    const billingCodes = frequentlyUsedCodes.map((item) => ({
      id: item.billingCode.id,
      code: item.billingCode.code,
      title: item.billingCode.title,
      description: item.billingCode.description,
      billing_record_type: item.billingCode.billing_record_type,
      fee_determinant: item.billingCode.fee_determinant,
      multiple_unit_indicator: item.billingCode.multiple_unit_indicator,
    }));

    return NextResponse.json(billingCodes);
  } catch (error) {
    console.error("Error fetching frequently used billing codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch frequently used billing codes" },
      { status: 500 }
    );
  }
}
