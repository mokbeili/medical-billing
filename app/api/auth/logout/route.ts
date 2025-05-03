import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Not logged in" }, { status: 401 });
  }

  return NextResponse.json({ message: "Logged out successfully" });
}
