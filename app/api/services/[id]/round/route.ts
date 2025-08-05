import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptPatientFields } from "@/utils/patientEncryption";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
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

    // Get the service with all related data
    const service = await prisma.service.findFirst({
      where: {
        id: parseInt(params.id),
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
    });

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Get the physician's preferred sections
    const preferredSections = await prisma.preferredSection.findMany({
      where: {
        physicianId: service.physicianId,
      },
      include: {
        section: true,
      },
    });

    if (preferredSections.length === 0) {
      return NextResponse.json(
        {
          error:
            "No preferred sections found for this physician. Please set up preferred sections before performing rounding.",
        },
        { status: 400 }
      );
    }

    // Get type 57 billing codes from the physician's preferred sections
    const type57Codes = await prisma.billingCode.findMany({
      where: {
        billing_record_type: 57,
        section: {
          id: {
            in: preferredSections.map((ps) => ps.sectionId),
          },
        },
      },
      include: {
        section: true,
      },
      orderBy: {
        code: "asc",
      },
    });

    if (type57Codes.length === 0) {
      return NextResponse.json(
        {
          error:
            "No type 57 billing codes found in the physician's preferred sections",
        },
        { status: 404 }
      );
    }

    const today = new Date();
    const serviceDate = new Date(service.serviceDate);
    const existingType57Codes = service.serviceCodes.filter(
      (code) => code.billingCode.billing_record_type === 57
    );

    // Get location values from existing service codes
    const existingServiceCode = service.serviceCodes.find(
      (code) => code.serviceLocation || code.locationOfService
    );
    const serviceLocation = existingServiceCode?.serviceLocation || "";
    const locationOfService = existingServiceCode?.locationOfService || "";

    let newServiceCodes: any[] = [];

    if (existingType57Codes.length === 0) {
      // No type 57 codes present, find the appropriate one based on service date
      let currentDate = new Date(serviceDate);
      let selectedCode = null;

      // Work forward from service date using day ranges to find the appropriate code for today
      for (const code of type57Codes) {
        if (code.day_range && code.day_range > 0) {
          const endDate = new Date(currentDate);
          endDate.setDate(endDate.getDate() + code.day_range - 1);

          // Check if today falls within this code's range
          if (today >= currentDate && today <= endDate) {
            selectedCode = code;
            break;
          }

          // Move to the next code's start date
          currentDate = new Date(endDate);
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }

      if (!selectedCode) {
        // If no code found, use the last one or the first one as fallback
        selectedCode = type57Codes[type57Codes.length - 1] || type57Codes[0];
      }

      // Create the new service code
      const newServiceCode = await prisma.serviceCodes.create({
        data: {
          serviceId: service.id,
          codeId: selectedCode.id,
          numberOfUnits: 1,
          serviceDate: today,
          serviceEndDate: null, // Type 57 codes don't have end dates initially
          serviceLocation: serviceLocation,
          locationOfService: locationOfService,
        },
        include: {
          billingCode: {
            include: {
              section: true,
            },
          },
        },
      });

      newServiceCodes.push(newServiceCode);
    } else {
      // Type 57 codes exist, check if we need to increase units or add new code
      for (const existingCode of existingType57Codes) {
        const billingCode = existingCode.billingCode;

        if (billingCode.day_range && billingCode.day_range > 0) {
          const startDate = new Date(existingCode.serviceDate!);
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + billingCode.day_range - 1);

          // Check if today is within the existing code's range
          if (today >= startDate && today <= endDate) {
            // Increase units if we haven't reached max_units
            if (
              billingCode.max_units &&
              existingCode.numberOfUnits < billingCode.max_units
            ) {
              await prisma.serviceCodes.update({
                where: { id: existingCode.id },
                data: {
                  numberOfUnits: existingCode.numberOfUnits + 1,
                },
              });
            }
          } else if (today > endDate) {
            // Today is beyond the existing code's range, find the next appropriate code
            let nextStartDate = new Date(endDate);
            nextStartDate.setDate(nextStartDate.getDate() + 1);

            let selectedCode = null;
            let currentDate = new Date(nextStartDate);

            for (const code of type57Codes) {
              if (code.day_range && code.day_range > 0) {
                const codeEndDate = new Date(currentDate);
                codeEndDate.setDate(codeEndDate.getDate() + code.day_range - 1);

                if (today >= currentDate && today <= codeEndDate) {
                  selectedCode = code;
                  break;
                }

                currentDate = new Date(codeEndDate);
                currentDate.setDate(currentDate.getDate() + 1);
              }
            }

            if (selectedCode) {
              const newServiceCode = await prisma.serviceCodes.create({
                data: {
                  serviceId: service.id,
                  codeId: selectedCode.id,
                  numberOfUnits: 1,
                  serviceDate: today,
                  serviceEndDate: null,
                  serviceLocation: serviceLocation,
                  locationOfService: locationOfService,
                },
                include: {
                  billingCode: {
                    include: {
                      section: true,
                    },
                  },
                },
              });

              newServiceCodes.push(newServiceCode);
            }
          }
        }
      }
    }

    // Fetch the updated service with all relations
    const updatedService = await prisma.service.findFirst({
      where: {
        id: parseInt(params.id),
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

    if (!updatedService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Decrypt patient data
    const decryptedService = {
      ...updatedService,
      patient: updatedService.patient
        ? {
            ...updatedService.patient,
            ...decryptPatientFields(
              {
                firstName: updatedService.patient.firstName || "",
                lastName: updatedService.patient.lastName || "",
                middleInitial: updatedService.patient.middleInitial || "",
                billingNumber: updatedService.patient.billingNumber || "",
                dateOfBirth: updatedService.patient.dateOfBirth || "",
              },
              updatedService.patient.physicianId || ""
            ),
          }
        : null,
    };

    return NextResponse.json({
      service: decryptedService,
      newServiceCodes,
      message: "Rounding completed successfully",
    });
  } catch (error) {
    console.error("Error performing rounding:", error);
    return NextResponse.json(
      { error: "Failed to perform rounding" },
      { status: 500 }
    );
  }
}
