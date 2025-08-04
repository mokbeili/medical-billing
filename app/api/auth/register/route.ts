import { encrypt, encryptAddress } from "@/utils/encryption";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error("ENCRYPTION_KEY is not set");
    }

    const { email, password, address, first_name, last_name, is_physician } =
      await request.json();

    // Validate input
    if (!email || !password || !address || !first_name || !last_name) {
      console.log(
        "Missing required fields",
        email,
        password,
        address,
        first_name,
        last_name
      );
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { street, city, state, postalCode, country, unit } = address;

    if (!street || !city || !state || !postalCode || !country) {
      return NextResponse.json(
        { error: "Missing required address fields" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password and encrypt address and names
    const hashedPassword = await bcrypt.hash(password, 12);
    const encryptedAddressFields = encryptAddress({
      street,
      city,
      state,
      postalCode,
      country,
      unit: unit || null,
    });

    // Determine roles based on is_physician parameter
    const roles = is_physician
      ? ["PATIENT" as const, "PHYSICIAN" as const]
      : ["PATIENT" as const];

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        roles,
        encrypted_first_name: encrypt(first_name),
        encrypted_last_name: encrypt(last_name),
        ...encryptedAddressFields,
      },
      select: {
        id: true,
        email: true,
        roles: true,
        created_at: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        error: "Error creating user",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
