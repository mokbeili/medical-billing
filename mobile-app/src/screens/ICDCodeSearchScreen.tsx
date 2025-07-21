import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Card, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { icdCodesAPI } from "../services/api";
import { ICDCode } from "../types";

const ICDCodeSearchScreen = ({ navigation }: any) => {
  const route = useRoute();
  const { onSelect } = route.params as {
    onSelect: (code: ICDCode) => void;
  };
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: icdCodes,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["icd-codes-search", searchQuery],
    queryFn: () => icdCodesAPI.search(searchQuery),
    enabled: searchQuery.length > 0,
  });

  // Debug logging
  console.log("ICD Search Screen - Query:", searchQuery);
  console.log("ICD Search Screen - Loading:", isLoading);
  console.log("ICD Search Screen - Error:", error);
  console.log("ICD Search Screen - Results:", icdCodes?.length || 0);

  const handleSelectCode = (code: ICDCode) => {
    onSelect(code);
    navigation.goBack();
  };

  const renderICDCode = ({ item }: { item: ICDCode }) => (
    <TouchableOpacity onPress={() => handleSelectCode(item)}>
      <Card style={styles.card} mode="outlined">
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.description}</Text>
            <Chip mode="flat" style={styles.codeChip}>
              {item.code}
            </Chip>
          </View>
          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>Version: {item.version}</Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Search ICD Codes</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search ICD codes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : icdCodes && icdCodes.length > 0 ? (
        <FlatList
          data={icdCodes}
          renderItem={renderICDCode}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      ) : searchQuery.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No ICD codes found.</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Enter a search term to find ICD codes.
          </Text>
        </View>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  searchContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    backgroundColor: "#ffffff",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    flex: 1,
    marginRight: 8,
  },
  codeChip: {
    backgroundColor: "#dbeafe",
  },
  cardMeta: {
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  metaText: {
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
});

export default ICDCodeSearchScreen;
