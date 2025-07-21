import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  decryptPatientFields,
  encryptPatientFields,
} from "@/utils/patientEncryption";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

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

    const patients = await prisma.patient.findMany({
      where: {
        physician: {
          user: {
            id: parseInt(user.id),
          },
        },
      },
      include: {
        physician: true,
        jurisdiction: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

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

    return NextResponse.json(decryptedPatients);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const {
      firstName,
      lastName,
      middleInitial,
      billingNumber,
      physicianId,
      dateOfBirth,
      date_of_birth,
      sex,
    } = body;

    // Use either dateOfBirth or date_of_birth
    const dateOfBirthValue = dateOfBirth || date_of_birth;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !billingNumber ||
      !physicianId ||
      !dateOfBirthValue ||
      !sex
    ) {
      return NextResponse.json("Missing required fields", { status: 400 });
    }

    // Validate sex field
    if (sex !== "M" && sex !== "F") {
      return NextResponse.json("Sex must be either 'M' or 'F'", {
        status: 400,
      });
    }

    // Get physician to determine jurisdiction
    const physician = await prisma.physician.findUnique({
      where: { id: physicianId },
      include: { jurisdiction: true },
    });

    if (!physician) {
      return NextResponse.json("Physician not found", { status: 404 });
    }

    // Generate unique ID
    const id = uuidv4();

    // Encrypt patient data
    const encryptedData = encryptPatientFields(
      {
        firstName,
        lastName,
        middleInitial,
        billingNumber,
        dateOfBirth: dateOfBirthValue,
      },
      physicianId
    );

    // Create the patient with encrypted data
    const patient = await prisma.patient.create({
      data: {
        id,
        firstName: encryptedData.firstName || "",
        lastName: encryptedData.lastName || "",
        middleInitial: encryptedData.middleInitial,
        billingNumber: encryptedData.billingNumber || "",
        physicianId,
        dateOfBirth: encryptedData.dateOfBirth || "",
        sex,
        jurisdictionId: physician.jurisdictionId,
      },
      include: {
        physician: true,
        jurisdiction: true,
      },
    });

    // Return decrypted data for the response
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

    const responsePatient = {
      ...patient,
      firstName: decryptedData.firstName,
      lastName: decryptedData.lastName,
      middleInitial: decryptedData.middleInitial,
      billingNumber: decryptedData.billingNumber,
      dateOfBirth: decryptedData.dateOfBirth,
    };

    return NextResponse.json(responsePatient);
  } catch (error) {
    console.error("Error creating patient:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
