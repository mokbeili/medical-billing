"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useEffect, useState } from "react";

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
}

interface SearchResponse {
  type:
    | "exact_code"
    | "exact_title"
    | "synonym"
    | "ai"
    | "ai_strict"
    | "ai_refined";
  results: SearchResult[];
  refined_selection?: string;
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the search query

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResponse, isLoading } = useQuery<SearchResponse>({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return { type: "exact_code", results: [] };
      const response = await axios.get(
        `/api/search?query=${encodeURIComponent(debouncedQuery)}`
      );
      return response.data;
    },
    enabled: !!debouncedQuery,
  });

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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Medical Billing Code Search</h1>

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

          {searchResponse.type === "ai_strict" && (
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                High Confidence Matches
              </h3>
              <p className="text-sm text-green-700">
                These matches have a very high similarity to your search query.
              </p>
            </div>
          )}

          {searchResponse.type === "ai_refined" &&
            searchResponse.refined_selection && (
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">
                  AI Refined Selection
                </h3>
                <pre className="whitespace-pre-wrap text-sm text-blue-900">
                  {searchResponse.refined_selection}
                </pre>
              </div>
            )}

          {searchResponse.results.length > 0 ? (
            <div className="space-y-4">
              {searchResponse.results.map((result) => (
                <div
                  key={result.id}
                  className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold text-blue-600">
                        {result.code}
                      </h3>
                      <p className="text-gray-800 font-medium">
                        {result.title}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      Section: {result.section.code} - {result.section.title}
                    </div>
                  </div>
                  {result.description && (
                    <p className="mt-2 text-gray-700">{result.description}</p>
                  )}
                  {result.similarity && (
                    <div className="mt-2 text-sm text-gray-500">
                      Similarity Score: {(result.similarity * 100).toFixed(1)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No results found. Try a different search term.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
