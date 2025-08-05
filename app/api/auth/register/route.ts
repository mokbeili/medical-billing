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

    const {
      email,
      password,
      address,
      first_name,
      last_name,
      is_physician,
      group_number,
      clinic_info,
      physician_confirmation,
    } = await request.json();

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

    // Validate physician-specific fields
    if (is_physician) {
      if (!group_number) {
        return NextResponse.json(
          { error: "Group number is required for physician registration" },
          { status: 400 }
        );
      }
      if (!clinic_info) {
        return NextResponse.json(
          {
            error: "Clinic information is required for physician registration",
          },
          { status: 400 }
        );
      }
      if (!physician_confirmation) {
        return NextResponse.json(
          { error: "Physician confirmation is required" },
          { status: 400 }
        );
      }
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

    // If registering as physician, create physician record
    if (is_physician) {
      let healthInstitutionId = null;

      // Handle clinic information
      if (clinic_info.existing_clinic) {
        // Use existing clinic
        healthInstitutionId = clinic_info.clinic_id;
      } else {
        // Create new clinic if it doesn't exist
        const newClinic = await prisma.healthInstitution.create({
          data: {
            name: clinic_info.name,
            street: clinic_info.address.street,
            city: clinic_info.address.city,
            state: clinic_info.address.state,
            postalCode: clinic_info.address.postalCode,
            country: clinic_info.address.country,
            phoneNumber: clinic_info.phoneNumber || "",
            number: clinic_info.clinicNumber,
            latitude: 0, // Default values
            longitude: 0,
          },
        });
        healthInstitutionId = newClinic.id;
      }

      // Create physician record
      const physician = await prisma.physician.create({
        data: {
          id: `PHY_${user.id}_${Date.now()}`, // Generate unique ID
          firstName: first_name,
          lastName: last_name,
          billingNumber: physician_confirmation.billing_code,
          userId: user.id,
          jurisdictionId: 1, // Default jurisdiction - you might want to make this configurable
          groupNumber: group_number,
          healthInstitutionId: healthInstitutionId,
          streetAddress: street,
          city: city,
          province: state,
          postalCode: postalCode,
        },
      });

      // Update referring physician's physician ID where the billing code matches
      await prisma.referringPhysician.updateMany({
        where: {
          code: physician_confirmation.billing_code,
          physicianId: null, // Only update if physicianId is not already set
        },
        data: {
          physicianId: physician.id,
        },
      });
    }

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
