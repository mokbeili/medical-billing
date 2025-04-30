import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
    };

    const patients = await prisma.patient.findMany({
      where: {
        physician: {
          user: {
            id: decoded.userId,
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
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
    };

    const body = await request.json();
    const { firstName, lastName, middleInitial, billingNumber, physicianId } =
      body;

    // Validate required fields
    if (!firstName || !lastName || !billingNumber || !physicianId) {
      return NextResponse.json("Missing required fields", { status: 400 });
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
        jurisdictionId: physician.jurisdictionId,
      },
      include: {
        physician: true,
        jurisdiction: true,
      },
    });

    return NextResponse.json(patient);
  } catch (error) {
    console.error("Error creating patient:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
