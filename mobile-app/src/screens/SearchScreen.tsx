import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { searchAPI } from "../services/api";
import { SearchResponse, SearchResult } from "../types";

const SearchScreen = () => {
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

  const {
    data: searchResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["search", debouncedQuery, currentPage],
    queryFn: async (): Promise<SearchResponse> => {
      if (!debouncedQuery) {
        return {
          type: "combined",
          results: [],
          search_types_used: [],
          pagination: { page: 1, limit: pageSize, total: 0, totalPages: 0 },
        };
      }
      return searchAPI.search(debouncedQuery, currentPage, pageSize, 1);
    },
    enabled: !!debouncedQuery,
  });

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const getSearchTypeLabel = (type: string) => {
    switch (type) {
      case "exact_code":
        return "Exact Code";
      case "exact_title":
        return "Exact Title";
      case "partial_code":
        return "Partial Code";
      case "synonym":
        return "Text Match";
      case "ai_strict":
        return "AI Match";
      default:
        return "AI Refined";
    }
  };

  const getSearchTypeColor = (type: string) => {
    switch (type) {
      case "exact_code":
        return "#dbeafe";
      case "exact_title":
        return "#dcfce7";
      case "partial_code":
        return "#fef3c7";
      case "synonym":
        return "#f3e8ff";
      case "ai_strict":
        return "#fed7d7";
      default:
        return "#fef3c7";
    }
  };

  const renderSearchResult = (result: SearchResult) => (
    <Card key={result.id} style={styles.resultCard} mode="outlined">
      <Card.Content>
        <View style={styles.resultHeader}>
          <View style={styles.resultTitleContainer}>
            <Text style={styles.resultTitle}>{result.title}</Text>
            <Text style={styles.resultCode}>{result.displayCode}</Text>
          </View>
          <View style={styles.resultMeta}>
            <Text style={styles.sectionText}>
              {result.section.title} ({result.section.code})
            </Text>
            {result.searchType && (
              <Chip
                mode="flat"
                style={[
                  styles.searchTypeChip,
                  { backgroundColor: getSearchTypeColor(result.searchType) },
                ]}
                textStyle={styles.searchTypeText}
              >
                {getSearchTypeLabel(result.searchType)}
              </Chip>
            )}
          </View>
        </View>

        {result.description && (
          <Text style={styles.resultDescription}>{result.description}</Text>
        )}

        <View style={styles.resultDetails}>
          <Text style={styles.detailText}>
            Billing Record Type: {result.billing_record_type}
          </Text>
          <Text style={styles.detailText}>
            Referring Practitioner Required:{" "}
            {result.referring_practitioner_required ? "Yes" : "No"}
          </Text>
          <Text style={styles.detailText}>
            Multiple Unit Indicator: {result.multiple_unit_indicator}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Billing Code Search</Text>
        <Text style={styles.headerSubtitle}>
          AI-powered search for medical billing codes
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Enter code or description..."
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {searchResponse && (
        <ScrollView
          style={styles.resultsContainer}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refetch} />
          }
        >
          {searchResponse.search_types_used.includes("ai_strict") && (
            <Card style={styles.aiNoticeCard} mode="outlined">
              <Card.Content>
                <Text style={styles.aiNoticeTitle}>
                  High Confidence Matches
                </Text>
                <Text style={styles.aiNoticeText}>
                  These matches have a very high similarity to your search
                  query.
                </Text>
              </Card.Content>
            </Card>
          )}

          {searchResponse.results.length > 0 ? (
            <View style={styles.resultsList}>
              {searchResponse.results.map(renderSearchResult)}

              {searchResponse.pagination.totalPages > 1 && (
                <View style={styles.paginationContainer}>
                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      currentPage === 1 && styles.paginationButtonDisabled,
                    ]}
                    onPress={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <Text style={styles.paginationButtonText}>Previous</Text>
                  </TouchableOpacity>

                  <Text style={styles.paginationText}>
                    Page {currentPage} of {searchResponse.pagination.totalPages}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.paginationButton,
                      currentPage === searchResponse.pagination.totalPages &&
                        styles.paginationButtonDisabled,
                    ]}
                    onPress={() => handlePageChange(currentPage + 1)}
                    disabled={
                      currentPage === searchResponse.pagination.totalPages
                    }
                  >
                    <Text style={styles.paginationButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            debouncedQuery && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No results found. Try a different search term.
                </Text>
              </View>
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    backgroundColor: "#ffffff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
  resultsContainer: {
    flex: 1,
  },
  aiNoticeCard: {
    margin: 16,
    backgroundColor: "#dcfce7",
    borderColor: "#22c55e",
  },
  aiNoticeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#166534",
    marginBottom: 4,
  },
  aiNoticeText: {
    fontSize: 14,
    color: "#166534",
  },
  resultsList: {
    padding: 16,
  },
  resultCard: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  resultTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  resultCode: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "monospace",
  },
  resultMeta: {
    alignItems: "flex-end",
  },
  sectionText: {
    fontSize: 12,
    color: "#94a3b8",
    marginBottom: 4,
  },
  searchTypeChip: {
    height: 20,
  },
  searchTypeText: {
    fontSize: 10,
    color: "#1e293b",
  },
  resultDescription: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
    lineHeight: 20,
  },
  resultDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  detailText: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 16,
  },
  paginationButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    backgroundColor: "#ffffff",
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 14,
    color: "#475569",
  },
  paginationText: {
    fontSize: 14,
    color: "#64748b",
  },
});

export default SearchScreen;
