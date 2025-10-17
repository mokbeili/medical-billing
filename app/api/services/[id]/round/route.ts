import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptPatientFields } from "@/utils/patientEncryption";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Parse request body to get service date
    let body: any = null;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body is required with serviceDate" },
        { status: 400 }
      );
    }

    const providedServiceDate: string | undefined = body?.serviceDate;
    if (!providedServiceDate) {
      return NextResponse.json(
        { error: "serviceDate is required in request body" },
        { status: 400 }
      );
    }

    const roundingDate = new Date(providedServiceDate);

    // 1. Get user from session (supporting both web and mobile authentication)
    const userHeader = request.headers.get("x-user");
    const userIdHeader = request.headers.get("x-user-id");
    const userEmailHeader = request.headers.get("x-user-email");
    const userRolesHeader = request.headers.get("x-user-roles");
    let user: any = null;

    if (userHeader) {
      try {
        user = JSON.parse(userHeader);
      } catch (error) {
        console.error("Error parsing user header:", error);
      }
    } else if (userIdHeader && userEmailHeader && userRolesHeader) {
      user = {
        id: userIdHeader,
        email: userEmailHeader,
        roles: userRolesHeader.split(","),
      };
    }

    if (!user) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      user = session.user;
    }

    // 2. Get the service and verify it belongs to the user's physician
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
        patient: {
          include: {
            physician: {
              include: {
                preferredSections: {
                  include: {
                    section: true,
                  },
                },
              },
            },
          },
        },
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

    // 3. Get the user's physician's preferred sections
    const preferredSections =
      service.patient?.physician?.preferredSections || [];

    if (preferredSections.length === 0) {
      return NextResponse.json(
        {
          error:
            "No preferred sections found for this physician. Please set up preferred sections before performing rounding.",
        },
        { status: 400 }
      );
    }

    const preferredSectionIds = preferredSections.map((ps) => ps.section.id);

    // 4. Get type 57 billing codes with their billing code chains from preferred sections
    const type57CodesWithChains = await prisma.$queryRaw<
      Array<{
        id: number;
        code: string;
        title: string;
        max_units: number | null;
        section_id: number;
        billingCodeChains: Array<{
          codeId: number;
          code: string;
          title: string;
          dayRange: number;
          rootId: number;
          previousCodeId: number | null;
          previousDayRange: number;
          cumulativeDayRange: number;
          prevPlusSelf: number;
          isLast: boolean;
        }>;
      }>
    >`
      SELECT 
        bc.id,
        bc.code,
        bc.title,
        bc.max_units,
        bc.section_id,
        bc.billing_unit_type,
        COALESCE(
          json_agg(
            jsonb_build_object(
              'codeId', bcc.code_id,
              'code', bcc.code,
              'title', bcc.title,
              'dayRange', bcc.day_range,
              'rootId', bcc.root_id,
              'previousCodeId', bcc.previous_code_id,
              'previousDayRange', bcc.previous_day_range,
              'cumulativeDayRange', bcc.cumulative_day_range,
              'prevPlusSelf', bcc.prev_plus_self,
              'isLast', bcc.is_last
            ) ORDER BY bcc.previous_day_range
          ) FILTER (WHERE bcc.code_id IS NOT NULL), '[]'::json
        ) as "billingCodeChains"
      FROM billing_codes bc
      LEFT JOIN billing_code_chain bcc ON bc.id = bcc.code_id
      WHERE 
        bc.billing_record_type = 57
        AND bc.section_id = ANY(ARRAY[${preferredSectionIds.join(
          ","
        )}]::integer[])
      GROUP BY bc.id, bc.code, bc.title, bc.max_units, bc.section_id
      ORDER BY bc.code ASC
    `;

    if (type57CodesWithChains.length === 0) {
      return NextResponse.json(
        {
          error:
            "No type 57 billing codes with chains found in the physician's preferred sections",
        },
        { status: 404 }
      );
    }

    // 4a. Calculate days since service start
    const serviceStartDate = new Date(service.serviceDate);
    const daysSinceStart = Math.floor(
      (roundingDate.getTime() - serviceStartDate.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    if (daysSinceStart < 0) {
      return NextResponse.json(
        {
          error: "Service date cannot be before the service start date",
        },
        { status: 400 }
      );
    }

    // 4b. Find the appropriate billing code based on day ranges
    let selectedBillingCode: {
      id: number;
      code: string;
      title: string;
      max_units: number | null;
      chain: {
        codeId: number;
        code: string;
        title: string;
        dayRange: number;
        rootId: number;
        previousCodeId: number | null;
        previousDayRange: number;
        cumulativeDayRange: number;
        prevPlusSelf: number;
        isLast: boolean;
      };
    } | null = null;

    for (const billingCode of type57CodesWithChains) {
      for (const chain of billingCode.billingCodeChains) {
        // Days should fall between previousDayRange (inclusive) and cumulativeDayRange (exclusive)
        if (
          daysSinceStart >= chain.previousDayRange &&
          daysSinceStart < chain.cumulativeDayRange
        ) {
          selectedBillingCode = {
            id: billingCode.id,
            code: billingCode.code,
            title: billingCode.title,
            max_units: billingCode.max_units,
            chain: chain,
          };
          break;
        }
      }
      if (selectedBillingCode) break;
    }

    if (!selectedBillingCode) {
      return NextResponse.json(
        {
          error: `No appropriate billing code found for ${daysSinceStart} days since service start`,
        },
        { status: 404 }
      );
    }

    // Get location values from the most recent existing service code
    const existingServiceCode = service.serviceCodes.sort((a, b) => {
      const dateA = a.serviceDate || new Date(0);
      const dateB = b.serviceDate || new Date(0);
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    })[0];
    const serviceLocation = existingServiceCode?.serviceLocation || "";
    const locationOfService = existingServiceCode?.locationOfService || "";

    // 4c. Check if service already has a service code with this billing code
    const existingServiceCodeForBillingCode = service.serviceCodes.find(
      (sc) => sc.codeId === selectedBillingCode!.id
    );

    let newServiceCodes: any[] = [];
    let updatedServiceCodes: any[] = [];

    if (existingServiceCodeForBillingCode) {
      // 4c. Service already has this billing code - increase units up to max
      const currentUnits = existingServiceCodeForBillingCode.numberOfUnits;
      const maxUnits = selectedBillingCode.max_units;

      if (maxUnits && currentUnits < maxUnits) {
        const previousUnits = currentUnits;
        const updatedCode = await prisma.serviceCodes.update({
          where: { id: existingServiceCodeForBillingCode.id },
          data: {
            numberOfUnits: currentUnits + 1,
          },
          include: {
            billingCode: {
              include: {
                section: true,
              },
            },
          },
        });

        // Create change log
        await prisma.serviceCodeChangeLog.create({
          data: {
            serviceCodeId: existingServiceCodeForBillingCode.id,
            changeType: "ROUND",
            previousData: JSON.stringify({
              numberOfUnits: previousUnits,
            }),
            newData: JSON.stringify({
              numberOfUnits: updatedCode.numberOfUnits,
            }),
            changedBy: parseInt(user.id),
            notes: "Units increased during rounding operation",
            roundingDate: roundingDate,
          },
        });

        updatedServiceCodes.push(updatedCode);
      } else {
        return NextResponse.json(
          {
            message: "Service code already at maximum units",
            service: service,
          },
          { status: 200 }
        );
      }
    } else {
      // 4d. Service does not have this billing code - insert new service code
      const serviceCodeStartDate = new Date(serviceStartDate);
      serviceCodeStartDate.setDate(
        serviceCodeStartDate.getDate() +
          selectedBillingCode.chain.previousDayRange
      );

      // Determine if we should set an end date
      // If real date today >= (service date + day_range from chain), set end date
      // But do not set the end date if it will be after today
      let serviceCodeEndDate: Date | null = null;
      const dayRangeEndDate = new Date(serviceStartDate);
      dayRangeEndDate.setUTCDate(
        dayRangeEndDate.getUTCDate() + selectedBillingCode.chain.dayRange
      );

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      dayRangeEndDate.setUTCHours(0, 0, 0, 0);

      if (today >= dayRangeEndDate) {
        // Calculate the end date: (service date + cumulativeDayRange - 1)
        const calculatedEndDate = new Date(serviceStartDate);
        calculatedEndDate.setUTCDate(
          calculatedEndDate.getUTCDate() +
            selectedBillingCode.chain.cumulativeDayRange -
            1
        );
        calculatedEndDate.setUTCHours(0, 0, 0, 0);

        // Only set end date if it's not after today
        if (calculatedEndDate <= today) {
          serviceCodeEndDate = calculatedEndDate;
        }
      }

      const newServiceCode = await prisma.serviceCodes.create({
        data: {
          serviceId: service.id,
          codeId: selectedBillingCode.id,
          numberOfUnits: 1,
          serviceDate: serviceCodeStartDate,
          serviceEndDate: serviceCodeEndDate,
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

      // Create change log
      await prisma.serviceCodeChangeLog.create({
        data: {
          serviceCodeId: newServiceCode.id,
          changeType: "ROUND",
          newData: JSON.stringify({
            codeId: selectedBillingCode.id,
            billingCode: selectedBillingCode.code,
            numberOfUnits: 1,
            serviceDate: serviceCodeStartDate,
            serviceEndDate: serviceCodeEndDate,
            serviceLocation,
            locationOfService,
          }),
          changedBy: parseInt(user.id),
          notes: `Service code created during rounding operation (${daysSinceStart} days since service start)`,
          roundingDate: roundingDate,
        },
      });

      newServiceCodes.push(newServiceCode);
    }

    // Fetch the updated service
    const updatedService = await prisma.service.findFirst({
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
      updatedServiceCodes,
      message: "Rounding completed successfully",
      debug: {
        daysSinceStart,
        selectedCode: selectedBillingCode.code,
        previousDayRange: selectedBillingCode.chain.previousDayRange,
        cumulativeDayRange: selectedBillingCode.chain.cumulativeDayRange,
      },
    });
  } catch (error) {
    console.error("Error performing rounding:", error);
    return NextResponse.json(
      { error: "Failed to perform rounding" },
      { status: 500 }
    );
  }
}
