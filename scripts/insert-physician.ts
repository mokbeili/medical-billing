import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

prisma.physician
  .create({
    data: {
      id: "1",
      firstName: "Mo",
      lastName: "Kbeili",
      billingNumber: "1234567890",
      jurisdictionId: 1,
      userId: 6,
    },
  })
  .then(() => {
    console.log("Physician created");
  });
