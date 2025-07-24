import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptPatientFields } from "@/utils/patientEncryption";
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
      physicianId,
      patientId,
      serviceDate,
      healthInstitutionId,
      referringPhysicianId,
      icdCodeId,
      summary,
      billingCodes,
      serviceLocation,
      locationOfService,
      serviceStatus,
    } = data;

    // Validate required fields
    if (!physicianId || !patientId || !serviceDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate billing codes
    if (!billingCodes || billingCodes.length === 0) {
      return NextResponse.json(
        { error: "At least one billing code is required" },
        { status: 400 }
      );
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
          : new Date(serviceDate),
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
            id: patientId,
          },
        },
        serviceDate: new Date(serviceDate),
        summary: summary || "",
        healthInstitution: healthInstitutionId
          ? {
              connect: {
                id: healthInstitutionId,
              },
            }
          : undefined,
        status: (() => {
          if (!serviceStatus) return ServiceStatus.OPEN;
          switch (serviceStatus) {
            case "OPEN":
              return ServiceStatus.OPEN;
            case "PENDING":
              return ServiceStatus.PENDING;
            case "SENT":
              return ServiceStatus.SENT;
            default:
              return ServiceStatus.OPEN;
          }
        })(),
        referringPhysician: referringPhysicianId
          ? {
              connect: {
                id: referringPhysicianId,
              },
            }
          : undefined,
        icdCode: icdCodeId
          ? {
              connect: {
                id: icdCodeId,
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
        icdCode: true,
        serviceCodes: {
          include: {
            billingCode: true,
          },
        },
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error("Error creating service:", error);

    // Provide more detailed error information
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to create service: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
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

    const services = await prisma.service.findMany({
      where: {
        patient: {
          physician: {
            userId: parseInt(user.id),
          },
        },
      },
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
      orderBy: {
        serviceDate: "desc",
      },
    });

    // Decrypt patient data for each service
    const decryptedServices = services.map((service) => ({
      ...service,
      patient: service.patient
        ? {
            ...service.patient,
            ...decryptPatientFields(
              {
                firstName: service.patient.firstName || "",
                lastName: service.patient.lastName || "",
                middleInitial: service.patient.middleInitial || "",
                billingNumber: service.patient.billingNumber || "",
                dateOfBirth: service.patient.dateOfBirth || "",
              },
              service.patient.physicianId || ""
            ),
          }
        : null,
    }));

    return NextResponse.json(decryptedServices);
  } catch (error) {
    console.error("Error fetching services:", error);
    return NextResponse.json(
      { error: "Failed to fetch services" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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
      id,
      physicianId,
      patientId,
      serviceDate,
      healthInstitutionId,
      referringPhysicianId,
      icdCodeId,
      summary,
      serviceStatus,
      billingCodes,
      serviceLocation,
      locationOfService,
    } = data;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { error: "Service ID is required" },
        { status: 400 }
      );
    }

    // Check if service exists and belongs to the user's patients
    const existingService = await prisma.service.findFirst({
      where: {
        id: parseInt(id),
        patient: {
          physician: {
            userId: parseInt(user.id),
          },
        },
      },
    });

    if (!existingService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};

    if (physicianId !== undefined) {
      updateData.physician = { connect: { id: physicianId } };
    }

    if (patientId !== undefined) {
      updateData.patient = { connect: { id: patientId } };
    }

    if (serviceDate !== undefined) {
      updateData.serviceDate = new Date(serviceDate);
    }

    if (summary !== undefined) {
      updateData.summary = summary;
    }

    if (healthInstitutionId !== undefined) {
      updateData.healthInstitution = healthInstitutionId
        ? { connect: { id: healthInstitutionId } }
        : { disconnect: true };
    }

    if (referringPhysicianId !== undefined) {
      updateData.referringPhysician = referringPhysicianId
        ? { connect: { id: referringPhysicianId } }
        : { disconnect: true };
    }

    if (icdCodeId !== undefined) {
      updateData.icdCode = icdCodeId
        ? { connect: { id: icdCodeId } }
        : { disconnect: true };
    }

    if (serviceStatus !== undefined) {
      updateData.status = (() => {
        switch (serviceStatus) {
          case "OPEN":
            return ServiceStatus.OPEN;
          case "PENDING":
            return ServiceStatus.PENDING;
          case "SENT":
            return ServiceStatus.SENT;
          default:
            return ServiceStatus.OPEN;
        }
      })();
    }

    // Handle billing codes update if provided
    if (billingCodes !== undefined) {
      // First, delete all existing service codes for this service
      await prisma.serviceCodes.deleteMany({
        where: {
          serviceId: parseInt(id),
        },
      });

      // Then create new service codes
      if (billingCodes && billingCodes.length > 0) {
        const preparedBillingCodes = billingCodes.map((billingCode: any) => ({
          billingCode: {
            connect: {
              id: billingCode.codeId,
            },
          },
          serviceLocation: serviceLocation || "X",
          locationOfService: locationOfService || "1",
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
        }));

        updateData.serviceCodes = {
          create: preparedBillingCodes,
        };
      }
    }

    // Update the service
    const updatedService = await prisma.service.update({
      where: {
        id: parseInt(id),
      },
      data: updateData,
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
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}
