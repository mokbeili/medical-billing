import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptBillingClaimData } from "@/utils/billingClaimEncryption";
import * as JSZip from "jszip";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Check if user has ADMIN role
    const user = await prisma.user.findUnique({
      where: { id: parseInt(session.user.id) },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!user || !user.roles.includes("ADMIN")) {
      return new NextResponse("Forbidden: Admin access required", {
        status: 403,
      });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const physicianId = searchParams.get("physicianId");

    let whereClause: any = {};
    if (physicianId) {
      whereClause.physicianId = physicianId;
    }

    const claims = await prisma.billingClaim.findMany({
      where: whereClause,
      include: {
        physician: true,
        jurisdiction: true,
        services: {
          include: {
            serviceCodes: {
              include: {
                billingCode: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (claims.length === 0) {
      return new NextResponse("No claims found", { status: 404 });
    }

    // Create a zip file with all claims
    const zip = new JSZip();

    claims.forEach((claim) => {
      const decryptedBatchClaimText = decryptBillingClaimData(
        claim.batchClaimText,
        claim.physicianId
      );

      if (decryptedBatchClaimText) {
        const fileName = `${claim.physician.groupNumber || "UNKNOWN"}_${
          claim.friendlyId
        }_${new Date(claim.createdAt).toISOString().split("T")[0]}.txt`;
        zip.file(fileName, decryptedBatchClaimText);
      }
    });

    // Generate the zip file
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Return the zip file
    return new NextResponse(zipBuffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": "attachment; filename=billing_claims.zip",
      },
    });
  } catch (error) {
    console.error("Error downloading all billing claims:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
