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
  referring_practitioner_required: string | null;
  multiple_unit_indicator: string | null;
  start_time_required: string | null;
  stop_time_required: string | null;
  max_units: number | null;
  day_range: number | null;
  billing_unit_type: string | null;
  section: {
    code: string;
    title: string;
  };
  previousCodes: Array<{
    previous_code: {
      id: number;
      code: string;
      title: string;
      section: {
        code: string;
        title: string;
      };
    };
  }>;
  nextCodes: Array<{
    next_code: {
      id: number;
      code: string;
      title: string;
      section: {
        code: string;
        title: string;
      };
    };
  }>;
  billingCodeChains: Array<{
    codeId: number;
    code: string;
    title: string;
    dayRange: number;
    rootId: number;
    previousCodeId: number | null;
    previousDayRange: number;
    cumulativeDayRange: number;
    prevPlusSelf: number;
    isLast: boolean;
  }>;
}

interface PrismaSearchResult {
  id: number;
  code: string;
  title: string;
  description: string | null;
  referring_practitioner_required: string | null;
  multiple_unit_indicator: string | null;
  start_time_required: string | null;
  stop_time_required: string | null;
  max_units: number | null;
  day_range: number | null;
  billing_unit_type: string | null;
  section: {
    code: string;
    title: string;
  };
  previousCodes: Array<{
    previousCode: {
      id: number;
      code: string;
      title: string;
      section: {
        code: string;
        title: string;
      };
    };
  }>;
  nextCodes: Array<{
    nextCode: {
      id: number;
      code: string;
      title: string;
      section: {
        code: string;
        title: string;
      };
    };
  }>;
  billingCodeChains: Array<{
    codeId: number;
    code: string;
    title: string;
    dayRange: number;
    rootId: number;
    previousCodeId: number | null;
    previousDayRange: number;
    cumulativeDayRange: number;
    prevPlusSelf: number;
    isLast: boolean;
  }>;
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
  hasExactMatch: boolean,
  hasExactTitleMatch: boolean
) => {
  const hasPartialCodeMatch = currentResults.some(
    (result) => result.searchType === "partial_code"
  );
  return (
    currentResults.length < limit &&
    !hasExactMatch &&
    !hasExactTitleMatch &&
    !hasPartialCodeMatch
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

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    // Get request metadata
    const headersList = await headers();
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
      results: (BaseSearchResult | PrismaSearchResult)[],
      cacheResults: SearchResult[],
      searchType: string
    ) => {
      const transformedResults = results.map((result) => {
        // Transform Prisma results to match BaseSearchResult interface
        if ("previousCode" in (result.previousCodes[0] || {})) {
          return {
            ...result,
            previousCodes: result.previousCodes.map((rel: any) => ({
              previous_code: rel.previousCode,
            })),
            nextCodes: result.nextCodes.map((rel: any) => ({
              next_code: rel.nextCode,
            })),
          } as BaseSearchResult;
        }
        return result as BaseSearchResult;
      });

      const uniqueResults = [
        ...cacheResults,
        ...transformedResults
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
          })),
      ];

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

    // Try exact match using raw SQL to handle leading zero removal
    const exactCodeMatches = await prisma.$queryRaw<BaseSearchResult[]>`
      SELECT 
        bc.id,
        bc.code,
        bc.title,
        bc.description,
        bc.referring_practitioner_required,
        bc.multiple_unit_indicator,
        bc.start_time_required,
        bc.stop_time_required,
        bc.max_units,
        bc.day_range,
        bc.billing_record_type,
        bc.billing_unit_type,
        json_build_object(
          'code', s.code,
          'title', s.title
        ) as section,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'previous_code', jsonb_build_object(
                'id', prev_bc.id,
                'code', prev_bc.code,
                'title', prev_bc.title,
                'section', jsonb_build_object(
                  'code', prev_s.code,
                  'title', prev_s.title
                )
              )
            )
          ) FILTER (WHERE prev_bc.id IS NOT NULL), '[]'::json
        ) as "previousCodes",
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'next_code', jsonb_build_object(
                'id', next_bc.id,
                'code', next_bc.code,
                'title', next_bc.title,
                'section', jsonb_build_object(
                  'code', next_s.code,
                  'title', next_s.title
                )
              )
            )
          ) FILTER (WHERE next_bc.id IS NOT NULL), '[]'::json
        ) as "nextCodes",
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'codeId', bcc.code_id,
              'code', bcc.code,
              'title', bcc.title,
              'dayRange', bcc.day_range,
              'rootId', bcc.root_id,
              'previousCodeId', bcc.previous_code_id,
              'previousDayRange', bcc.previous_day_range,
              'cumulativeDayRange', bcc.cumulative_day_range,
              'prevPlusSelf', bcc.prev_plus_self,
              'isLast', bcc.is_last
            )
          ) FILTER (WHERE bcc.code_id IS NOT NULL), '[]'::json
        ) as "billingCodeChains"
      FROM billing_codes bc
      JOIN sections s ON bc.section_id = s.id
      LEFT JOIN billing_code_relations bcr_prev ON bc.id = bcr_prev.next_code_id
      LEFT JOIN billing_codes prev_bc ON bcr_prev.previous_code_id = prev_bc.id
      LEFT JOIN sections prev_s ON prev_bc.section_id = prev_s.id
      LEFT JOIN billing_code_relations bcr_next ON bc.id = bcr_next.previous_code_id
      LEFT JOIN billing_codes next_bc ON bcr_next.next_code_id = next_bc.id
      LEFT JOIN sections next_s ON next_bc.section_id = next_s.id
      LEFT JOIN billing_code_chain bcc ON bc.id = bcc.code_id
      WHERE 
        bc.code ILIKE ${query.trim()} OR
        bc.code ILIKE ${cleanedQuery} OR
        LTRIM(bc.code, '0') ILIKE ${cleanedQuery} OR
        LTRIM(bc.code, '0') ILIKE ${query.trim()}
      GROUP BY bc.id, bc.code, bc.title, bc.description, bc.referring_practitioner_required, 
               bc.multiple_unit_indicator, bc.start_time_required, bc.stop_time_required, 
               bc.max_units, bc.day_range, bc.billing_record_type, s.code, s.title, bcc.code_id, bcc.code, bcc.title, bcc.day_range, bcc.root_id, bcc.previous_code_id, bcc.previous_day_range, bcc.cumulative_day_range, bcc.prev_plus_self, bcc.is_last
      LIMIT 1
    `;

    const exactCodeMatch =
      exactCodeMatches.length > 0 ? exactCodeMatches[0] : null;

    if (exactCodeMatch) {
      addUniqueResults([exactCodeMatch], [], "exact_code");
    }

    // 2. Try partial code match if we need more results
    if (needsMoreResults(allResults, limit, !!exactCodeMatch, false)) {
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
          billing_record_type: true,
          billing_unit_type: true,
          referring_practitioner_required: true,
          multiple_unit_indicator: true,
          start_time_required: true,
          stop_time_required: true,
          max_units: true,
          day_range: true,
          section: {
            select: {
              code: true,
              title: true,
            },
          },
          previousCodes: {
            select: {
              previousCode: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  section: {
                    select: {
                      code: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
          nextCodes: {
            select: {
              nextCode: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  section: {
                    select: {
                      code: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
          billingCodeChains: {
            select: {
              codeId: true,
              code: true,
              title: true,
              dayRange: true,
              rootId: true,
              previousCodeId: true,
              previousDayRange: true,
              cumulativeDayRange: true,
              prevPlusSelf: true,
              isLast: true,
            },
            orderBy: {
              cumulativeDayRange: "asc",
            },
          },
        },
        take: limit - allResults.length,
      });
      addUniqueResults(
        partialCodeMatches as PrismaSearchResult[],
        [],
        "partial_code"
      );
    }

    // 3. Try exact title match if we need more results
    let exactTitleMatches: PrismaSearchResult[] = [];
    if (needsMoreResults(allResults, limit, !!exactCodeMatch, false)) {
      exactTitleMatches = await prisma.billingCode.findMany({
        where: {
          title: query,
        },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          billing_record_type: true,
          billing_unit_type: true,
          referring_practitioner_required: true,
          multiple_unit_indicator: true,
          start_time_required: true,
          stop_time_required: true,
          max_units: true,
          day_range: true,
          section: {
            select: {
              code: true,
              title: true,
            },
          },
          previousCodes: {
            select: {
              previousCode: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  section: {
                    select: {
                      code: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
          nextCodes: {
            select: {
              nextCode: {
                select: {
                  id: true,
                  code: true,
                  title: true,
                  section: {
                    select: {
                      code: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
          billingCodeChains: {
            select: {
              codeId: true,
              code: true,
              title: true,
              dayRange: true,
              rootId: true,
              previousCodeId: true,
              previousDayRange: true,
              cumulativeDayRange: true,
              prevPlusSelf: true,
              isLast: true,
            },
            orderBy: {
              cumulativeDayRange: "asc",
            },
          },
        },
        take: limit - allResults.length,
      });

      addUniqueResults(exactTitleMatches, [], "exact_title");
    }

    // 4. Try synonym match if we need more results
    if (
      needsMoreResults(
        allResults,
        limit,
        !!exactCodeMatch,
        exactTitleMatches.length > 0
      )
    ) {
      const partialMatches = await prisma.$queryRaw<RawSearchResult[]>`
      SELECT 
        bc.id,
        bc.code,
        bc.title,
        bc.description,
        bc.billing_record_type,
        bc.referring_practitioner_required,
        bc.multiple_unit_indicator,
        bc.start_time_required,
        bc.stop_time_required,
        bc.max_units,
        bc.day_range,
        bc.billing_unit_type,
        json_build_object(
          'code', s.code,
          'title', s.title
        ) as section,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'previous_code', jsonb_build_object(
                'id', prev_bc.id,
                'code', prev_bc.code,
                'title', prev_bc.title,
                'section', jsonb_build_object(
                  'code', prev_s.code,
                  'title', prev_s.title
                )
              )
            )
          ) FILTER (WHERE prev_bc.id IS NOT NULL), '[]'::json
        ) as "previousCodes",
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'next_code', jsonb_build_object(
                'id', next_bc.id,
                'code', next_bc.code,
                'title', next_bc.title,
                'section', jsonb_build_object(
                  'code', next_s.code,
                  'title', next_s.title
                )
              )
            )
          ) FILTER (WHERE next_bc.id IS NOT NULL), '[]'::json
        ) as "nextCodes",
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'codeId', bcc.code_id,
              'code', bcc.code,
              'title', bcc.title,
              'dayRange', bcc.day_range,
              'rootId', bcc.root_id,
              'previousCodeId', bcc.previous_code_id,
              'previousDayRange', bcc.previous_day_range,
              'cumulativeDayRange', bcc.cumulative_day_range,
              'prevPlusSelf', bcc.prev_plus_self,
              'isLast', bcc.is_last
            )
          ) FILTER (WHERE bcc.code_id IS NOT NULL), '[]'::json
        ) as "billingCodeChains"
      FROM billing_codes bc
      JOIN sections s ON bc.section_id = s.id
      LEFT JOIN billing_code_relations bcr_prev ON bc.id = bcr_prev.next_code_id
      LEFT JOIN billing_codes prev_bc ON bcr_prev.previous_code_id = prev_bc.id
      LEFT JOIN sections prev_s ON prev_bc.section_id = prev_s.id
      LEFT JOIN billing_code_relations bcr_next ON bc.id = bcr_next.previous_code_id
      LEFT JOIN billing_codes next_bc ON bcr_next.next_code_id = next_bc.id
      LEFT JOIN sections next_s ON next_bc.section_id = next_s.id
      LEFT JOIN billing_code_chain bcc ON bc.id = bcc.code_id
      where to_tsvector('english', s.code || ' ' || s.title || ' ' || bc.code || ' ' || bc.title || '' || bc.description) @@ 
      plainto_tsquery('english', ${query})
      GROUP BY bc.id, bc.code, bc.title, bc.description, bc.billing_record_type,
               bc.referring_practitioner_required, bc.multiple_unit_indicator, 
               bc.start_time_required, bc.stop_time_required, bc.max_units, bc.day_range, s.code, s.title, bcc.code_id, bcc.code, bcc.title, bcc.day_range, bcc.root_id, bcc.previous_code_id, bcc.previous_day_range, bcc.cumulative_day_range, bcc.prev_plus_self, bcc.is_last
    `;
      addUniqueResults(partialMatches, [], "synonym");
    }

    let embeddingString: string = "";
    let embeddingArray: number[] = [];
    let previous_log_id: number | null = null;
    // 5. If still need more results, try AI search using previous query logs
    if (
      needsMoreResults(
        allResults,
        limit,
        !!exactCodeMatch,
        exactTitleMatches.length > 0
      )
    ) {
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
            sql.id,
            sql.search_string,
            sql.results,
            1 - (sqe.vector_embeddings <=> ${embeddingString}::vector) as similarity
          FROM search_query_logs sql 
          JOIN search_query_embeddings sqe ON sql.id = sqe.search_query_log_id
          WHERE embeddings IS NOT NULL 
          and previous_log_id is null
        )
        SELECT id, search_string, results
        FROM vector_comparison
        WHERE similarity >= 0.95
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
          addUniqueResults([], [...previousResults], "similar_query");
        } catch (e) {
          console.error("Error parsing previous results:", e);
        }
      }
    }
    // 6. If still need more results and no previous query, try AI search
    if (
      needsMoreResults(
        allResults,
        limit,
        !!exactCodeMatch,
        exactTitleMatches.length > 0
      ) &&
      !previous_log_id
    ) {
      // Get existing codes to exclude
      const existingCodes = allResults.map((result) => result.code).join(",");

      const strictMatches = await prisma.$queryRaw<RawSearchResult[]>`
        SELECT 
          bc.id,
          bc.code,
          bc.title,
          bc.description,
          bc.billing_record_type,
          bc.referring_practitioner_required,
          bc.multiple_unit_indicator,
          bc.start_time_required,
          bc.stop_time_required,
          bc.max_units,
          bc.day_range,
          bc.billing_unit_type,
          json_build_object(
            'code', s.code,
            'title', s.title
          ) as section,
          1 - (bce.vector_embeddings <=> ${embeddingString}::vector) as similarity,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'previous_code', jsonb_build_object(
                  'id', prev_bc.id,
                  'code', prev_bc.code,
                  'title', prev_bc.title,
                  'section', jsonb_build_object(
                    'code', prev_s.code,
                    'title', prev_s.title
                  )
                )
              )
            ) FILTER (WHERE prev_bc.id IS NOT NULL), '[]'::json
          ) as "previousCodes",
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'next_code', jsonb_build_object(
                  'id', next_bc.id,
                  'code', next_bc.code,
                  'title', next_bc.title,
                  'section', jsonb_build_object(
                    'code', next_s.code,
                    'title', next_s.title
                  )
                )
              )
            ) FILTER (WHERE next_bc.id IS NOT NULL), '[]'::json
          ) as "nextCodes",
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'codeId', bcc.code_id,
                'code', bcc.code,
                'title', bcc.title,
                'dayRange', bcc.day_range,
                'rootId', bcc.root_id,
                'previousCodeId', bcc.previous_code_id,
                'previousDayRange', bcc.previous_day_range,
                'cumulativeDayRange', bcc.cumulative_day_range,
                'prevPlusSelf', bcc.prev_plus_self,
                'isLast', bcc.is_last
              )
            ) FILTER (WHERE bcc.code_id IS NOT NULL), '[]'::json
          ) as "billingCodeChains"
        FROM billing_codes bc
        join billing_code_embeddings bce on bc.id = bce.billing_code_id
        JOIN sections s ON bc.section_id = s.id
        LEFT JOIN billing_code_relations bcr_prev ON bc.id = bcr_prev.next_code_id
        LEFT JOIN billing_codes prev_bc ON bcr_prev.previous_code_id = prev_bc.id
        LEFT JOIN sections prev_s ON prev_bc.section_id = prev_s.id
        LEFT JOIN billing_code_relations bcr_next ON bc.id = bcr_next.previous_code_id
        LEFT JOIN billing_codes next_bc ON bcr_next.next_code_id = next_bc.id
        LEFT JOIN sections next_s ON next_bc.section_id = next_s.id
        LEFT JOIN billing_code_chain bcc ON bc.id = bcc.code_id
        WHERE bc.openai_embedding::vector IS NOT NULL 
          AND bc.code NOT IN (${existingCodes.length > 0 ? existingCodes : ""})
          AND 1 - (bce.vector_embeddings <=> ${embeddingString}::vector) > 0.70
        GROUP BY bc.id, bc.code, bc.title, bc.description, bc.billing_record_type,
                 bc.referring_practitioner_required, bc.multiple_unit_indicator, 
                 bc.start_time_required, bc.stop_time_required, bc.max_units, bc.day_range, s.code, s.title,
                 bce.vector_embeddings, bcc.code_id, bcc.code, bcc.title, bcc.day_range, bcc.root_id, bcc.previous_code_id, bcc.previous_day_range, bcc.cumulative_day_range, bcc.prev_plus_self, bcc.is_last
        ORDER BY similarity DESC
        LIMIT ${limit - allResults.length}
      `;
      addUniqueResults(strictMatches, [], "ai_strict");
    }

    // if (
    //   needsMoreResults(
    //     allResults,
    //     limit,
    //     !!exactCodeMatch,
    //     exactTitleMatches.length > 0
    //   ) &&
    //   !previous_log_id &&
    //   query.length > 3
    // ) {
    //   // Get existing codes to exclude
    //   const existingCodes = allResults.map((result) => result.code).join(",");

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
    //         1 - (bce.vector_embeddings <=> ${embeddingString}::vector) as similarity
    //       FROM billing_codes bc
    //       join billing_code_embeddings bce on bc.id = bce.billing_code_id
    //       JOIN sections s ON bc.section_id = s.id
    //       WHERE bc.openai_embedding IS NOT NULL
    //         AND bc.code NOT IN (${
    //           existingCodes.length > 0 ? existingCodes : ""
    //         })
    //         AND 1 - (bce.vector_embeddings <=> ${embeddingString}::vector) > 0.70
    //       ORDER BY similarity DESC
    //       LIMIT ${BROADER_SEARCH_LIMIT}
    //     `;

    //   if (broaderMatches.length > 0) {
    //     const matchesText = broaderMatches
    //       .map(
    //         (match) =>
    //           `Code:${match.code}\nTitle:${match.title}\nDescription:${
    //             match.description || "N/A"
    //           }\nSection: ${match.section.title}\n---`
    //       )
    //       .join("\n");

    //     const prompt = `
    //       You are a medical billing assistant for Saskatchewan physicians. Based on a suggested list of billing codes and service descriptions, your task is to:

    //         📌 1. Verify Billing Code Validity
    //         Use only codes listed in the Saskatchewan Physician Payment Schedule (April 2025).

    //         If a service is not listed, advise the physician to contact Medical Services Branch (MSB) with a written request including:

    //         Service description

    //         Frequency

    //         Time spent

    //         Suggested fee and rationale

    //         🧾 2. Apply Proper Billing Rules
    //         For each billing code, apply the following:

    //         A. Assessment Rules
    //         Avoid double billing for services with overlapping coverage (e.g., visits bundled with procedures).

    //         For services on the same day, apply:

    //         Visit + 0/10-Day Procedure: Pay the higher of:

    //         Full procedure OR

    //         Visit + 75% of procedure

    //         Visit + 42-Day Procedure: Visit is included unless emergency, consultation, or >30 days since last visit.

    //         For multiple procedures:

    //         Pay 100% for the highest-value procedure

    //         Pay 75% for each additional one, unless:

    //         Composite applies

    //         Additional service is excluded or specifically listed

    //         B. Consultation Rules
    //         Only one consult per condition per 90 days unless:

    //         A new referral exists

    //         A new condition is assessed

    //         Subsequent consults may be reclassified to partial or follow-up assessments

    //         Include written recommendations to referring physician

    //         C. Virtual Care Rules
    //         Only billable if both physician and patient are in Saskatchewan

    //         Must be real-time and medically necessary

    //         Maximum of 3,000 virtual care services per year per physician (1,500 for code 875A)

    //         Start and end times must be documented for time-based codes

    //         Cannot bill for admin tasks or updates without direct patient interaction

    //         D. Out-of-Province Services
    //         For out-of-province insured services:

    //         Must fall under the Interprovincial Billing Agreement (IRBA)

    //         Prior approval is required for many Quebec or out-of-country services

    //         Submit through MSB at Saskatchewan rates unless IRBA-excluded

    //         📄 3. Ensure Proper Documentation
    //         Every billed service must have a medical record with:

    //         Start and end times (for time-based services)

    //         Clinical details justifying the billing code

    //         Notes confirming that the service was insured, provided, and medically required

    //         Additional documents for:

    //         Diagnostics: tracings, reports, lab results

    //         Procedures: operative reports

    //         Virtual care: location, platform compliance, secure communication

    //         📚 4. Use Specialty and Section Rules
    //         Refer to the relevant section in the Schedule:

    //         Each specialty (e.g., Psychiatry, Cardiology, General Practice) has its own section (A–Y)

    //         Apply specialty-specific assessment rules if noted (e.g., Anesthesia, Surgery, Obstetrics)

    //         🔁 5. Billing Timing and Limits
    //         Claims must be submitted within 6 months of service

    //         Time-based codes must meet minimum durations (e.g., 15 min = at least 7.5 min to claim)

    //         For multi-unit claims, each unit (except the last) must meet full time; the last must be a major portion

    //         📬 6. Special Notes
    //         If billing under locum tenens or alternate payment models, use appropriate physician number and billing method

    //         Use "by report" only when required and include all supporting details

    //         Referral rules:

    //         Valid 4-digit referring physician ID is required

    //         Use referral code 9901 only for retired/deceased/moved physicians and only twice per patient

    //         Search Query: "${query}"

    //         Potential Matches:
    //         ${matchesText}

    //         Please analyze these matches and return ONLY the billing codes that are most relevant to the search query.
    //         return only a json object with the following format:
    //         { billingCodes: ['code1', 'code2'],
    //          reasoning:
    //          'The billing codes 123A and 14D are the most relevant to the search query because they are the only codes that are listed in the Saskatchewan Physician Payment Schedule (April 2025) and are relevant to the search query.' }",`;
    //     const completion = await openai.chat.completions.create({
    //       model: "gpt-4",
    //       messages: [
    //         {
    //           role: "system",
    //           content: "",
    //         },
    //         {
    //           role: "user",
    //           content: prompt,
    //         },
    //       ],
    //       temperature: 0.3,
    //       max_tokens: 300,
    //     });

    //     // Parse the JSON array from the completion
    //     const selectedCodes: string[] = JSON.parse(
    //       completion.choices[0].message.content || "{}"
    //     )["billingCodes"];

    //     // Find the corresponding billing codes from the broader matches
    //     const selectedResults = broaderMatches
    //       .filter((match) => selectedCodes.includes(match.code))
    //       .map((match) => {
    //         return {
    //           ...match,
    //           displayCode: `${match.section.code} - ${match.code}`,
    //         };
    //       });

    //     addUniqueResults(selectedResults, [], "ai_refined");
    //   }
    // }

    await prisma.searchQueryLog.create({
      data: {
        searchString: query,
        embeddings: JSON.stringify(embeddingArray),
        results: JSON.stringify(allResults),
        jurisdictionId,
        userId: userId ? parseInt(userId) : null,
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
