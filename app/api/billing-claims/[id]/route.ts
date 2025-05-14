import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const claim = await prisma.billingClaim.findUnique({
      where: {
        id: params.id,
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
        icdCode: true,
        claimCodes: {
          include: {
            code: {
              include: {
                section: true,
              },
            },
          },
        },
      },
    });

    if (!claim) {
      return new NextResponse("Claim not found", { status: 404 });
    }

    return NextResponse.json(claim);
  } catch (error) {
    console.error("Error fetching billing claim:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
