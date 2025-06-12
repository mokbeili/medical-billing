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
      specialCircumstances,
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
        physicianId,
        patientId,
        serviceDate: new Date(serviceDate),
        serviceLocation,
        specialCircumstances,
        healthInstitutionId,
        status: ClaimStatus.PENDING,
        referringPhysicianId,
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
