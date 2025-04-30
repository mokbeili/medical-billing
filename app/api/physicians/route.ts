import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
    };

    const physicians = await prisma.physician.findMany({
      where: {
        user: {
          id: decoded.userId,
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        middleInitial: true,
        billingNumber: true,
      },
      orderBy: {
        lastName: "asc",
      },
    });

    return NextResponse.json(physicians);
  } catch (error) {
    console.error("Error fetching physicians:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
