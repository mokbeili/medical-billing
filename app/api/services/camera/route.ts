import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ServiceStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
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

    const data = await request.json();
    const {
      billingNumber,
      firstName,
      lastName,
      middleInitial,
      dateOfBirth,
      gender,
      serviceDate,
      visitNumber,
      attendingPhysicianId,
      familyPhysicianId,
      physicianId,
      healthInstitutionId,
      summary,
      billingCodes,
      serviceLocation,
      locationOfService,
    } = data;

    // Validate required fields
    if (
      !billingNumber ||
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !gender ||
      !physicianId
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: billingNumber, firstName, lastName, dateOfBirth, gender, physicianId",
        },
        { status: 400 }
      );
    }

    // Find or create patient
    let patient = await prisma.patient.findFirst({
      where: {
        billingNumber: billingNumber,
        physician: {
          userId: parseInt(user.id),
        },
      },
    });

    if (!patient) {
      // Create new patient
      patient = await prisma.patient.create({
        data: {
          billingNumber: billingNumber,
          firstName: firstName,
          lastName: lastName,
          middleInitial: middleInitial || null,
          dateOfBirth: dateOfBirth,
          gender: gender,
          physician: {
            connect: {
              id: physicianId,
            },
          },
        },
      });
    }

    // Validate and prepare billing codes data
    const preparedBillingCodes =
      billingCodes?.map((billingCode: any) => ({
        billingCode: {
          connect: {
            id: billingCode.codeId,
          },
        },
        serviceLocation: serviceLocation || "X", // Default to Rural/Northern if not provided
        locationOfService: locationOfService || "1", // Default to Office if not provided
        serviceStartTime: billingCode.serviceStartTime
          ? new Date(billingCode.serviceStartTime)
          : null,
        serviceEndTime: billingCode.serviceEndTime
          ? new Date(billingCode.serviceEndTime)
          : null,
        numberOfUnits: billingCode.numberOfUnits || 1,
        bilateralIndicator: billingCode.bilateralIndicator || null,
        specialCircumstances: billingCode.specialCircumstances || null,
        serviceDate: billingCode.serviceDate
          ? new Date(billingCode.serviceDate)
          : new Date(serviceDate || new Date()),
        serviceEndDate: billingCode.serviceEndDate
          ? new Date(billingCode.serviceEndDate)
          : null,
      })) || [];

    // Create the service
    const service = await prisma.service.create({
      data: {
        physician: {
          connect: {
            id: physicianId,
          },
        },
        patient: {
          connect: {
            id: patient.id,
          },
        },
        serviceDate: serviceDate ? new Date(serviceDate) : new Date(),
        summary: summary || "",
        visitNumber: visitNumber || null,
        healthInstitution: healthInstitutionId
          ? {
              connect: {
                id: healthInstitutionId,
              },
            }
          : undefined,
        status: ServiceStatus.OPEN,
        attendingPhysician: attendingPhysicianId
          ? {
              connect: {
                id: attendingPhysicianId,
              },
            }
          : undefined,
        familyPhysician: familyPhysicianId
          ? {
              connect: {
                id: familyPhysicianId,
              },
            }
          : undefined,
        serviceCodes: {
          create: preparedBillingCodes,
        },
      },
      include: {
        patient: true,
        healthInstitution: true,
        attendingPhysician: true,
        familyPhysician: true,
        serviceCodes: {
          include: {
            billingCode: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      service,
      message: "Service created successfully from camera data",
    });
  } catch (error) {
    console.error("Error creating service from camera data:", error);

    // Provide more detailed error information
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: `Failed to create service from camera data: ${error.message}`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create service from camera data" },
      { status: 500 }
    );
  }
}
