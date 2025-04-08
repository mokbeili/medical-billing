import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { encrypt } from "../../../../utils/encryption";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Debug environment variables
    console.log("ENCRYPTION_KEY length:", process.env.ENCRYPTION_KEY?.length);
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error("ENCRYPTION_KEY is not set");
    }

    const { email, password, address, roles } = await request.json();

    // Debug request data
    console.log("Received registration request for:", email);

    // Validate input
    if (!email || !password || !address) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Test encryption
    try {
      const testEncryption = encrypt("test");
      console.log("Encryption test successful");
    } catch (encryptError) {
      console.error("Encryption test failed:", encryptError);
      throw encryptError;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log("Email already registered");
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Hash password and encrypt address
    const hashedPassword = await bcrypt.hash(password, 12);
    const encryptedAddress = encrypt(address);

    console.log("Creating user");
    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: hashedPassword,
        encrypted_address: encryptedAddress,
        roles: roles || ["PATIENT"],
      },
      select: {
        id: true,
        email: true,
        roles: true,
        created_at: true,
      },
    });

    console.log("User created successfully");
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
