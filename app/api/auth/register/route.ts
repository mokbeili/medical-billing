import { encryptAddress } from "@/utils/encryption";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Debug environment variables
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error("ENCRYPTION_KEY is not set");
    }

    const {
      email,
      password,
      roles,
      address: { street, city, state, postalCode, country, unit },
    } = await request.json();

    // Debug request data

    // Validate input
    if (
      !email ||
      !password ||
      !street ||
      !city ||
      !state ||
      !postalCode ||
      !country
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Test encryption
    try {
      const testEncryption = encryptAddress({
        street: "test",
        city: "test",
        state: "test",
        postalCode: "test",
        country: "test",
        unit: "test",
      });
    } catch (encryptError) {
      console.error("Encryption test failed:", encryptError);
      throw encryptError;
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

    // Hash password and encrypt address
    const hashedPassword = await bcrypt.hash(password, 12);
    const encryptedAddressFields = encryptAddress({
      street,
      city,
      state,
      postalCode,
      country,
      unit,
    });
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        roles: roles || ["PATIENT"],
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
        env_check: {
          has_encryption_key: !!process.env.ENCRYPTION_KEY,
          encryption_key_length: process.env.ENCRYPTION_KEY?.length,
        },
      },
      { status: 500 }
    );
  }
}
