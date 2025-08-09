import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check for mobile app authentication first
    const userHeader = request.headers.get("x-user");
    let user = null;

    if (userHeader) {
      try {
        user = JSON.parse(userHeader);
      } catch (error) {
        console.error("Error parsing user header:", error);
      }
    }

    // If no mobile user, try NextAuth session
    if (!user) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      user = session.user;
    }

    const { dischargeDate } = await request.json();

    if (!dischargeDate) {
      return NextResponse.json(
        { error: "Discharge date is required" },
        { status: 400 }
      );
    }

    // Get the service with all its service codes
    const service = await prisma.service.findFirst({
      where: {
        id: parseInt(params.id),
        patient: {
          physician: {
            userId: parseInt(user.id),
          },
        },
      },
      include: {
        serviceCodes: {
          include: {
            billingCode: true,
          },
          orderBy: {
            serviceDate: "desc",
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Find type 57 codes in the service
    const type57Codes = service.serviceCodes.filter(
      (code) => code.billingCode.billing_record_type === 57
    );

    // if (type57Codes.length === 0) {
    //   return NextResponse.json(
    //     { error: "No type 57 codes found in this service" },
    //     { status: 400 }
    //   );
    // }

    // Find the last type 57 code (the one with the latest service date)
    const lastType57Code = type57Codes[0]; // Already ordered by serviceDate desc

    // Update the end date of the last type 57 code
    if (lastType57Code) {
      await prisma.serviceCodes.update({
        where: { id: lastType57Code.id },
        data: {
          serviceEndDate: new Date(dischargeDate),
        },
      });
    }

    // Update the service status to PENDING
    await prisma.service.update({
      where: { id: parseInt(params.id) },
      data: {
        status: "PENDING",
      },
    });

    // Fetch the updated service with all relations
    const updatedService = await prisma.service.findUnique({
      where: { id: parseInt(params.id) },
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

    if (!updatedService) {
      return NextResponse.json(
        { error: "Failed to fetch updated service" },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedService);
  } catch (error) {
    console.error("Error discharging service:", error);
    return NextResponse.json(
      { error: "Failed to discharge service" },
      { status: 500 }
    );
  }
}
