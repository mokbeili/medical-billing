import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateClaimBatch } from "@/utils/SK-MSB/generateBatchClaim";
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
    const { serviceIds } = body;

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return new NextResponse("Missing or invalid service code IDs", {
        status: 400,
      });
    }

    // Get all service codes with their related data
    const services = await prisma.service.findMany({
      where: {
        id: {
          in: serviceIds,
        },
        claimId: null,
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
        icdCode: true,
        referringPhysician: true,
        healthInstitution: true,
        serviceCodes: {
          include: {
            billingCode: true,
          },
        },
      },
    });

    if (services.length === 0) {
      return new NextResponse("Service codes not found", { status: 404 });
    }

    // Get the first service code to determine physician and jurisdiction
    const firstServiceCode = services[0];
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

    // This is Saskatchewan-specific
    let baseClaimNumber = physician
      ? physician.mostRecentClaimNumber + 1
      : 10000;

    const serviceRecords = services.flatMap((service, index) => {
      const claimNumber = baseClaimNumber + index;
      const hsn = service.patient?.billingNumber || "";
      const dob = service.patient?.dateOfBirth
        ? new Date(service.patient.dateOfBirth)
            .toLocaleDateString("en-CA", { month: "2-digit", year: "2-digit" })
            .replace(/\//g, "")
        : "";
      const sex = (service.patient?.sex || "M") as "M" | "F";
      const name = `${service.patient?.lastName || ""},${
        service.patient?.firstName || ""
      }`;
      const diagnosticCode = service.icdCode?.code || "";
      const refPractitioner = service.referringPhysician?.code;
      const dateOfService = new Date(service.serviceDate)
        .toLocaleDateString("en-CA", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })
        .replace(/\//g, "");
      const location = service.serviceLocation || "0";
      const facilityNumber = service.healthInstitution?.id.toString();
      const serviceLocation = service.serviceLocation;
      return service.serviceCodes
        .sort(
          (a, b) =>
            a.billingCode.billing_record_type -
            b.billingCode.billing_record_type
        )
        .flatMap((serviceCode, serviceCodeIndex) => ({
          claimNumber,
          sequence: serviceCodeIndex,
          hsn,
          dob,
          sex,
          name,
          diagnosticCode,
          refPractitioner,
          dateOfService,
          units: String(
            serviceCode.numberOfUnits === undefined
              ? serviceCode.numberOfUnits
              : ""
          ),
          location,
          feeCode: serviceCode.billingCode.code,
          feeCents: Math.round(
            parseFloat(serviceCode.billingCode.referred_price || "0") * 100
          ),
          mode: "1", // TODO: Add mode to service code model
          formType: "8" as const,
          specialCircumstances: serviceCode.specialCircumstances || undefined,
          bilateral: serviceCode.bilateralIndicator as
            | "L"
            | "R"
            | "B"
            | undefined,
          startTime: serviceCode.serviceStartTime
            ? new Date(serviceCode.serviceStartTime)
                .toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })
                .replace(/:/g, "")
            : undefined,
          stopTime: serviceCode.serviceEndTime
            ? new Date(serviceCode.serviceEndTime)
                .toLocaleTimeString("en-US", {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                })
                .replace(/:/g, "")
            : undefined,
          facilityNumber,
          claimType: serviceCode.billingCode.billing_record_type.toString(),
          serviceLocation,
        }));
    });

    const batchClaimText = generateClaimBatch(
      practitionerHeader,
      serviceRecords
    );

    // Update physician's most recent claim number
    await prisma.physician.update({
      where: { id: firstServiceCode.patient.physician.id },
      data: {
        mostRecentClaimNumber:
          physician.mostRecentClaimNumber + serviceRecords.length,
      },
    });

    // Create the billing claim
    const claim = await prisma.billingClaim.create({
      data: {
        id,
        friendlyId,
        physicianId: firstServiceCode.patient.physician.id,
        jurisdictionId: firstServiceCode.patient.physician.jurisdiction.id,
        batchClaimText,
        services: {
          connect: serviceIds.map((id) => ({ id })),
        },
      },
      include: {
        physician: true,
        jurisdiction: true,
        services: {
          include: {
            serviceCodes: {
              include: {
                billingCode: true,
              },
            },
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
