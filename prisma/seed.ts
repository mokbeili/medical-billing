import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Create sample health institutions
  const healthInstitutions = [
    {
      name: "General Hospital",
      street: "123 Medical Center Dr",
      city: "New York",
      state: "NY",
      postalCode: "10001",
      country: "USA",
      latitude: 40.7128,
      longitude: -74.006,
      phoneNumber: "212-555-0123",
    },
    {
      name: "Community Medical Center",
      street: "456 Health Ave",
      city: "Los Angeles",
      state: "CA",
      postalCode: "90001",
      country: "USA",
      latitude: 34.0522,
      longitude: -118.2437,
      phoneNumber: "213-555-0124",
    },
    {
      name: "Regional Hospital",
      street: "789 Care Blvd",
      city: "Chicago",
      state: "IL",
      postalCode: "60601",
      country: "USA",
      latitude: 41.8781,
      longitude: -87.6298,
      phoneNumber: "312-555-0125",
    },
    {
      name: "Specialty Clinic",
      street: "321 Wellness St",
      city: "Houston",
      state: "TX",
      postalCode: "77001",
      country: "USA",
      latitude: 29.7604,
      longitude: -95.3698,
      phoneNumber: "713-555-0126",
    },
    {
      name: "Medical Arts Center",
      street: "654 Treatment Way",
      city: "Miami",
      state: "FL",
      postalCode: "33101",
      country: "USA",
      latitude: 25.7617,
      longitude: -80.1918,
      phoneNumber: "305-555-0127",
    },
  ];

  for (const institution of healthInstitutions) {
    await prisma.healthInstitution.create({
      data: institution,
    });
  }

  console.log("Seed data created successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
