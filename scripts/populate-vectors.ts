const { PrismaClient } = require("@prisma/client");
const { OpenAI } = require("openai");
require("dotenv").config();

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateConciseTitle(
  code: string,
  title: string,
  description: string | null,
  sectionTitle: string
): Promise<string> {
  const prompt = `Given the following medical billing code information, generate a concise, clear title (max 50 characters) that captures the essence of the service:

Section: ${sectionTitle}
Code: ${code}
Current Title: ${title}
Description: ${description || ""}

Generate a concise title that is:
1. Clear and descriptive
2. No more than 50 characters
3. Maintains medical terminology accuracy
4. Easy to understand

Title:`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content:
          "You are a medical billing expert. Generate concise, accurate titles for medical billing codes.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 50,
  });

  return completion.choices[0].message.content.trim();
}

async function populateVectors(
  sectionCode?: string,
  billingCode?: string,
  limit?: number
) {
  try {
    // Build the where clause based on provided filters
    // if (sectionCode) {
    //   whereClause.section = {
    //     code: sectionCode,
    //   };
    // }
    // if (billingCode) {
    //   whereClause.code = billingCode;
    // }

    // Get billing codes with their sections
    const billingCodes = await prisma.billingCode.findMany({
      where: {
        openai_embedding: "[]",
      },
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
      console.log(`Processing code ${code.code}`);

      // Generate concise title
      const conciseTitle = await generateConciseTitle(
        code.code,
        code.title,
        code.description,
        code.section.title
      );

      // Combine the text for embedding
      const textToEmbed = [
        `Section: ${code.section.title}`,
        `Code: ${code.code}`,
        `Title: ${conciseTitle}`,
        `Description: ${code.description || ""}`,
      ].join(" ");

      // Get embedding from OpenAI
      const embedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: textToEmbed,
      });

      // Convert embedding to string format
      const embeddingString = `[${embedding.data[0].embedding.join(",")}]`;

      // Update the billing code with both the new title and embedding
      await prisma.$executeRaw`
        UPDATE billing_codes 
        SET openai_embedding = ${embeddingString}::vector,
            title = ${conciseTitle}
        WHERE id = ${code.id}
      `;

      console.log(`Updated title and vector for code ${code.code}`);
    }

    console.log("Finished populating vectors and updating titles");
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
const limit = parseInt(args[2]) || 1690;

populateVectors(sectionCode, billingCode, limit);
