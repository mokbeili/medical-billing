import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
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
  searchType: string;
}

interface SearchResponse {
  type: "combined";
  results: SearchResult[];
  search_types_used: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const BROADER_SEARCH_LIMIT = 100;
const TARGET_RESULTS = 10;

// Helper function to check if we need more results
const needsMoreResults = (
  currentResults: SearchResult[],
  limit: number,
  hasExactMatch: boolean
) => {
  const hasPartialCodeMatch = currentResults.some(
    (result) => result.searchType === "partial_code"
  );
  return (
    currentResults.length < limit && !hasExactMatch && !hasPartialCodeMatch
  );
};

// Mark this route as dynamic
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || `${TARGET_RESULTS}`);
    const jurisdictionId = parseInt(searchParams.get("jurisdictionId") || "1");
    const userId = searchParams.get("userId") || null;
    const billingClaimId = searchParams.get("billingClaimId") || null;

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Get request metadata
    const headersList = headers();
    const ipAddress =
      headersList.get("x-forwarded-for") || headersList.get("x-real-ip");
    const userAgent = headersList.get("user-agent");
    const deviceInfo = JSON.stringify({
      platform: headersList.get("sec-ch-ua-platform"),
      mobile: headersList.get("sec-ch-ua-mobile"),
      browser: headersList.get("sec-ch-ua"),
    });

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
          displayCode: result.code,
          searchType: searchType,
        }));

      if (uniqueResults.length > 0) {
        allResults = [...allResults, ...uniqueResults];
        searchTypesUsed.push(searchType);
      }
    };

    // 1. Try exact code match
    const cleanedQuery = query
      .trim()
      .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "")
      .replace(/^0+(?=\d)/, "") // Remove leading zeros before any digit
      .replace(/\.?0*$/, "");
    const exactCodeMatch = await prisma.billingCode.findFirst({
      where: {
        code: {
          equals: cleanedQuery,
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

    if (exactCodeMatch) {
      addUniqueResults([exactCodeMatch], "exact_code");
    }

    // 2. Try partial code match if we need more results
    if (needsMoreResults(allResults, limit, !!exactCodeMatch)) {
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
    if (needsMoreResults(allResults, limit, !!exactCodeMatch)) {
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
    if (needsMoreResults(allResults, limit, !!exactCodeMatch)) {
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
    let embeddingArray: number[] = [];
    let previous_log_id: number | null = null;
    // 5. If still need more results, try AI search using previous query logs
    if (needsMoreResults(allResults, limit, !!exactCodeMatch)) {
      const embedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: query,
      });

      embeddingArray = embedding.data[0].embedding;
      embeddingString = `[${embeddingArray.join(",")}]`;

      // Search through query logs for similar queries
      const similarQueries = await prisma.$queryRaw<
        { id: number; search_string: string; results: string }[]
      >`
        WITH vector_comparison AS (
          SELECT 
            id,
            search_string,
            results,
            1 - (embeddings::vector <=> ${embeddingString}::vector) as similarity
          FROM search_query_logs
          WHERE embeddings IS NOT NULL 
            AND embeddings != '[]'
        )
        SELECT id, search_string, results
        FROM vector_comparison
        WHERE similarity >= 0.995
        ORDER BY similarity DESC
        LIMIT 1`;

      // If we found similar queries, add their results to our results
      if (similarQueries.length > 0) {
        const previous_query = similarQueries[0];
        previous_log_id = previous_query.id;
        try {
          const previousResults = JSON.parse(
            previous_query.results
          ) as SearchResult[];
          addUniqueResults(previousResults, "similar_query");
        } catch (e) {
          console.error("Error parsing previous results:", e);
        }
      }
    }
    // 6. If still need more results and no previous query, try AI search
    if (
      needsMoreResults(allResults, limit, !!exactCodeMatch) &&
      !previous_log_id
    ) {
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
          AND bc.openai_embedding != '[]'
          AND bc.openai_embedding != ''
          AND 1 - (bc.openai_embedding::vector <=> ${embeddingString}::vector) > 0.90
        ORDER BY similarity DESC
        LIMIT ${limit - allResults.length}
      `;

      addUniqueResults(strictMatches, "ai_strict");
    }

    if (
      needsMoreResults(allResults, limit, !!exactCodeMatch) &&
      !previous_log_id &&
      query.length > 3
    ) {
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
            AND bc.openai_embedding != '[]'
            AND bc.openai_embedding != ''
            AND 1 - (bc.openai_embedding::vector <=> ${embeddingString}::vector) > 0.20
          ORDER BY similarity DESC
          LIMIT ${BROADER_SEARCH_LIMIT}
        `;

      if (broaderMatches.length > 0) {
        const matchesText = broaderMatches
          .map(
            (match) =>
              `Code:${match.code}\nTitle:${match.title}\nDescription:${
                match.description || "N/A"
              }\nSection: ${match.section.title}\n---`
          )
          .join("\n");

        const prompt = `You are a medical billing assistant for Saskatchewan physicians. Based on a suggested list of billing codes and service descriptions, your task is to:

📌 1. Verify Billing Code Validity
Use only codes listed in the Saskatchewan Physician Payment Schedule (April 2025).

If a service is not listed, advise the physician to contact Medical Services Branch (MSB) with a written request including:

Service description

Frequency

Time spent

Suggested fee and rationale

🧾 2. Apply Proper Billing Rules
For each billing code, apply the following:

A. Assessment Rules
Avoid double billing for services with overlapping coverage (e.g., visits bundled with procedures).

For services on the same day, apply:

Visit + 0/10-Day Procedure: Pay the higher of:

Full procedure OR

Visit + 75% of procedure

Visit + 42-Day Procedure: Visit is included unless emergency, consultation, or >30 days since last visit.

For multiple procedures:

Pay 100% for the highest-value procedure

Pay 75% for each additional one, unless:

Composite applies

Additional service is excluded or specifically listed

B. Consultation Rules
Only one consult per condition per 90 days unless:

A new referral exists

A new condition is assessed

Subsequent consults may be reclassified to partial or follow-up assessments

Include written recommendations to referring physician

C. Virtual Care Rules
Only billable if both physician and patient are in Saskatchewan

Must be real-time and medically necessary

Maximum of 3,000 virtual care services per year per physician (1,500 for code 875A)

Start and end times must be documented for time-based codes

Cannot bill for admin tasks or updates without direct patient interaction

D. Out-of-Province Services
For out-of-province insured services:

Must fall under the Interprovincial Billing Agreement (IRBA)

Prior approval is required for many Quebec or out-of-country services

Submit through MSB at Saskatchewan rates unless IRBA-excluded

📄 3. Ensure Proper Documentation
Every billed service must have a medical record with:

Start and end times (for time-based services)

Clinical details justifying the billing code

Notes confirming that the service was insured, provided, and medically required

Additional documents for:

Diagnostics: tracings, reports, lab results

Procedures: operative reports

Virtual care: location, platform compliance, secure communication

📚 4. Use Specialty and Section Rules
Refer to the relevant section in the Schedule:

Each specialty (e.g., Psychiatry, Cardiology, General Practice) has its own section (A–Y)

Apply specialty-specific assessment rules if noted (e.g., Anesthesia, Surgery, Obstetrics)

🔁 5. Billing Timing and Limits
Claims must be submitted within 6 months of service

Time-based codes must meet minimum durations (e.g., 15 min = at least 7.5 min to claim)

For multi-unit claims, each unit (except the last) must meet full time; the last must be a major portion

📬 6. Special Notes
If billing under locum tenens or alternate payment models, use appropriate physician number and billing method

Use "by report" only when required and include all supporting details

Referral rules:

Valid 4-digit referring physician ID is required

Use referral code 9901 only for retired/deceased/moved physicians and only twice per patient

            Search Query: "${query}"

            Potential Matches:
            ${matchesText}

            Please analyze these matches and return ONLY the billing codes that are most relevant to the search query. 
            return the results in the following format:
            {
              "billingCodes": ["123A", "14D"]
              "reasoning": "The billing codes 123A and 14D are the most relevant to the search query because they are the only codes that are listed in the Saskatchewan Physician Payment Schedule (April 2025) and are relevant to the search query."
            }`;

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
          max_tokens: 100,
        });
        // Parse the JSON array from the completion
        const selectedCodes: string[] = JSON.parse(
          completion.choices[0].message.content || "{}"
        )["billingCodes"];

        // Find the corresponding billing codes from the broader matches
        const selectedResults = broaderMatches
          .filter((match) => selectedCodes.includes(match.code))
          .map((match) => {
            return {
              ...match,
              displayCode: `${match.section.code} - ${match.code}`,
            };
          });

        addUniqueResults(selectedResults, "ai_refined");
      }
    }

    await prisma.searchQueryLog.create({
      data: {
        searchString: query,
        embeddings: JSON.stringify(embeddingArray),
        results: JSON.stringify(allResults),
        jurisdictionId,
        userId: userId ? parseInt(userId) : null,
        billingClaimId,
        ipAddress,
        userAgent,
        deviceInfo,
        previousLogId: previous_log_id,
      },
    });

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
