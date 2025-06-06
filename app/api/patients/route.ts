import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patients = await prisma.patient.findMany({
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
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(patients);
  } catch (error) {
    console.error("Error fetching patients:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Create the patient
    const patient = await prisma.patient.create({
      data: {
        id,
        firstName,
        lastName,
        middleInitial,
        billingNumber,
        physicianId,
        dateOfBirth: new Date(dateOfBirthValue),
        sex,
        jurisdictionId: physician.jurisdictionId,
      },
      include: {
        physician: true,
        jurisdiction: true,
      },
    });

    return NextResponse.json(patient);
  } catch (error) {
    console.log(error);
    console.error("Error creating patient:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
