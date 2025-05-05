import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");

  return NextResponse.json({ error }, { status: 400 });
}

export const dynamic = "force-dynamic";
