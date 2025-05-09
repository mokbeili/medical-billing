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
    const jurisdiction = searchParams.get("jurisdiction");
    const provider = searchParams.get("provider");

    const where: any = {};
    if (jurisdiction) {
      where.jurisdiction = {
        contains: jurisdiction,
        mode: "insensitive",
      };
    }
    if (provider) {
      where.provider = {
        contains: provider,
        mode: "insensitive",
      };
    }

    const prompts = await prisma.aIPrompt.findMany({
      where,
      orderBy: {
        jurisdiction: "asc",
      },
    });

    return NextResponse.json(prompts);
  } catch (error) {
    console.error("Error fetching AI prompts:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { jurisdiction, provider, promptTemplate } = body;

    if (!jurisdiction || !provider || !promptTemplate) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const prompt = await prisma.aIPrompt.create({
      data: {
        jurisdiction,
        provider,
        promptTemplate,
      },
    });

    return NextResponse.json(prompt);
  } catch (error) {
    console.error("Error creating AI prompt:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
