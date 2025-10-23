import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import BillingCodeConfigurationModal from "../components/BillingCodeConfigurationModal";
import { billingCodesAPI } from "../services/api";
import { BillingCode } from "../types";

interface CodeSubSelection {
  codeId: number;
  serviceDate: string | null;
  serviceEndDate: string | null;
  bilateralIndicator: string | null;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
  numberOfUnits: number | null;
  specialCircumstances: string | null;
}

const BillingCodeSearchScreen = ({ navigation }: any) => {
  const route = useRoute();
  const {
    onSelect,
    existingCodes = [],
    serviceDate,
    presetBillingCodeIds,
  } = route.params as {
    onSelect: (
      codes: BillingCode[],
      subSelections?: CodeSubSelection[]
    ) => void;
    existingCodes?: BillingCode[];
    serviceDate?: string;
    presetBillingCodeIds?: number[];
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCodes, setSelectedCodes] = useState<BillingCode[]>([]);
  const [codeSubSelections, setCodeSubSelections] = useState<
    CodeSubSelection[]
  >([]);
  const [showSubSelectionModal, setShowSubSelectionModal] = useState(false);
  const [currentCodeForSubSelection, setCurrentCodeForSubSelection] =
    useState<BillingCode | null>(null);

  const { data: billingCodes, isLoading } = useQuery({
    queryKey: ["billing-codes-search", searchQuery],
    queryFn: () => billingCodesAPI.search(searchQuery),
    enabled: searchQuery.length > 0,
  });

  // Preselect codes if provided via route params (e.g., frequent codes shortcut)
  useEffect(() => {
    const preloadCodes = async () => {
      if (!presetBillingCodeIds || presetBillingCodeIds.length === 0) return;
      try {
        // Fetch full code details
        const fetchedCodes: BillingCode[] = [];
        for (const id of presetBillingCodeIds) {
          const full = await billingCodesAPI.getById(id);
          fetchedCodes.push(full);
        }

        // Initialize selections and sub-selections
        const newSelections: BillingCode[] = [];
        const newSubSelections: CodeSubSelection[] = [];

        fetchedCodes.forEach((code) => {
          // Avoid duplicates
          if (newSelections.some((c) => c.id === code.id)) return;
          newSelections.push(code);

          if (requiresExtraSelections(code)) {
            const calculatedDates = calculateServiceDates(code);
            const defaultServiceDate = !isType57Code(code)
              ? serviceDate || new Date().toISOString().split("T")[0]
              : calculatedDates.serviceDate;
            newSubSelections.push({
              codeId: code.id,
              serviceDate: defaultServiceDate,
              serviceEndDate: calculatedDates.serviceEndDate,
              bilateralIndicator: null,
              serviceStartTime: null,
              serviceEndTime: null,
              numberOfUnits: 1,
              specialCircumstances: null,
            });
          } else {
            const defaultServiceDate = !isType57Code(code)
              ? serviceDate || new Date().toISOString().split("T")[0]
              : null;
            newSubSelections.push({
              codeId: code.id,
              serviceDate: defaultServiceDate,
              serviceEndDate: null,
              bilateralIndicator: null,
              serviceStartTime: null,
              serviceEndTime: null,
              numberOfUnits: 1,
              specialCircumstances: null,
            });
          }
        });

        setSelectedCodes(newSelections);
        setCodeSubSelections(newSubSelections);

        // If any requires extra selections, open modal for the first
        const firstRequiring = newSelections.find((c) =>
          requiresExtraSelections(c)
        );
        if (firstRequiring) {
          setCurrentCodeForSubSelection(firstRequiring);
          setShowSubSelectionModal(true);
        }
      } catch (error) {
        console.error("Error preloading billing codes:", error);
      }
    };

    preloadCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggleCode = (code: BillingCode) => {
    const isSelected = selectedCodes.some((c) => c.id === code.id);
    if (isSelected) {
      setSelectedCodes(selectedCodes.filter((c) => c.id !== code.id));
      // Remove sub-selections for this code
      setCodeSubSelections((prev) => prev.filter((s) => s.codeId !== code.id));
    } else {
      setSelectedCodes([...selectedCodes, code]);

      // Check if the code requires extra selections
      if (requiresExtraSelections(code)) {
        // Initialize sub-selections for this code
        const existingSubSelection = codeSubSelections.find(
          (s) => s.codeId === code.id
        );
        if (!existingSubSelection) {
          const calculatedDates = calculateServiceDates(code);
          // For non-type 57 codes, set the service date from route params or today's date
          const defaultServiceDate = !isType57Code(code)
            ? serviceDate || new Date().toISOString().split("T")[0]
            : calculatedDates.serviceDate;

          setCodeSubSelections((prev) => [
            ...prev,
            {
              codeId: code.id,
              serviceDate: defaultServiceDate,
              serviceEndDate: calculatedDates.serviceEndDate,
              bilateralIndicator: null,
              serviceStartTime: null,
              serviceEndTime: null,
              numberOfUnits: 1,
              specialCircumstances: null,
            },
          ]);
        }
        // Show sub-selection modal
        setCurrentCodeForSubSelection(code);
        setShowSubSelectionModal(true);
      } else {
        // For codes that don't require extra selections, add default sub-selection
        const existingSubSelection = codeSubSelections.find(
          (s) => s.codeId === code.id
        );
        if (!existingSubSelection) {
          // For non-type 57 codes, set the service date from route params or today's date
          const defaultServiceDate = !isType57Code(code)
            ? serviceDate || new Date().toISOString().split("T")[0]
            : null;

          setCodeSubSelections((prev) => [
            ...prev,
            {
              codeId: code.id,
              serviceDate: defaultServiceDate,
              serviceEndDate: null,
              bilateralIndicator: null,
              serviceStartTime: null,
              serviceEndTime: null,
              numberOfUnits: 1,
              specialCircumstances: null,
            },
          ]);
        }
      }
    }
  };

  const handleUpdateSubSelection = (
    codeId: number,
    updates: Partial<CodeSubSelection>
  ) => {
    setCodeSubSelections((prev) =>
      prev.map((s) => (s.codeId === codeId ? { ...s, ...updates } : s))
    );
  };

  const handleSubmit = () => {
    // Validate that all non-type 57 codes have service dates
    const codesWithoutServiceDates = selectedCodes.filter((code) => {
      if (isType57Code(code)) return false; // Type 57 codes don't need validation here

      const subSelection = getSubSelectionForCode(code.id);
      return !subSelection?.serviceDate;
    });

    if (codesWithoutServiceDates.length > 0) {
      const codeNames = codesWithoutServiceDates
        .map((code) => code.code)
        .join(", ");
      Alert.alert(
        "Service Date Required",
        `The following codes require a service date: ${codeNames}. Please configure all codes before submitting.`
      );
      return;
    }

    onSelect(selectedCodes, codeSubSelections);
    navigation.goBack();
  };

  const isCodeSelected = (code: BillingCode) => {
    return selectedCodes.some((c) => c.id === code.id);
  };

  const getSubSelectionForCode = (codeId: number) => {
    return codeSubSelections.find((s) => s.codeId === codeId);
  };

  const isType57Code = (code: BillingCode) => {
    return code.billing_record_type === 57;
  };

  const isWorXSection = (code: BillingCode) => {
    return code.section.code === "W" || code.section.code === "X";
  };

  const isHSection = (code: BillingCode) => {
    return code.section.code === "H";
  };

  // Function to check if a code requires any extra selections
  const requiresExtraSelections = (code: BillingCode): boolean => {
    // All codes except type 57 require service date input
    if (!isType57Code(code)) {
      return true;
    }

    // Check if multiple units are required
    if (code.multiple_unit_indicator === "U") {
      return true;
    }

    // Check if start/stop time is required
    if (code.start_time_required === "Y" || code.stop_time_required === "Y") {
      return true;
    }

    // Check if bilateral indicator is required (has "Bilateral" in title)
    if (code.title.includes("Bilateral")) {
      return true;
    }

    // Check if special circumstances are required (W/X sections)
    if (isWorXSection(code)) {
      return true;
    }

    // Check if special circumstances are required (H section)
    if (isHSection(code)) {
      return true;
    }

    return false;
  };

  // Function to calculate service dates for type 57 codes
  const calculateServiceDates = (
    code: BillingCode
  ): { serviceDate: string | null; serviceEndDate: string | null } => {
    if (!serviceDate || code.billing_record_type !== 57) {
      return { serviceDate: null, serviceEndDate: null };
    }

    // Check if this code has previous codes defined and if any of them are already selected
    if (code.previousCodes && code.previousCodes.length > 0) {
      // Find if any of the previous codes are already in the existing codes
      const selectedPreviousCodes = selectedCodes.filter((existingCode) =>
        code.previousCodes?.some(
          (prevCode) => prevCode.previous_code.id === existingCode.id
        )
      );

      if (selectedPreviousCodes.length > 0) {
        // Find the most recent previous code and calculate dates
        const previousCode =
          selectedPreviousCodes[selectedPreviousCodes.length - 1];
        const previousSubSelection = codeSubSelections.find(
          (s) => s.codeId === previousCode.id
        );

        if (previousSubSelection) {
          const previousStartDate = new Date(
            previousSubSelection.serviceDate || serviceDate
          );

          // Set the previous code's end date as previous start date + day range - 1
          let previousEndDate = null;
          if (previousCode.day_range && previousCode.day_range > 0) {
            const endDate = new Date(previousStartDate);
            endDate.setDate(endDate.getDate() + previousCode.day_range - 1);
            previousEndDate = endDate.toISOString().split("T")[0];

            // Update the previous code's end date in sub selections
            handleUpdateSubSelection(previousCode.id, {
              serviceEndDate: previousEndDate,
            });
          }

          // Set the new code's start date to previous start date + day range
          let serviceStartDate = serviceDate;
          if (previousCode.day_range && previousCode.day_range > 0) {
            const newStartDate = new Date(previousStartDate);
            newStartDate.setDate(
              newStartDate.getDate() + previousCode.day_range
            );
            serviceStartDate = newStartDate.toISOString().split("T")[0];
          } else {
            // If previous code has no day range, start the next day
            const newStartDate = new Date(previousStartDate);
            newStartDate.setDate(newStartDate.getDate() + 1);
            serviceStartDate = newStartDate.toISOString().split("T")[0];
          }

          // For type 57 codes, do not set an end date initially
          return { serviceDate: serviceStartDate, serviceEndDate: null };
        }
      }
    }

    // If no previous codes are selected or no previous codes defined, use the service date
    // For type 57 codes, do not set an end date initially
    return { serviceDate: serviceDate, serviceEndDate: null };
  };

  const handleSaveSubSelection = (updatedSubSelection: CodeSubSelection) => {
    setCodeSubSelections((prev) =>
      prev.map((s) =>
        s.codeId === updatedSubSelection.codeId ? updatedSubSelection : s
      )
    );
  };

  const renderBillingCode = ({ item }: { item: BillingCode }) => (
    <TouchableOpacity onPress={() => handleToggleCode(item)}>
      <Card
        style={[styles.card, isCodeSelected(item) && styles.selectedCard]}
        mode="outlined"
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={styles.cardHeaderRight}>
              <Chip mode="flat" style={styles.codeChip}>
                {item.code}
              </Chip>
              {isCodeSelected(item) && (
                <Ionicons name="checkmark-circle" size={24} color="#2563eb" />
              )}
            </View>
          </View>
          {item.description && (
            <Text style={styles.cardDescription}>{item.description}</Text>
          )}
          <View style={styles.cardMeta}>
            <Text style={styles.metaText}>Section: {item.section.title}</Text>
            <Text style={styles.metaText}>
              Jurisdiction: {item.jurisdiction.name}
            </Text>
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
        <Text style={styles.headerTitle}>Select Billing Codes</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search billing codes..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
        />
      </View>

      {selectedCodes.length > 0 && (
        <View style={styles.selectedCodesContainer}>
          <Text style={styles.selectedCodesTitle}>
            Selected Codes ({selectedCodes.length})
          </Text>
          <View style={styles.selectedCodesList}>
            {selectedCodes.map((code) => (
              <Chip
                key={code.id}
                mode="flat"
                style={styles.selectedCodeChip}
                onPress={() => handleToggleCode(code)}
              >
                {code.code}
              </Chip>
            ))}
          </View>
        </View>
      )}

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : billingCodes && billingCodes.length > 0 ? (
        <FlatList
          data={billingCodes}
          renderItem={renderBillingCode}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
      ) : searchQuery.length > 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No billing codes found.</Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Enter a search term to find billing codes.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
          disabled={selectedCodes.length === 0}
        >
          Select {selectedCodes.length} Code
          {selectedCodes.length !== 1 ? "s" : ""}
        </Button>
      </View>

      <BillingCodeConfigurationModal
        visible={showSubSelectionModal}
        billingCode={currentCodeForSubSelection}
        subSelection={
          currentCodeForSubSelection
            ? getSubSelectionForCode(currentCodeForSubSelection.id) || null
            : null
        }
        onClose={() => setShowSubSelectionModal(false)}
        onSave={handleSaveSubSelection}
        serviceDate={serviceDate}
        physician={null}
      />
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
  selectedCodesContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  selectedCodesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  selectedCodesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedCodeChip: {
    backgroundColor: "#dbeafe",
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
  selectedCard: {
    borderColor: "#2563eb",
    backgroundColor: "#f0f9ff",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  footer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  submitButton: {
    backgroundColor: "#2563eb",
  },
});

export default BillingCodeSearchScreen;
