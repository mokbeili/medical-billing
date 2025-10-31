import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/utils/encryption";
import {
  parseBiweeklyReturnFile,
  parseDailyReturnFile,
  storeBiweeklyReturnFileRecords,
  storeDailyReturnFileRecords,
} from "@/utils/returnFileParser";
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
      },
    });

    if (!user?.physicians.length && !user?.roles.includes("ADMIN")) {
      return NextResponse.json(
        { error: "User is not associated with a physician" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const physicianId = searchParams.get("physicianId");

    let whereClause: any = {};

    // If admin and physicianId provided, filter by that physician
    if (user?.roles.includes("ADMIN") && physicianId) {
      whereClause.physicianId = physicianId;
    } else if (user?.physicians?.length) {
      // Non-admin users can only see their own files
      whereClause.physicianId = user.physicians[0].id;
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

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { returnFileId } = data;

    if (!returnFileId) {
      return NextResponse.json(
        { error: "Return file ID is required" },
        { status: 400 }
      );
    }

    // Get the return file
    const returnFile = await prisma.returnFile.findUnique({
      where: { id: returnFileId },
      include: {
        physician: {
          include: {
            jurisdiction: {
              include: {
                provider: true,
              },
            },
          },
        },
      },
    });

    if (!returnFile) {
      return NextResponse.json(
        { error: "Return file not found" },
        { status: 404 }
      );
    }

    // Check authorization - only the file owner or admin can process
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      include: {
        physicians: true,
      },
    });

    const isOwner = user?.physicians.some(
      (p) => p.id === returnFile.physicianId
    );
    const isAdmin = user?.roles.includes("ADMIN");

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized to process this file" },
        { status: 403 }
      );
    }

    // Decrypt the file content
    if (!returnFile.fileText) {
      return NextResponse.json(
        { error: "File content is empty" },
        { status: 400 }
      );
    }

    const decryptedContent = decrypt(returnFile.fileText);

    if (!decryptedContent) {
      return NextResponse.json(
        { error: "Failed to decrypt file content" },
        { status: 500 }
      );
    }

    // Parse the file based on type
    let result;
    if (returnFile.fileType === "BIWEEKLY") {
      const records = parseBiweeklyReturnFile(decryptedContent);
      result = await storeBiweeklyReturnFileRecords(
        records,
        returnFile.physicianId,
        returnFile.physician.jurisdiction.providerId
      );
    } else if (returnFile.fileType === "DAILY") {
      const records = parseDailyReturnFile(decryptedContent);
      result = await storeDailyReturnFileRecords(
        records,
        returnFile.physicianId,
        returnFile.physician.jurisdiction.providerId
      );
    } else {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    return NextResponse.json({
      message: "Return file processed successfully",
      result,
    });
  } catch (error) {
    console.error("Error processing return file:", error);
    return NextResponse.json(
      { error: "Failed to process return file", details: String(error) },
      { status: 500 }
    );
  }
}
