"use client";

import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";

interface SearchResult {
  id: number;
  code: string;
  title: string;
  description: string | null;
  section: {
    code: string;
    title: string;
  };
  similarity?: number;
  displayCode: string;
  searchType?: string;
  billing_record_type: number;
  referring_practitioner_required: boolean;
  multiple_unit_indicator: string;
  start_time_required: boolean;
  stop_time_required: boolean;
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

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const { data: session, status } = useSession();

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResponse, isLoading } = useQuery<SearchResponse>({
    queryKey: ["search", debouncedQuery, currentPage],
    queryFn: async () => {
      if (!debouncedQuery)
        return {
          type: "exact_code",
          results: [],
          pagination: { page: 1, limit: pageSize, total: 0, totalPages: 0 },
        };
      const response = await axios.get(
        `/api/search?query=${encodeURIComponent(
          debouncedQuery
        )}&page=${currentPage}&limit=${pageSize}&jurisdictionId=${1}&userId=${
          session?.user?.id
        }`
      );
      return response.data;
    },
    enabled: !!debouncedQuery,
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getSearchTypeLabel = (type: string) => {
    switch (type) {
      case "exact_code":
        return "Exact Code Match";
      case "exact_title":
        return "Exact Title Match";
      case "partial_code":
        return "Partial Code Match";
      case "synonym":
        return "Synonym Match";
      case "ai_strict":
        return "AI Match";
      default:
        return "AI Refined Selection";
    }
  };

  const getSearchTypeColor = (type: string) => {
    switch (type) {
      case "exact_code":
        return "bg-blue-100 text-blue-800";
      case "exact_title":
        return "bg-green-100 text-green-800";
      case "partial_code":
        return "bg-yellow-100 text-yellow-800";
      case "synonym":
        return "bg-purple-100 text-purple-800";
      case "ai":
        return "bg-orange-100 text-orange-800";
      case "ai_strict":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Medical Billing Code Search
              </h1>
              <h4 className="text-m text-gray-900 mt-2">
                Search for medical billing codes by code, title, or visit
                description.
              </h4>
            </div>
            <Link href="/signup">
              <Button variant="outline">Sign Up for Full Access</Button>
            </Link>
          </div>

          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="mb-6">
              <textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter code or description..."
                className="w-full min-h-[4rem] p-2 border rounded-md resize-y"
                rows={2}
              />
            </div>

            {isLoading && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Searching...</p>
              </div>
            )}

            {searchResponse && (
              <div className="space-y-6">
                <div className="text-sm text-gray-500">
                  Search Type: {getSearchTypeLabel(searchResponse.type)}
                </div>

                {searchResponse.search_types_used.includes("ai_strict") && (
                  <div className="bg-green-50 p-4 rounded-lg mb-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">
                      High Confidence Matches
                    </h3>
                    <p className="text-sm text-green-700">
                      These matches have a very high similarity to your search
                      query.
                    </p>
                  </div>
                )}

                {searchResponse.results.length > 0 ? (
                  <div className="space-y-4">
                    {searchResponse.results.map((result) => (
                      <div
                        key={result.code}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-semibold">
                              {result.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {result.displayCode}
                            </p>
                            {result.description && (
                              <p className="mt-2 text-gray-700">
                                {result.description}
                              </p>
                            )}
                            {result.searchType && (
                              <p
                                className={`mt-1 text-sm px-2 py-1 rounded-full inline-block ${getSearchTypeColor(
                                  result.searchType
                                )}`}
                              >
                                {getSearchTypeLabel(result.searchType)}
                              </p>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.section.title} ({result.section.code})
                          </div>
                        </div>
                      </div>
                    ))}

                    {searchResponse.pagination.totalPages > 1 && (
                      <div className="flex justify-center space-x-2 mt-6">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="px-4 py-2 border rounded-md disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <span className="px-4 py-2">
                          Page {currentPage} of{" "}
                          {searchResponse.pagination.totalPages}
                        </span>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={
                            currentPage === searchResponse.pagination.totalPages
                          }
                          className="px-4 py-2 border rounded-md disabled:opacity-50"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No results found. Try a different search term.
                  </div>
                )}
              </div>
            )}

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Want to do more with billing codes?
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                Sign up for full access to create and manage billing claims,
                track submissions, and more.
              </p>
              <Link href="/signup">
                <Button>Sign Up Now</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
