import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { code, title, description, sectionId } = body;

    if (!code || !title || !sectionId) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const billingCode = await prisma.billingCode.update({
      where: {
        id: parseInt(params.id),
      },
      data: {
        code,
        title,
        description,
        section: {
          connect: {
            id: parseInt(sectionId),
          },
        },
      },
      include: {
        section: {
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

    return NextResponse.json(billingCode);
  } catch (error) {
    console.error("Error updating billing code:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    await prisma.billingCode.delete({
      where: {
        id: parseInt(params.id),
      },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting billing code:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
