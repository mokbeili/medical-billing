import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  cookies().delete("auth_token");
  return NextResponse.json({ message: "Logged out successfully" });
}
