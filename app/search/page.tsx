"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
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
        )}&page=${currentPage}&limit=${pageSize}`
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
      case "synonym":
        return "Synonym Match";
      case "ai":
        return "AI Semantic Search";
      case "ai_strict":
        return "AI Strict Match";
      case "ai_refined":
        return "AI Refined Selection";
      default:
        return "Search Results";
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Medical Billing Code Search
        </h1>
        <h4 className="text-m text-gray-900 mb-8 pl-2">
          Search for medical billing codes by code, title, or visit description.
        </h4>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter code or description..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        </div>
      </div>
    </Layout>
  );
}
