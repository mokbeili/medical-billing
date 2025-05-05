import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface RawSearchResult {
  id: number;
  code: string;
  title: string;
  description: string | null;
  section: {
    code: string;
    title: string;
  };
  similarity: number;
}

interface SearchResult {
  code: string;
  title: string;
  description: string | null;
  section: {
    code: string;
    title: string;
  };
}

interface SearchResponse {
  type:
    | "exact_code"
    | "partial_code"
    | "exact_title"
    | "synonym"
    | "ai"
    | "ai_strict"
    | "ai_refined";
  results: SearchResult[];
  refined_selection?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const VECTOR_SEARCH_LIMIT = 80;

// Mark this route as dynamic
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // First try exact code match
    const exactCodeMatch = await prisma.billingCode.findFirst({
      where: {
        code: query,
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        section: true,
      },
    });

    if (exactCodeMatch) {
      return NextResponse.json({
        type: "exact_code",
        results: [exactCodeMatch],
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          totalPages: 1,
        },
      });
    }

    // Try partial code match if no exact match
    const [partialCodeMatches, totalPartialMatches] = await Promise.all([
      prisma.billingCode.findMany({
        where: {
          code: {
            contains: query,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          section: true,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.billingCode.count({
        where: {
          code: {
            contains: query,
            mode: "insensitive",
          },
        },
      }),
    ]);

    if (partialCodeMatches.length > 0) {
      return NextResponse.json({
        type: "partial_code",
        results: partialCodeMatches,
        pagination: {
          page,
          limit,
          total: totalPartialMatches,
          totalPages: Math.ceil(totalPartialMatches / limit),
        },
      });
    }

    // Then try exact title match
    const exactTitleMatch = await prisma.billingCode.findFirst({
      where: {
        title: query,
      },
      select: {
        id: true,
        code: true,
        title: true,
        description: true,
        section: true,
      },
    });

    if (exactTitleMatch) {
      return NextResponse.json({
        type: "exact_title",
        results: [exactTitleMatch],
        pagination: {
          page: 1,
          limit: 1,
          total: 1,
          totalPages: 1,
        },
      });
    }

    // Then try synonym match
    const [synonymMatches, totalSynonymMatches] = await Promise.all([
      prisma.billingCode.findMany({
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
          section: true,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.billingCode.count({
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
      }),
    ]);

    if (synonymMatches.length > 0) {
      return NextResponse.json({
        type: "synonym",
        results: synonymMatches,
        pagination: {
          page,
          limit,
          total: totalSynonymMatches,
          totalPages: Math.ceil(totalSynonymMatches / limit),
        },
      });
    }

    // If no matches found, proceed with AI search
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query,
    });

    const embeddingArray = embedding.data[0].embedding;
    const embeddingString = `[${embeddingArray.join(",")}]`;

    // First try: Strict matching with high similarity threshold
    const strictMatches = await prisma.$queryRaw<RawSearchResult[]>`
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
      LIMIT ${limit}
      OFFSET ${(page - 1) * limit}
    `;

    if (strictMatches.length > 0) {
      const totalStrictMatches = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(*) as count
        FROM billing_codes bc
        WHERE bc.openai_embedding IS NOT NULL
          AND 1 - (bc.openai_embedding::vector <=> ${embeddingString}::vector) > 0.85
      `;

      return NextResponse.json({
        type: "ai_strict",
        results: strictMatches,
        pagination: {
          page,
          limit,
          total: Number(totalStrictMatches[0].count),
          totalPages: Math.ceil(Number(totalStrictMatches[0].count) / limit),
        },
      });
    }

    // Second try: Broader matching with GPT refinement
    const broaderMatches = await prisma.$queryRaw<RawSearchResult[]>`
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
      LIMIT ${VECTOR_SEARCH_LIMIT}
    `;

    if (broaderMatches.length > 0) {
      const matchesText = broaderMatches
        .map(
          (match) =>
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
        results: broaderMatches.slice(0 + page * limit, 20 + page * limit),
        refined_selection: completion.choices[0].message.content,
        pagination: {
          page,
          limit,
          total: Number(broaderMatches.length),
          totalPages: Math.ceil(Number(broaderMatches.length) / limit),
        },
      });
    }

    return NextResponse.json({
      type: "ai",
      results: [],
      pagination: {
        page: 1,
        limit,
        total: 0,
        totalPages: 0,
      },
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
