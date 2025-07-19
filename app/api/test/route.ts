import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Mobile app connection successful",
    timestamp: new Date().toISOString(),
  });
}
