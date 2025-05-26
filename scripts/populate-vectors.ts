const { PrismaClient } = require("@prisma/client");
const { OpenAI } = require("openai");
require("dotenv").config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function populateVectors(
  sectionCode?: string,
  billingCode?: string,
  limit?: number
) {
  try {
    // Build the where clause based on provided filters
    const whereClause: any = {};
    if (sectionCode) {
      whereClause.section = {
        code: sectionCode,
      };
    }
    if (billingCode) {
      whereClause.code = billingCode;
    }

    // Get billing codes with their sections
    const billingCodes = await prisma.billingCode.findMany({
      where: whereClause,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        section: {
          select: {
            title: true,
          },
        },
      },
    });

    console.log(`Found ${billingCodes.length} billing codes to process`);

    for (const code of billingCodes) {
      // Combine the text for embedding
      const textToEmbed = [
        `Section: ${code.section.title}`,
        `Code: ${code.code}`,
        `Title: ${code.title}`,
        `Description: ${code.description || ""}`,
      ].join(" ");

      console.log(`Processing code ${code.code}`);

      // Get embedding from OpenAI
      const embedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: textToEmbed,
      });

      // Convert embedding to string format
      const embeddingString = `[${embedding.data[0].embedding.join(",")}]`;

      // Update the billing code with the embedding
      await prisma.$executeRaw`
        UPDATE billing_codes 
        SET openai_embedding = ${embeddingString}::vector
        WHERE id = ${code.id}
      `;

      console.log(`Updated vector for code ${code.code}`);
    }

    console.log("Finished populating vectors");
  } catch (error) {
    console.error("Error populating vectors:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Get command line arguments
const args = process.argv.slice(2);
const sectionCode = args[0] || undefined;
const billingCode = args[1] || undefined;
const limit = parseInt(args[2]) || 1750;

populateVectors(sectionCode, billingCode, limit);
