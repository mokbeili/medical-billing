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
        services: {
          include: {
            serviceCodes: {
              include: {
                billingCode: true,
              },
            },
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

    const determinePrice = (service: any, serviceCode: any) => {
      // Access billing code through the relation
      const billingCode = serviceCode.billingCode;
      const hasTechnicalFee =
        billingCode.technical_fee !== null &&
        billingCode.technical_fee !== undefined;

      // Access patient and physician through the service relation
      const hasReferringPhysician = service.referringPhysician !== null;
      const specialCircumstances = serviceCode.specialCircumstances;
      const isSpecialist =
        service.patient?.physician?.referringPhysicians[0]?.specialty !==
        "General Practice";

      // Case 1: No technical fee
      if (!hasTechnicalFee) {
        // If referring physician is not null, choose high fee
        if (hasReferringPhysician || isSpecialist) {
          return billingCode.high_fee;
        }
        // Otherwise charge the low fee
        return billingCode.low_fee;
      }

      // Case 2: Has technical fee
      if (hasTechnicalFee) {
        switch (specialCircumstances) {
          case "CF":
            return billingCode.high_fee;
          case "PF":
            return billingCode.low_fee;
          case "TF":
            return billingCode.technical_fee;
          default:
            // Default to low fee if special circumstances is not recognized
            return billingCode.low_fee;
        }
      }

      // Fallback to low fee
      return billingCode.low_fee;
    };

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
                referringPhysicians: true,
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

    // First, collect all service records and sort them by service start time
    const allServiceRecords = services.flatMap((service) => {
      const hsn = service.patient?.billingNumber || "";
      const dob = service.patient?.dateOfBirth
        ? (() => {
            const date = new Date(service.patient.dateOfBirth);
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const year = String(date.getFullYear()).slice(-2);
            return month + year;
          })()
        : "";
      const sex = (service.patient?.sex || "M") as "M" | "F";
      const name = `${service.patient?.lastName || ""},${
        service.patient?.firstName || ""
      }`;
      const diagnosticCode = service.icdCode?.code || "";
      const refPractitioner = service.referringPhysician?.code;
      const dateOfService = (() => {
        const date = new Date(service.serviceDate);
        const day = String(date.getUTCDate()).padStart(2, "0");
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const year = String(date.getUTCFullYear()).slice(-2);
        return day + month + year;
      })();
      const location = "0"; // Default location since it's now in serviceCodes
      const facilityNumber = "00000";

      return service.serviceCodes
        .sort(
          (a, b) =>
            a.billingCode.billing_record_type -
            b.billingCode.billing_record_type
        )
        .map((serviceCode, serviceCodeIndex) => ({
          service,
          serviceCode,
          serviceCodeIndex,
          hsn,
          dob,
          sex,
          name,
          diagnosticCode,
          refPractitioner,
          dateOfService: serviceCode.serviceDate
            ? (() => {
                const date = new Date(serviceCode.serviceDate);
                const day = String(date.getUTCDate()).padStart(2, "0");
                const month = String(date.getUTCMonth() + 1).padStart(2, "0");
                const year = String(date.getUTCFullYear()).slice(-2);
                return day + month + year;
              })()
            : dateOfService,
          lastServiceDate: serviceCode.serviceEndDate
            ? (() => {
                const date = new Date(serviceCode.serviceEndDate);
                const day = String(date.getUTCDate()).padStart(2, "0");
                const month = String(date.getUTCMonth() + 1).padStart(2, "0");
                const year = String(date.getUTCFullYear()).slice(-2);
                return day + month + year;
              })()
            : undefined,
          units: String(
            serviceCode.numberOfUnits === undefined
              ? serviceCode.numberOfUnits
              : ""
          ),
          locationOfService: serviceCode.locationOfService || "0",
          feeCode: serviceCode.billingCode.code,
          feeCents:
            Math.round(determinePrice(service, serviceCode) * 100) *
            (serviceCode.numberOfUnits || 1),
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
          facilityNumber: facilityNumber,
          claimType: serviceCode.billingCode.billing_record_type.toString(),
          serviceLocation: serviceCode.serviceLocation,
          billingRecordType: String(
            serviceCode.billingCode.billing_record_type
          ) as "50" | "57",
          serviceStartTime: serviceCode.serviceStartTime
            ? new Date(serviceCode.serviceStartTime).getTime()
            : 0,
        }));
    });

    // Sort all service records by service start time
    allServiceRecords.sort((a, b) => {
      // Handle null/undefined service start times
      if (!a.serviceStartTime && !b.serviceStartTime) return 0;
      if (!a.serviceStartTime) return 1; // Place null values at the end
      if (!b.serviceStartTime) return -1; // Place null values at the end
      return a.serviceStartTime - b.serviceStartTime;
    });

    // Group service records by claim number based on limits
    const serviceRecords: any[] = [];
    let currentClaimNumber = baseClaimNumber;
    let type50Count = 0;
    let type57Count = 0;
    let sequence = 0;

    for (const record of allServiceRecords) {
      const recordType = record.billingRecordType;

      // Check if we need a new claim number
      if (
        (recordType === "50" && type50Count >= 6) ||
        (recordType === "57" && type57Count >= 2)
      ) {
        // Start a new claim
        currentClaimNumber++;
        type50Count = 0;
        type57Count = 0;
        sequence = 0;
      }

      // Add the record with the current claim number
      serviceRecords.push({
        claimNumber: currentClaimNumber,
        sequence,
        hsn: record.hsn,
        dob: record.dob,
        sex: record.sex,
        name: record.name,
        diagnosticCode: record.diagnosticCode,
        refPractitioner: record.refPractitioner,
        dateOfService: record.dateOfService,
        lastServiceDate: record.lastServiceDate,
        units: record.units,
        feeCode: record.feeCode,
        feeCents: record.feeCents,
        mode: record.mode,
        formType: record.formType,
        specialCircumstances: record.specialCircumstances,
        bilateral: record.bilateral,
        startTime: record.startTime,
        stopTime: record.stopTime,
        facilityNumber: record.facilityNumber,
        claimType: record.claimType,
        serviceLocation: record.serviceLocation,
        billingRecordType: record.billingRecordType,
        locationOfService: record.locationOfService,
      });

      // Update counters
      if (recordType === "50") {
        type50Count++;
      } else if (recordType === "57") {
        type57Count++;
      }
      sequence++;
    }

    const batchClaimText = generateClaimBatch(
      practitionerHeader,
      serviceRecords
    );

    // Update physician's most recent claim number
    const highestClaimNumber =
      serviceRecords.length > 0
        ? Math.max(...serviceRecords.map((record) => record.claimNumber))
        : baseClaimNumber - 1;

    await prisma.physician.update({
      where: { id: firstServiceCode.patient.physician.id },
      data: {
        mostRecentClaimNumber: highestClaimNumber,
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
