import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptPatientFields } from "@/utils/patientEncryption";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
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
        patient: true,
        healthInstitution: true,
        physician: true,
        referringPhysician: true,
        icdCode: true,
        serviceCodes: {
          include: {
            changeLogs: true,
            billingCode: {
              include: {
                section: true,
              },
            },
          },
        },
      },
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Decrypt patient data
    const decryptedService = {
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
    };

    return NextResponse.json(decryptedService);
  } catch (error) {
    console.error("Error fetching service:", error);
    return NextResponse.json(
      { error: "Failed to fetch service" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const data = await request.json();
    const {
      physicianId,
      patientId,
      serviceDate,
      healthInstitutionId,
      referringPhysicianId,
      icdCodeId,
      summary,
      serviceLocation,
      locationOfService,
      billingCodes,
      serviceStatus,
    } = data;

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

    // Update the service
    const updatedService = await prisma.service.update({
      where: {
        id: parseInt(id),
      },
      data: {
        status: serviceStatus,
        physician: physicianId ? { connect: { id: physicianId } } : undefined,
        patient: patientId ? { connect: { id: patientId } } : undefined,
        serviceDate: serviceDate ? new Date(serviceDate) : undefined,
        summary: summary || "",
        healthInstitution: healthInstitutionId
          ? { connect: { id: healthInstitutionId } }
          : undefined,
        referringPhysician: referringPhysicianId
          ? { connect: { id: referringPhysicianId } }
          : undefined,
        icdCode: icdCodeId ? { connect: { id: icdCodeId } } : undefined,
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
    });

    // Handle service codes if provided
    if (billingCodes && Array.isArray(billingCodes)) {
      // Get existing service codes to determine what to update/delete/create
      const existingServiceCodes = await prisma.serviceCodes.findMany({
        where: {
          serviceId: parseInt(id),
        },
      });

      console.log("=== Service Code Update Debug (ID route) ===");
      console.log(
        "Incoming billing codes:",
        JSON.stringify(
          billingCodes.map((bc: any) => ({ id: bc.id, codeId: bc.codeId })),
          null,
          2
        )
      );
      console.log(
        "Existing service codes:",
        existingServiceCodes.map((sc) => ({ id: sc.id, codeId: sc.codeId }))
      );

      // Build a map of existing service codes by their ID
      const existingCodesMap = new Map(
        existingServiceCodes.map((sc) => [sc.id, sc])
      );

      // Build a map of incoming billing codes by their ID (if they have one)
      const incomingCodesMap = new Map(
        billingCodes.filter((bc: any) => bc.id).map((bc: any) => [bc.id, bc])
      );

      console.log(
        "Codes to update (have ID):",
        Array.from(incomingCodesMap.keys())
      );
      console.log(
        "Codes to create (no ID):",
        billingCodes.filter((bc: any) => !bc.id).map((bc: any) => bc.codeId)
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
      for (const code of billingCodes) {
        const codeData = {
          serviceLocation: serviceLocation || "X",
          locationOfService: locationOfService || "1",
          serviceStartTime: code.serviceStartTime
            ? new Date(code.serviceStartTime)
            : null,
          serviceEndTime: code.serviceEndTime
            ? new Date(code.serviceEndTime)
            : null,
          numberOfUnits: code.numberOfUnits || 1,
          bilateralIndicator: code.bilateralIndicator || null,
          specialCircumstances: code.specialCircumstances || null,
          serviceDate: code.serviceDate ? new Date(code.serviceDate) : null,
          serviceEndDate: code.serviceEndDate
            ? new Date(code.serviceEndDate)
            : null,
        };

        if (code.id && existingCodesMap.has(code.id)) {
          // Update existing service code (preserves change logs)
          await prisma.serviceCodes.update({
            where: {
              id: code.id,
            },
            data: {
              ...codeData,
              codeId: code.codeId,
            },
          });
        } else {
          // Create new service code
          await prisma.serviceCodes.create({
            data: {
              ...codeData,
              serviceId: parseInt(id),
              codeId: code.codeId,
            },
          });
        }
      }
    }

    // Fetch the updated service with all relations
    const finalService = await prisma.service.findFirst({
      where: {
        id: parseInt(id),
      },
      include: {
        patient: true,
        healthInstitution: true,
        physician: true,
        referringPhysician: true,
        icdCode: true,
        serviceCodes: {
          include: {
            changeLogs: true,
            billingCode: {
              include: {
                section: true,
              },
            },
          },
        },
      },
    });

    if (!finalService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Decrypt patient data
    const decryptedService = {
      ...finalService,
      patient: finalService.patient
        ? {
            ...finalService.patient,
            ...decryptPatientFields(
              {
                firstName: finalService.patient.firstName || "",
                lastName: finalService.patient.lastName || "",
                middleInitial: finalService.patient.middleInitial || "",
                billingNumber: finalService.patient.billingNumber || "",
                dateOfBirth: finalService.patient.dateOfBirth || "",
              },
              finalService.patient.physicianId || ""
            ),
          }
        : null,
    };

    return NextResponse.json(decryptedService);
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Failed to update service" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Delete the service (this will cascade delete service codes)
    await prisma.service.delete({
      where: {
        id: parseInt(id),
      },
    });

    return NextResponse.json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Failed to delete service" },
      { status: 500 }
    );
  }
}
