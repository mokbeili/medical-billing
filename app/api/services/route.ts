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
      serviceStatus,
      visitNumber,
      billingTypeId,
      attendingPhysicianId,
      familyPhysicianId,
    } = data;

    // Validate required fields
    if (!physicianId || !patientId || !serviceDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate billing codes
    // if (!billingCodes || billingCodes.length === 0) {
    //   return NextResponse.json(
    //     { error: "At least one billing code is required" },
    //     { status: 400 }
    //   );
    // }

    // Validate and prepare billing codes data
    const preparedBillingCodes =
      billingCodes?.map((billingCode: any) => ({
        billingCode: {
          connect: {
            id: billingCode.codeId,
          },
        },
        serviceLocation: serviceLocation || "X", // Default to Rural/Northern if not provided
        locationOfService: billingCode.locationOfService || "2", // Use individual code's location or default to Hospital In-Patient
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
        visitNumber: visitNumber || null,
        billingType: billingTypeId
          ? {
              connect: {
                id: billingTypeId,
              },
            }
          : undefined,
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
        attendingPhysician: true,
        familyPhysician: true,
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
        billingType: true,
        serviceCodes: {
          include: {
            billingCode: {
              include: {
                section: true,
                billingCodeChains: {
                  select: {
                    codeId: true,
                    code: true,
                    title: true,
                    dayRange: true,
                    rootId: true,
                    previousCodeId: true,
                    previousDayRange: true,
                    cumulativeDayRange: true,
                    prevPlusSelf: true,
                    isLast: true,
                  },
                  orderBy: {
                    cumulativeDayRange: "asc",
                  },
                },
              },
            },
            changeLogs: {
              orderBy: {
                changedAt: "desc",
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

    if (
      physicianId !== undefined &&
      physicianId !== null &&
      physicianId !== ""
    ) {
      // Validate that the physician exists
      const physicianIdStr = String(physicianId);
      const physicianExists = await prisma.physician.findUnique({
        where: { id: physicianIdStr },
      });

      if (!physicianExists) {
        return NextResponse.json(
          { error: "Physician not found" },
          { status: 400 }
        );
      }

      updateData.physician = { connect: { id: physicianIdStr } };
    }

    if (patientId !== undefined && patientId !== null && patientId !== "") {
      // Validate that the patient exists
      const patientIdStr = String(patientId);
      const patientExists = await prisma.patient.findUnique({
        where: { id: patientIdStr },
      });

      if (!patientExists) {
        return NextResponse.json(
          { error: "Patient not found" },
          { status: 400 }
        );
      }

      updateData.patient = { connect: { id: patientIdStr } };
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
      // Get existing service codes to determine what to update/delete/create
      const existingServiceCodes = await prisma.serviceCodes.findMany({
        where: {
          serviceId: parseInt(id),
        },
      });

      // Build a map of existing service codes by their ID
      const existingCodesMap = new Map(
        existingServiceCodes.map((sc) => [sc.id, sc])
      );

      // Build a map of incoming billing codes by their ID (if they have one)
      const incomingCodesMap = new Map(
        billingCodes.filter((bc: any) => bc.id).map((bc: any) => [bc.id, bc])
      );

      // Determine which service codes to delete (exist in DB but not in incoming)
      const codesToDelete = existingServiceCodes.filter(
        (sc) => !incomingCodesMap.has(sc.id)
      );

      // Delete service codes that are no longer present
      if (codesToDelete.length > 0) {
        await prisma.serviceCodes.deleteMany({
          where: {
            id: {
              in: codesToDelete.map((sc) => sc.id),
            },
          },
        });
      }

      // Process incoming billing codes
      for (const billingCode of billingCodes) {
        const codeData = {
          serviceLocation: serviceLocation || "X",
          locationOfService: billingCode.locationOfService || "2", // Use individual code's location or default to Hospital In-Patient
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
        };

        if (billingCode.id && existingCodesMap.has(billingCode.id)) {
          // Update existing service code
          await prisma.serviceCodes.update({
            where: {
              id: billingCode.id,
            },
            data: {
              ...codeData,
              codeId: billingCode.codeId,
            },
          });
        } else {
          // Create new service code
          await prisma.serviceCodes.create({
            data: {
              ...codeData,
              serviceId: parseInt(id),
              codeId: billingCode.codeId,
            },
          });
        }
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
                billingCodeChains: {
                  select: {
                    codeId: true,
                    code: true,
                    title: true,
                    dayRange: true,
                    rootId: true,
                    previousCodeId: true,
                    previousDayRange: true,
                    cumulativeDayRange: true,
                    prevPlusSelf: true,
                    isLast: true,
                  },
                  orderBy: {
                    cumulativeDayRange: "asc",
                  },
                },
              },
            },
            changeLogs: {
              orderBy: {
                changedAt: "desc",
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
