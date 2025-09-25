import { authOptions } from "@/lib/auth";
import { decrypt, encrypt } from "@/utils/encryption";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

// GET /api/user/profile
export async function GET(request: Request) {
  try {
    // Check for mobile app authentication first
    const userHeader = request.headers.get("x-user");
    const userId = request.headers.get("x-user-id");
    const userEmail = request.headers.get("x-user-email");
    const userRoles = request.headers.get("x-user-roles");
    let user = null;

    if (userHeader) {
      try {
        user = JSON.parse(userHeader);
      } catch (error) {
        console.error("Error parsing user header:", error);
      }
    } else if (userId && userEmail && userRoles) {
      // Handle individual headers from mobile app
      user = {
        id: userId,
        email: userEmail,
        roles: userRoles.split(","),
      } as any;
    }

    // If no mobile user, try NextAuth session
    if (!user) {
      const session = await getServerSession(authOptions);
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      user = session.user;
    }

    const userData = await prisma.user.findUnique({
      where: { id: parseInt(user.id) },
      select: {
        id: true,
        email: true,
        roles: true,
        encrypted_street: true,
        encrypted_unit: true,
        encrypted_city: true,
        encrypted_state: true,
        encrypted_postal_code: true,
        encrypted_country: true,
        physicians: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            middleInitial: true,
            billingNumber: true,
            physicianBillingTypes: {
              select: {
                id: true,
                active: true,
                colorCode: true,
                billingType: {
                  select: {
                    id: true,
                    code: true,
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Decrypt address fields and format response
    const responseData = {
      id: userData.id,
      email: userData.email,
      roles: userData.roles,
      address: {
        street: userData.encrypted_street
          ? decrypt(userData.encrypted_street)
          : "",
        unit: userData.encrypted_unit ? decrypt(userData.encrypted_unit) : "",
        city: userData.encrypted_city ? decrypt(userData.encrypted_city) : "",
        state: userData.encrypted_state
          ? decrypt(userData.encrypted_state)
          : "",
        postalCode: userData.encrypted_postal_code
          ? decrypt(userData.encrypted_postal_code)
          : "",
        country: userData.encrypted_country
          ? decrypt(userData.encrypted_country)
          : "",
      },
      physicians: userData.physicians,
    };

    return NextResponse.json(responseData);
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      where: { id: parseInt(session.user.id) },
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
