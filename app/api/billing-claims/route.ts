import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
        patient: true,
        jurisdiction: true,
        claimCodes: {
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
    const { physicianId, patientId, summary, billingCodes, icdCodeId } = body;

    // Validate required fields
    if (!physicianId || !patientId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    // Get physician to determine jurisdiction
    const physician = await prisma.physician.findUnique({
      where: { id: physicianId },
      include: { jurisdiction: true },
    });

    if (!physician) {
      return new NextResponse("Physician not found", { status: 404 });
    }

    // Generate unique IDs
    const id = uuidv4();
    const friendlyId = `CLAIM-${Date.now()}`;

    // Create the billing claim
    const claim = await prisma.billingClaim.create({
      data: {
        id,
        friendlyId,
        physicianId,
        patientId,
        jurisdictionId: physician.jurisdictionId,
        icdCodeId: icdCodeId || null,
        summary,
        openaiEmbedding: "", // This will be populated by a background job
        claimCodes: {
          create: billingCodes.map((code: { codeId: number }) => ({
            codeId: code.codeId,
            status: "PENDING",
          })),
        },
      },
      include: {
        physician: true,
        patient: true,
        jurisdiction: true,
        icdCode: true,
        claimCodes: {
          include: {
            code: true,
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
