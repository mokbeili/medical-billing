import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Get the service with all its service codes and change logs
    const service = await prisma.service.findFirst({
      where: {
        id: parseInt(id),
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
            changeLogs: {
              where: {
                changeType: "ROUND",
                roundingDate: {
                  not: null,
                },
              },
              orderBy: {
                roundingDate: "desc",
              },
            },
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

    // Find the last type 57 code (the one with the latest service date)
    const lastType57Code = type57Codes[0]; // Already ordered by serviceDate desc

    // Update the end date of the last type 57 code if it exists
    if (lastType57Code) {
      // Find the last rounding date from all change logs in the service
      let lastRoundingDate: Date | null = null;

      for (const serviceCode of service.serviceCodes) {
        for (const changeLog of serviceCode.changeLogs) {
          if (changeLog.roundingDate) {
            if (
              !lastRoundingDate ||
              changeLog.roundingDate > lastRoundingDate
            ) {
              lastRoundingDate = changeLog.roundingDate;
            }
          }
        }
      }

      // If we found a rounding date, use it as the discharge date
      if (lastRoundingDate) {
        await prisma.serviceCodes.update({
          where: { id: lastType57Code.id },
          data: {
            serviceEndDate: lastRoundingDate,
          },
        });
      }
    }

    // Update the service status to PENDING
    await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        status: "PENDING",
      },
    });

    // Fetch the updated service with all relations
    const updatedService = await prisma.service.findUnique({
      where: { id: parseInt(id) },
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
