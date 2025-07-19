import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Card, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { aiPromptsAPI, billingCodesAPI } from "../services/api";
import { AIPrompt, BillingCode } from "../types";

const DashboardScreen = () => {
  const [activeTab, setActiveTab] = useState<"billing-codes" | "ai-prompts">(
    "billing-codes"
  );

  const {
    data: billingCodes,
    isLoading: billingCodesLoading,
    refetch: refetchBillingCodes,
  } = useQuery({
    queryKey: ["billing-codes"],
    queryFn: billingCodesAPI.getAll,
  });

  const {
    data: aiPrompts,
    isLoading: aiPromptsLoading,
    refetch: refetchAIPrompts,
  } = useQuery({
    queryKey: ["ai-prompts"],
    queryFn: aiPromptsAPI.getAll,
  });

  const renderBillingCode = (code: BillingCode) => (
    <Card key={code.id} style={styles.card} mode="outlined">
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{code.title}</Text>
          <Chip mode="flat" style={styles.codeChip}>
            {code.code}
          </Chip>
        </View>
        {code.description && (
          <Text style={styles.cardDescription}>{code.description}</Text>
        )}
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>Section: {code.section.title}</Text>
          <Text style={styles.metaText}>
            Jurisdiction: {code.jurisdiction.name}
          </Text>
          <Text style={styles.metaText}>Provider: {code.provider.name}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderAIPrompt = (prompt: AIPrompt) => (
    <Card key={prompt.id} style={styles.card} mode="outlined">
      <Card.Content>
        <Text style={styles.cardTitle}>{prompt.title}</Text>
        <Text style={styles.cardDescription}>{prompt.prompt}</Text>
        <View style={styles.cardMeta}>
          <Text style={styles.metaText}>
            Jurisdiction: {prompt.jurisdiction.name}
          </Text>
          <Text style={styles.metaText}>Provider: {prompt.provider.name}</Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Manage billing codes and AI prompts for different jurisdictions and
          providers
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "billing-codes" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("billing-codes")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "billing-codes" && styles.activeTabText,
            ]}
          >
            Billing Codes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "ai-prompts" && styles.activeTab]}
          onPress={() => setActiveTab("ai-prompts")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "ai-prompts" && styles.activeTabText,
            ]}
          >
            AI Prompts
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={billingCodesLoading || aiPromptsLoading}
            onRefresh={() => {
              refetchBillingCodes();
              refetchAIPrompts();
            }}
          />
        }
      >
        {activeTab === "billing-codes" ? (
          <View style={styles.tabContent}>
            {billingCodesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading billing codes...</Text>
              </View>
            ) : billingCodes && billingCodes.length > 0 ? (
              billingCodes.map(renderBillingCode)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No billing codes found.</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.tabContent}>
            {aiPromptsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2563eb" />
                <Text style={styles.loadingText}>Loading AI prompts...</Text>
              </View>
            ) : aiPrompts && aiPrompts.length > 0 ? (
              aiPrompts.map(renderAIPrompt)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No AI prompts found.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
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
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
  },
  tabText: {
    fontSize: 16,
    color: "#64748b",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  tabContent: {
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
  cardDescription: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 8,
    lineHeight: 20,
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
  },
});

export default DashboardScreen;
