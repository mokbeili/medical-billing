import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }

  try {
    // 1. Exact code match
    const exactCodeMatches = await prisma.billingCode.findMany({
      where: {
        code: query,
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        section: {
          select: {
            code: true,
            title: true,
          },
        },
      },
    });

    if (exactCodeMatches.length > 0) {
      return NextResponse.json({
        type: "exact_code",
        results: exactCodeMatches,
      });
    }

    // 2. Exact title match
    const exactTitleMatches = await prisma.billingCode.findMany({
      where: {
        title: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        section: {
          select: {
            code: true,
            title: true,
          },
        },
      },
    });

    if (exactTitleMatches.length > 0) {
      return NextResponse.json({
        type: "exact_title",
        results: exactTitleMatches,
      });
    }

    // 3. Synonym search in title and description
    const synonymMatches = await prisma.billingCode.findMany({
      where: {
        OR: [
          {
            title: {
              contains: query,
              mode: "insensitive",
            },
          },
          {
            description: {
              contains: query,
              mode: "insensitive",
            },
          },
        ],
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        section: {
          select: {
            code: true,
            title: true,
          },
        },
      },
      take: 100,
    });

    if (synonymMatches.length > 0) {
      return NextResponse.json({
        type: "synonym",
        results: synonymMatches,
      });
    }

    // 4. AI embeddings search - First try strict matching
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });

    const embeddingArray = embedding.data[0].embedding;
    const embeddingString = `[${embeddingArray.join(",")}]`;

    // First try: Strict matching with high similarity threshold
    const strictMatches = await prisma.$queryRaw`
      SELECT 
        bc.id,
        bc.code,
        bc.title,
        bc.description,
        json_build_object(
          'code', s.code,
          'title', s.title
        ) as section,
        1 - (bc.openai_embedding::vector <=> ${embeddingString}::vector) as similarity
      FROM billing_codes bc
      JOIN sections s ON bc.section_id = s.id
      WHERE bc.openai_embedding IS NOT NULL
        AND 1 - (bc.openai_embedding::vector <=> ${embeddingString}::vector) > 0.85
      ORDER BY similarity DESC
      LIMIT 5
    `;

    if (strictMatches.length > 0) {
      return NextResponse.json({
        type: "ai_strict",
        results: strictMatches,
      });
    }

    // Second try: Broader matching with GPT refinement
    const broaderMatches = await prisma.$queryRaw`
      SELECT 
        bc.id,
        bc.code,
        bc.title,
        bc.description,
        json_build_object(
          'code', s.code,
          'title', s.title
        ) as section,
        1 - (bc.openai_embedding::vector <=> ${embeddingString}::vector) as similarity
      FROM billing_codes bc
      JOIN sections s ON bc.section_id = s.id
      WHERE bc.openai_embedding IS NOT NULL
        AND 1 - (bc.openai_embedding::vector <=> ${embeddingString}::vector) > 0.1
      ORDER BY similarity DESC
      LIMIT 100
    `;

    if (broaderMatches.length > 0) {
      const matchesText = broaderMatches
        .map(
          (match: any) =>
            `Code: ${match.code}\nTitle: ${match.title}\nDescription: ${
              match.description || "N/A"
            }\nSection: ${match.section.title}\nSimilarity: ${(
              match.similarity * 100
            ).toFixed(1)}%\n---`
        )
        .join("\n");

      const prompt = `You are a medical billing expert. Given the following search query and potential matches, select the most relevant billing codes that exactly match the medical procedure or service being searched for.

Search Query: "${query}"

Potential Matches:
${matchesText}

Please analyze these matches and return ONLY the billing codes that are most relevant to the search query. For each selected code, explain briefly why it matches. Format your response as:

Selected Codes:
1. [CODE] - [BRIEF EXPLANATION]
2. [CODE] - [BRIEF EXPLANATION]
...`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a medical billing expert helping to find the most relevant billing codes for medical procedures and services.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return NextResponse.json({
        type: "ai_refined",
        results: broaderMatches,
        refined_selection: completion.choices[0].message.content,
      });
    }

    return NextResponse.json({
      type: "ai",
      results: [],
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
