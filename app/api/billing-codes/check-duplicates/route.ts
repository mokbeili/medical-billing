import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const title = searchParams.get("title");
    const excludeId = searchParams.get("excludeId");

    if (!code || !title) {
      return new NextResponse("Missing required parameters", { status: 400 });
    }

    // Check for duplicate code
    const existingCode = await prisma.billingCode.findFirst({
      where: {
        code,
        id: excludeId ? { not: parseInt(excludeId) } : undefined,
      },
    });

    if (existingCode) {
      return NextResponse.json({
        duplicate: true,
        message: "A billing code with this code already exists.",
      });
    }

    // Check for duplicate title
    const existingTitle = await prisma.billingCode.findFirst({
      where: {
        title,
        id: excludeId ? { not: parseInt(excludeId) } : undefined,
      },
    });

    if (existingTitle) {
      return NextResponse.json({
        duplicate: true,
        message: "A billing code with this title already exists.",
      });
    }

    return NextResponse.json({ duplicate: false });
  } catch (error) {
    console.error("Error checking for duplicates:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
