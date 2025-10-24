import { authOptions } from "@/lib/auth";
import { combineDateAndTimeInTimezone } from "@/lib/dateUtils";
import { prisma } from "@/lib/prisma";
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

    const body = await request.json();

    // Handle both array and object formats
    const serviceCodesToCreate = Array.isArray(body) ? body : body.billingCodes;

    if (
      !serviceCodesToCreate ||
      !Array.isArray(serviceCodesToCreate) ||
      serviceCodesToCreate.length === 0
    ) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Helper function to get service location from city
    const getServiceLocationFromCity = (city: string): string => {
      const cityLower = city.toLowerCase();
      if (cityLower.includes("saskatoon")) {
        return "S";
      } else if (cityLower.includes("regina")) {
        return "R";
      } else {
        return "X"; // Rural/Northern Premium for other cities
      }
    };

    // Helper function to get default serviceLocation and locationOfService for a service
    const getDefaultServiceLocationAndLocationOfService = async (
      serviceId: string
    ) => {
      // First, try to get existing service codes from the same service
      const existingServiceCodes = await prisma.serviceCodes.findMany({
        where: { serviceId: parseInt(serviceId) },
        select: { serviceLocation: true, locationOfService: true },
        take: 1,
      });

      if (existingServiceCodes.length > 0) {
        // Rule 1: Default to existing service codes in the service
        return {
          serviceLocation: existingServiceCodes[0].serviceLocation,
          locationOfService: existingServiceCodes[0].locationOfService,
        };
      }

      // Rule 2a: Use physician's clinic city for serviceLocation
      const service = await prisma.service.findUnique({
        where: { id: parseInt(serviceId) },
        include: {
          physician: {
            include: {
              healthInstitution: true,
            },
          },
        },
      });

      if (!service) {
        throw new Error(`Service ${serviceId} not found`);
      }

      let serviceLocation = "X"; // Default to Rural/Northern
      if (service.physician.healthInstitution?.city) {
        serviceLocation = getServiceLocationFromCity(
          service.physician.healthInstitution.city
        );
      }

      // Rule 2b: Use physician's last service locationOfService, or default to '2' Hospital In-Patient
      const lastService = await prisma.service.findFirst({
        where: {
          physicianId: service.physicianId,
          id: { not: parseInt(serviceId) }, // Exclude current service
        },
        include: {
          serviceCodes: {
            select: { locationOfService: true },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      let locationOfService = "2"; // Default to Hospital In-Patient
      if (
        lastService &&
        lastService.serviceCodes &&
        lastService.serviceCodes.length > 0
      ) {
        locationOfService = lastService.serviceCodes[0].locationOfService;
      }

      return { serviceLocation, locationOfService };
    };

    // Create service codes
    const serviceCodes = await Promise.all(
      serviceCodesToCreate.map(async (code) => {
        const billingCode = await prisma.billingCode.findUnique({
          where: { id: code.codeId },
          select: { code: true },
        });

        if (!billingCode) {
          throw new Error(`Billing code ${code.codeId} not found`);
        }

        // Get default serviceLocation and locationOfService according to the rules
        const defaults = await getDefaultServiceLocationAndLocationOfService(
          code.serviceId
        );

        // Get the physician's timezone from the service
        const service = await prisma.service.findUnique({
          where: { id: code.serviceId },
          include: {
            physician: {
              select: { timezone: true },
            },
          },
        });

        if (!service) {
          throw new Error(`Service ${code.serviceId} not found`);
        }

        const physicianTimezone = service.physician.timezone;

        // Use serviceDate for combining with time
        // Extract just the date part (YYYY-MM-DD) for combining with time
        let dateStr: string;
        if (code.serviceDate) {
          if (typeof code.serviceDate === "string") {
            // Extract YYYY-MM-DD from the string
            dateStr = code.serviceDate.split("T")[0];
          } else {
            // Convert Date to YYYY-MM-DD
            const d = code.serviceDate;
            dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(d.getDate()).padStart(2, "0")}`;
          }
        } else {
          // Default to today in the physician's timezone
          const now = new Date();
          const formatter = new Intl.DateTimeFormat("en-CA", {
            timeZone: physicianTimezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          });
          const parts = formatter.formatToParts(now);
          const year = parts.find((p) => p.type === "year")?.value || "";
          const month = parts.find((p) => p.type === "month")?.value || "";
          const day = parts.find((p) => p.type === "day")?.value || "";
          dateStr = `${year}-${month}-${day}`;
        }

        return prisma.serviceCodes.create({
          data: {
            service: {
              connect: {
                id: code.serviceId,
              },
            },
            billingCode: {
              connect: {
                id: code.codeId,
              },
            },
            serviceStartTime: combineDateAndTimeInTimezone(
              dateStr,
              code.serviceStartTime,
              physicianTimezone
            ),
            serviceEndTime: combineDateAndTimeInTimezone(
              dateStr,
              code.serviceEndTime,
              physicianTimezone
            ),
            serviceDate: code.serviceDate ? new Date(code.serviceDate) : null,
            serviceEndDate: code.serviceEndDate
              ? new Date(code.serviceEndDate)
              : null,
            bilateralIndicator: code.bilateralIndicator,
            numberOfUnits: code.numberOfUnits || 1,
            specialCircumstances: code.specialCircumstances,
            serviceLocation: code.serviceLocation || defaults.serviceLocation,
            locationOfService:
              code.locationOfService || defaults.locationOfService,
          },
          include: {
            service: true,
            billingCode: {
              include: {
                section: true,
              },
            },
          },
        });
      })
    );

    return NextResponse.json(serviceCodes);
  } catch (error) {
    console.error("Error creating service codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
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
        return new NextResponse("Unauthorized", { status: 401 });
      }
      user = session.user;
    }

    const serviceCodes = await prisma.serviceCodes.findMany({
      where: {
        service: {
          patient: {
            physician: {
              user: {
                id: parseInt(user.id),
              },
            },
          },
        },
      },
      include: {
        service: {
          include: {
            patient: true,
            physician: true,
            icdCode: true,
            healthInstitution: true,
            referringPhysician: true,
          },
        },
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
      },
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json(serviceCodes);
  } catch (error) {
    console.error("Error fetching service codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
        return new NextResponse("Unauthorized", { status: 401 });
      }
      user = session.user;
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.get("ids");

    if (!ids) {
      return new NextResponse("Missing service code IDs", { status: 400 });
    }

    const serviceCodeIds = ids.split(",").map((id) => parseInt(id.trim()));

    if (serviceCodeIds.some(isNaN)) {
      return new NextResponse("Invalid service code IDs", { status: 400 });
    }

    // Verify that all service codes belong to the authenticated user
    const existingServiceCodes = await prisma.serviceCodes.findMany({
      where: {
        id: { in: serviceCodeIds },
        service: {
          patient: {
            physician: {
              user: {
                id: parseInt(user.id),
              },
            },
          },
        },
      },
      select: { id: true },
    });

    if (existingServiceCodes.length !== serviceCodeIds.length) {
      return new NextResponse("Some service codes not found or unauthorized", {
        status: 404,
      });
    }

    // Delete the service codes
    const deletedServiceCodes = await prisma.serviceCodes.deleteMany({
      where: {
        id: { in: serviceCodeIds },
      },
    });

    return NextResponse.json({
      message: `Successfully deleted ${deletedServiceCodes.count} service code(s)`,
      deletedCount: deletedServiceCodes.count,
    });
  } catch (error) {
    console.error("Error deleting service codes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
