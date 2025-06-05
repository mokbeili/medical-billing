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

    const changeLogs = await prisma.billingCodeChangeLog.findMany({
      where: {
        billing_code_id: parseInt(params.id),
      },
      orderBy: {
        changed_at: "desc",
      },
    });

    return NextResponse.json(changeLogs);
  } catch (error) {
    console.error("Error fetching billing code change log:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
