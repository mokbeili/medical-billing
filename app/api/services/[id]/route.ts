import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptPatientFields } from "@/utils/patientEncryption";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = await prisma.service.findFirst({
      where: {
        id: parseInt(params.id),
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
