import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createSearchHash,
  decryptPatientFields,
} from "@/utils/patientEncryption";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || searchParams.get("q") || "";
    const searchField = searchParams.get("field") || "name"; // name, billingNumber

    if (!query.trim()) {
      return NextResponse.json({ patients: [] });
    }

    // Get the physician ID for the current user
    const physician = await prisma.physician.findFirst({
      where: {
        user: {
          id: parseInt(user.id),
        },
      },
    });

    if (!physician) {
      return NextResponse.json(
        { error: "Physician not found" },
        { status: 404 }
      );
    }

    // Create search hash for the query
    const searchHash = createSearchHash(query, physician.id);

    // Search patients based on the field
    let patients;
    if (searchField === "billingNumber") {
      patients = await prisma.patient.findMany({
        where: {
          physicianId: physician.id,
          billingNumber: {
            contains: searchHash,
            mode: "insensitive",
          },
        },
        include: {
          physician: true,
          jurisdiction: true,
        },
        take: 20,
      });
    } else {
      // Search by name (first name or last name)
      patients = await prisma.patient.findMany({
        where: {
          physicianId: physician.id,
          OR: [
            {
              firstName: {
                contains: searchHash,
                mode: "insensitive",
              },
            },
            {
              lastName: {
                contains: searchHash,
                mode: "insensitive",
              },
            },
          ],
        },
        include: {
          physician: true,
          jurisdiction: true,
        },
        take: 20,
      });
    }

    // Decrypt patient data for each patient
    const decryptedPatients = patients.map((patient) => {
      const decryptedData = decryptPatientFields(
        {
          firstName: patient.firstName,
          lastName: patient.lastName,
          middleInitial: patient.middleInitial,
          billingNumber: patient.billingNumber,
          dateOfBirth: patient.dateOfBirth,
        },
        patient.physicianId
      );

      return {
        ...patient,
        firstName: decryptedData.firstName,
        lastName: decryptedData.lastName,
        middleInitial: decryptedData.middleInitial,
        billingNumber: decryptedData.billingNumber,
        dateOfBirth: decryptedData.dateOfBirth,
      };
    });

    return NextResponse.json({ patients: decryptedPatients });
  } catch (error) {
    console.error("Error searching patients:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
