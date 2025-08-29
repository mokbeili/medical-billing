import { NextRequest, NextResponse } from "next/server";
import { BillingCodeChainService } from "../../../services/billingCodeChainService";
import { BillingCodeChainQuery } from "../../../types/billing-code-chain";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query: BillingCodeChainQuery = {};

    if (searchParams.has("rootId")) {
      query.rootId = parseInt(searchParams.get("rootId")!);
    }

    if (searchParams.has("codeId")) {
      query.codeId = parseInt(searchParams.get("codeId")!);
    }

    if (searchParams.has("previousCodeId")) {
      query.previousCodeId = parseInt(searchParams.get("previousCodeId")!);
    }

    if (searchParams.has("minCumulativeDayRange")) {
      query.minCumulativeDayRange = parseInt(
        searchParams.get("minCumulativeDayRange")!
      );
    }

    if (searchParams.has("maxCumulativeDayRange")) {
      query.maxCumulativeDayRange = parseInt(
        searchParams.get("maxCumulativeDayRange")!
      );
    }

    if (searchParams.has("limit")) {
      query.limit = parseInt(searchParams.get("limit")!);
    }

    if (searchParams.has("offset")) {
      query.offset = parseInt(searchParams.get("offset")!);
    }

    if (searchParams.has("search")) {
      const searchTerm = searchParams.get("search")!;
      const results = await BillingCodeChainService.searchChains(searchTerm);
      return NextResponse.json(results);
    }

    if (searchParams.has("analysis")) {
      const minDayRange = searchParams.has("minDayRange")
        ? parseInt(searchParams.get("minDayRange")!)
        : undefined;
      const maxDayRange = searchParams.has("maxDayRange")
        ? parseInt(searchParams.get("maxDayRange")!)
        : undefined;

      const results =
        await BillingCodeChainService.getChainsWithDayRangeAnalysis(
          minDayRange,
          maxDayRange
        );
      return NextResponse.json(results);
    }

    if (searchParams.has("longest")) {
      const limit = searchParams.has("limit")
        ? parseInt(searchParams.get("limit")!)
        : 10;
      const results = await BillingCodeChainService.getLongestChains(limit);
      return NextResponse.json(results);
    }

    if (searchParams.has("highestDayRanges")) {
      const limit = searchParams.has("limit")
        ? parseInt(searchParams.get("limit")!)
        : 10;
      const results =
        await BillingCodeChainService.getChainsWithHighestDayRanges(limit);
      return NextResponse.json(results);
    }

    if (searchParams.has("statistics")) {
      const results = await BillingCodeChainService.getChainStatistics();
      return NextResponse.json(results);
    }

    // Default: get all chains with query filters
    const results = await BillingCodeChainService.getAllChains(query);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching billing code chains:", error);
    return NextResponse.json(
      { error: "Failed to fetch billing code chains" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "getChainByRoot":
        if (!params.rootId) {
          return NextResponse.json(
            { error: "rootId is required for getChainByRoot action" },
            { status: 400 }
          );
        }
        const chainByRoot = await BillingCodeChainService.getChainByRoot(
          params.rootId
        );
        return NextResponse.json(chainByRoot);

      case "getChainByCode":
        if (!params.codeId) {
          return NextResponse.json(
            { error: "codeId is required for getChainByCode action" },
            { status: 400 }
          );
        }
        const chainByCode = await BillingCodeChainService.getChainByCode(
          params.codeId
        );
        return NextResponse.json(chainByCode);

      case "getChainsContainingCode":
        if (!params.codeId) {
          return NextResponse.json(
            { error: "codeId is required for getChainsContainingCode action" },
            { status: 400 }
          );
        }
        const chainsContainingCode =
          await BillingCodeChainService.getChainsContainingCode(params.codeId);
        return NextResponse.json(chainsContainingCode);

      default:
        return NextResponse.json(
          { error: "Invalid action specified" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing billing code chain request:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
