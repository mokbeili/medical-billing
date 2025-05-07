import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface BaseSearchResult {
  id: number;
  code: string;
  title: string;
  description: string | null;
  section: {
    code: string;
    title: string;
  };
}

interface RawSearchResult extends BaseSearchResult {
  similarity: number;
}

interface SearchResult extends BaseSearchResult {
  displayCode: string;
}

interface SearchResponse {
  type: "combined";
  results: SearchResult[];
  search_types_used: string[];
  refined_selection?: string;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const VECTOR_SEARCH_LIMIT = 80;
const TARGET_RESULTS = 10;

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
    const limit = parseInt(searchParams.get("limit") || `${TARGET_RESULTS}`);

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    let allResults: SearchResult[] = [];
    const searchTypesUsed: string[] = [];
    const usedCodes = new Set<string>();

    // Helper function to add unique results
    const addUniqueResults = (
      results: BaseSearchResult[],
      searchType: string
    ) => {
      const uniqueResults = results
        .filter((result) => {
          if (usedCodes.has(result.code)) {
            return false;
          }
          usedCodes.add(result.code);
          return true;
        })
        .map((result) => ({
          ...result,
          displayCode: `${result.section.code} - ${result.code}`,
        }));

      if (uniqueResults.length > 0) {
        allResults = [...allResults, ...uniqueResults];
        searchTypesUsed.push(searchType);
      }
    };

    // 1. Try exact code match
    const exactCodeMatch = await prisma.billingCode.findFirst({
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

    if (exactCodeMatch) {
      addUniqueResults([exactCodeMatch], "exact_code");
    }

    // 2. Try partial code match if we need more results
    if (allResults.length < limit && !exactCodeMatch) {
      const partialCodeMatches = await prisma.billingCode.findMany({
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
          section: {
            select: {
              code: true,
              title: true,
            },
          },
        },
        take: limit - allResults.length,
      });

      addUniqueResults(partialCodeMatches, "partial_code");
    }

    // 3. Try exact title match if we need more results
    if (allResults.length < limit) {
      const exactTitleMatches = await prisma.billingCode.findMany({
        where: {
          title: query,
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
        take: limit - allResults.length,
      });

      addUniqueResults(exactTitleMatches, "exact_title");
    }

    // 4. Try synonym match if we need more results
    if (allResults.length < limit && !exactCodeMatch) {
      const partialMatches = await prisma.billingCode.findMany({
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
        take: limit - allResults.length,
      });
      addUniqueResults(partialMatches, "synonym");
    }

    let embeddingString: string = "";

    // 5. If still need more results, try AI search
    if (allResults.length < limit && !exactCodeMatch) {
      const embedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });

      const embeddingArray = embedding.data[0].embedding;
      embeddingString = `[${embeddingArray.join(",")}]`;

      // First try strict matching
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
          AND 1 - (bc.openai_embedding::vector <=> ${embeddingString}::vector) > 0.80
        ORDER BY similarity DESC
        LIMIT ${limit - allResults.length}
      `;

      addUniqueResults(strictMatches, "ai_strict");
    }
    // If still need more results, try broader matching
    // if (allResults.length < limit && !exactCodeMatch) {
    //   const broaderMatches = await prisma.$queryRaw<RawSearchResult[]>`
    //       SELECT
    //         bc.id,
    //         bc.code,
    //         bc.title,
    //         bc.description,
    //         json_build_object(
    //           'code', s.code,
    //           'title', s.title
    //         ) as section,
    //         1 - (bc.openai_embedding::vector <=> ${embeddingString}::vector) as similarity
    //       FROM billing_codes bc
    //       JOIN sections s ON bc.section_id = s.id
    //       WHERE bc.openai_embedding IS NOT NULL
    //         AND 1 - (bc.openai_embedding::vector <=> ${embeddingString}::vector) > 0.1
    //       ORDER BY similarity DESC
    //       LIMIT ${limit - allResults.length}
    //     `;

    //   if (broaderMatches.length > 0) {
    //     const matchesText = broaderMatches
    //       .map(
    //         (match) =>
    //           `Code: ${match.section.code} - ${match.code}\nTitle: ${
    //             match.title
    //           }\nDescription: ${match.description || "N/A"}\nSection: ${
    //             match.section.title
    //           }\nSimilarity: ${(match.similarity * 100).toFixed(1)}%\n---`
    //       )
    //       .join("\n");

    //     const prompt = `You are a medical billing expert. Given the following search query and potential matches, select the most relevant billing codes that exactly match the medical procedure or service being searched for.

    //         Search Query: "${query}"

    //         Potential Matches:
    //         ${matchesText}

    //         Please analyze these matches and return ONLY the billing codes that are most relevant to the search query. For each selected code, explain briefly why it matches. Format your response as:

    //         Selected Codes:
    //         1. [CODE] - [BRIEF EXPLANATION]
    //         2. [CODE] - [BRIEF EXPLANATION]
    //         ...`;

    //     const completion = await openai.chat.completions.create({
    //       model: "gpt-4",
    //       messages: [
    //         {
    //           role: "system",
    //           content:
    //             "You are a medical billing expert helping to find the most relevant billing codes for medical procedures and services.",
    //         },
    //         {
    //           role: "user",
    //           content: prompt,
    //         },
    //       ],
    //       temperature: 0.3,
    //       max_tokens: 500,
    //     });

    //     return NextResponse.json({
    //       type: "combined",
    //       results: allResults,
    //       search_types_used: searchTypesUsed,
    //       refined_selection: completion.choices[0].message.content,
    //       pagination: {
    //         page,
    //         limit: allResults.length,
    //         total: allResults.length,
    //         totalPages: 1,
    //       },
    //     });
    //   }
    // }

    return NextResponse.json({
      type: "combined",
      results: allResults,
      search_types_used: searchTypesUsed,
      pagination: {
        page,
        limit: allResults.length,
        total: allResults.length,
        totalPages: 1,
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
