import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ClaimStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const {
      physicianId,
      patientId,
      serviceDate,
      serviceLocation,
      healthInstitutionId,
      referringPhysicianId,
    } = data;

    // Validate required fields
    if (!physicianId || !patientId || !serviceDate) {
      return NextResponse.json({ error: "Error is Here" }, { status: 400 });
    }

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
        serviceLocation,
        healthInstitution: healthInstitutionId
          ? {
              connect: {
                id: healthInstitutionId,
              },
            }
          : undefined,
        status: ClaimStatus.PENDING,
        referringPhysician: referringPhysicianId
          ? {
              connect: {
                id: referringPhysicianId,
              },
            }
          : undefined,
      },
      include: {
        patient: true,
        healthInstitution: true,
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
    return NextResponse.json(
      { error: "Failed to create service" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const services = await prisma.service.findMany({
      where: {
        patient: {
          physician: {
            userId: parseInt(session.user.id),
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

    return NextResponse.json(services);
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const {
      id,
      physicianId,
      patientId,
      serviceDate,
      serviceLocation,
      healthInstitutionId,
      referringPhysicianId,
      status,
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
            userId: parseInt(session.user.id),
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

    if (serviceLocation !== undefined) {
      updateData.serviceLocation = serviceLocation;
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

    if (status !== undefined) {
      updateData.status = status;
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
