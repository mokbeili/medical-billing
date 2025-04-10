import { decrypt, encrypt } from "@/utils/encryption";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// GET /api/user/profile
export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        email: true,
        roles: true,
        encrypted_street: true,
        encrypted_unit: true,
        encrypted_city: true,
        encrypted_state: true,
        encrypted_postal_code: true,
        encrypted_country: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      email: user.email,
      roles: user.roles,
      address: {
        street: user.encrypted_street ? decrypt(user.encrypted_street) : "",
        unit: user.encrypted_unit ? decrypt(user.encrypted_unit) : "",
        city: user.encrypted_city ? decrypt(user.encrypted_city) : "",
        state: user.encrypted_state ? decrypt(user.encrypted_state) : "",
        postalCode: user.encrypted_postal_code
          ? decrypt(user.encrypted_postal_code)
          : "",
        country: user.encrypted_country ? decrypt(user.encrypted_country) : "",
      },
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    return NextResponse.json(
      { error: "Error fetching profile" },
      { status: 500 }
    );
  }
}

// PUT /api/user/profile
export async function PUT(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
    };

    const { email, password, roles, address } = await request.json();

    // Prepare update data with encrypted address fields
    const updateData: any = {
      email,
      roles,
      encrypted_street: address.street ? encrypt(address.street) : null,
      encrypted_unit: address.unit ? encrypt(address.unit) : null,
      encrypted_city: address.city ? encrypt(address.city) : null,
      encrypted_state: address.state ? encrypt(address.state) : null,
      encrypted_postal_code: address.postalCode
        ? encrypt(address.postalCode)
        : null,
      encrypted_country: address.country ? encrypt(address.country) : null,
    };

    // If password is provided, hash it
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 12);
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData,
      select: {
        email: true,
        roles: true,
        encrypted_street: true,
        encrypted_unit: true,
        encrypted_city: true,
        encrypted_state: true,
        encrypted_postal_code: true,
        encrypted_country: true,
      },
    });

    return NextResponse.json({
      message: "Profile updated successfully",
      user: {
        email: user.email,
        roles: user.roles,
        address: {
          street: user.encrypted_street ? decrypt(user.encrypted_street) : "",
          unit: user.encrypted_unit ? decrypt(user.encrypted_unit) : "",
          city: user.encrypted_city ? decrypt(user.encrypted_city) : "",
          state: user.encrypted_state ? decrypt(user.encrypted_state) : "",
          postalCode: user.encrypted_postal_code
            ? decrypt(user.encrypted_postal_code)
            : "",
          country: user.encrypted_country
            ? decrypt(user.encrypted_country)
            : "",
        },
      },
    });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Error updating profile" },
      { status: 500 }
    );
  }
}
