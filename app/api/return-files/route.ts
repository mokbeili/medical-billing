import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/utils/encryption";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { fileType, fileContent, fileName } = data;

    // Validate required fields
    if (!fileType || !fileContent || !fileName) {
      return NextResponse.json(
        { error: "File type, content, and name are required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (fileType !== "DAILY" && fileType !== "BIWEEKLY") {
      return NextResponse.json(
        { error: "File type must be either DAILY or BIWEEKLY" },
        { status: 400 }
      );
    }

    // Get the current user's physician information
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      include: {
        physicians: {
          include: {
            jurisdiction: true,
          },
        },
      },
    });

    if (!user?.physicians.length) {
      return NextResponse.json(
        { error: "User is not associated with a physician" },
        { status: 400 }
      );
    }

    // Encrypt the file content
    const encryptedFileText = encrypt(fileContent);

    // Create the return file record
    const returnFile = await prisma.returnFile.create({
      data: {
        id: uuidv4(),
        fileName,
        physicianId: user.physicians[0].id,
        jurisdictionId: user.physicians[0].jurisdictionId,
        fileText: encryptedFileText,
        fileType,
      },
    });

    return NextResponse.json(
      {
        message: "File uploaded successfully",
        id: returnFile.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error uploading return file:", error);
    return NextResponse.json(
      { error: "Failed to upload return file" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user's physician information
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      include: {
        physicians: true,
        roles: true,
      },
    });

    if (
      !user?.physicians.length &&
      !user?.roles.some((r) => r.role === "ADMIN")
    ) {
      return NextResponse.json(
        { error: "User is not associated with a physician" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const physicianId = searchParams.get("physicianId");

    let whereClause: any = {};

    // If admin and physicianId provided, filter by that physician
    if (user?.roles.some((r) => r.role === "ADMIN") && physicianId) {
      whereClause.physicianId = physicianId;
    } else if (user?.physician) {
      // Non-admin users can only see their own files
      whereClause.physicianId = user.physician.id;
    }

    const returnFiles = await prisma.returnFile.findMany({
      where: whereClause,
      include: {
        physician: {
          select: {
            firstName: true,
            lastName: true,
            billingNumber: true,
          },
        },
        jurisdiction: {
          select: {
            country: true,
            region: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(returnFiles);
  } catch (error) {
    console.error("Error fetching return files:", error);
    return NextResponse.json(
      { error: "Failed to fetch return files" },
      { status: 500 }
    );
  }
}
