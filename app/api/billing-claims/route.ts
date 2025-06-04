import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateClaimBatch } from "@/utils/generateBatchClaim";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const claims = await prisma.billingClaim.findMany({
      where: {
        physician: {
          user: {
            id: parseInt(session.user.id),
          },
        },
      },
      include: {
        physician: true,
        jurisdiction: true,
        serviceCodes: {
          include: {
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(claims);
  } catch (error) {
    console.error("Error fetching billing claims:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { serviceCodeIds } = body;

    if (
      !serviceCodeIds ||
      !Array.isArray(serviceCodeIds) ||
      serviceCodeIds.length === 0
    ) {
      return new NextResponse("Missing or invalid service code IDs", {
        status: 400,
      });
    }

    // Get all service codes with their related data
    const serviceCodes = await prisma.serviceCode.findMany({
      where: {
        id: {
          in: serviceCodeIds,
        },
      },
      include: {
        patient: {
          include: {
            physician: {
              include: {
                jurisdiction: true,
              },
            },
          },
        },
        code: true,
        icdCode: true,
        referringPhysician: true,
        healthInstitution: true,
      },
    });

    if (serviceCodes.length === 0) {
      return new NextResponse("Service codes not found", { status: 404 });
    }

    // Get the first service code to determine physician and jurisdiction
    const firstServiceCode = serviceCodes[0];
    if (!firstServiceCode.patient?.physician) {
      return new NextResponse("Invalid service code data", { status: 400 });
    }

    // Get physician with health institution
    const physician = await prisma.physician.findUnique({
      where: { id: firstServiceCode.patient.physician.id },
      include: { healthInstitution: true },
    });

    if (!physician) {
      return new NextResponse("Physician not found", { status: 404 });
    }

    // Generate unique IDs
    const id = uuidv4();
    const friendlyId = `CLAIM-${Date.now()}`;

    // Generate batch claim text
    const practitionerHeader = {
      practitionerNumber: firstServiceCode.patient.physician.billingNumber,
      groupNumber: firstServiceCode.patient.physician.groupNumber || "000",
      clinicNumber: physician.healthInstitution?.number || "000",
      name: `${firstServiceCode.patient.physician.lastName},${firstServiceCode.patient.physician.firstName}`,
      address: firstServiceCode.patient.physician.streetAddress || "",
      cityProvince: `${firstServiceCode.patient.physician.city || ""},${
        firstServiceCode.patient.physician.province || ""
      }`,
      postalCode: firstServiceCode.patient.physician.postalCode || "",
      corporationIndicator: " ", // TODO: Add corporation indicator to physician model
    };

    const serviceRecords = serviceCodes.map((sc) => ({
      claimNumber: parseInt(friendlyId.split("-")[1]),
      sequence: serviceCodes.indexOf(sc) + 1,
      hsn: sc.patient?.billingNumber || "",
      dob: sc.patient?.dateOfBirth
        ? new Date(sc.patient.dateOfBirth)
            .toLocaleDateString("en-CA", { month: "2-digit", year: "2-digit" })
            .replace(/\//g, "")
        : "",
      sex: (sc.patient?.sex || "M") as "M" | "F",
      name: `${sc.patient?.lastName || ""},${sc.patient?.firstName || ""}`,
      diagnosticCode: sc.icdCode?.code || "",
      refPractitioner: sc.referringPhysician?.code,
      dateOfService: new Date(sc.serviceDate)
        .toLocaleDateString("en-CA", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })
        .replace(/\//g, ""),
      units: sc.numberOfUnits.toString(),
      location: sc.serviceLocation || "0",
      feeCode: sc.code.code,
      feeCents: Math.round(parseFloat(sc.code.referred_price || "0") * 100),
      mode: "1", // TODO: Add mode to service code model
      formType: "8" as const,
      specialCircumstances: sc.specialCircumstances || undefined,
      bilateral: sc.bilateralIndicator as "L" | "R" | "B" | undefined,
      startTime: sc.serviceStartTime
        ? new Date(sc.serviceStartTime)
            .toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            })
            .replace(/:/g, "")
        : undefined,
      stopTime: sc.serviceEndTime
        ? new Date(sc.serviceEndTime)
            .toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
            })
            .replace(/:/g, "")
        : undefined,
      facilityNumber: sc.healthInstitution?.id.toString(),
      claimType: sc.claimType || undefined,
      serviceLocation: sc.serviceLocation,
    }));

    const batchClaimText = generateClaimBatch(
      practitionerHeader,
      serviceRecords
    );

    // Create the billing claim
    const claim = await prisma.billingClaim.create({
      data: {
        id,
        friendlyId,
        physicianId: firstServiceCode.patient.physician.id,
        jurisdictionId: firstServiceCode.patient.physician.jurisdiction.id,
        batchClaimText,
        serviceCodes: {
          connect: serviceCodeIds.map((id) => ({ id })),
        },
      },
      include: {
        physician: true,
        jurisdiction: true,
        serviceCodes: {
          include: {
            code: true,
            patient: true,
          },
        },
      },
    });

    return NextResponse.json(claim);
  } catch (error) {
    console.error("Error creating billing claim:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
