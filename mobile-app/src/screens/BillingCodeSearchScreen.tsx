import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { billingCodesAPI } from "../services/api";
import { BillingCode } from "../types";

interface CodeSubSelection {
  codeId: number;
  serviceDate: string | null;
  serviceEndDate: string | null;
  bilateralIndicator: string | null;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
  numberOfUnits: number;
  specialCircumstances: string | null;
}

const BillingCodeSearchScreen = ({ navigation }: any) => {
  const route = useRoute();
  const {
    onSelect,
    existingCodes = [],
    serviceDate,
  } = route.params as {
    onSelect: (
      codes: BillingCode[],
      subSelections?: CodeSubSelection[]
    ) => void;
    existingCodes?: BillingCode[];
    serviceDate?: string;
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

  const renderSubSelectionModal = () => {
    if (!currentCodeForSubSelection) return null;

    const subSelection = getSubSelectionForCode(currentCodeForSubSelection.id);
    if (!subSelection) return null;

    return (
      <Modal
        visible={showSubSelectionModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSubSelectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.subSelectionModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Configure {currentCodeForSubSelection.code}
              </Text>
              <TouchableOpacity onPress={() => setShowSubSelectionModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.subSelectionScrollView}>
              {/* Service Date - Required for all codes except Type 57 */}
              {!isType57Code(currentCodeForSubSelection) && (
                <View style={styles.subSelectionSection}>
                  <Text style={styles.subSelectionSectionTitle}>
                    Service Date <Text style={styles.requiredText}>*</Text>
                  </Text>
                  <TextInput
                    style={styles.dateInput}
                    placeholder="YYYY-MM-DD"
                    value={subSelection.serviceDate || ""}
                    onChangeText={(text) =>
                      handleUpdateSubSelection(currentCodeForSubSelection.id, {
                        serviceDate: text,
                      })
                    }
                  />
                  <Text style={styles.dateNote}>
                    Enter the date when this service was provided
                  </Text>
                </View>
              )}

              {/* Service Start/End Date - Only for Type 57 codes */}
              {isType57Code(currentCodeForSubSelection) && (
                <View style={styles.subSelectionSection}>
                  <Text style={styles.subSelectionSectionTitle}>
                    Service Dates
                  </Text>
                  <View style={styles.dateRow}>
                    <View style={styles.dateInputContainer}>
                      <Text style={styles.dateLabel}>Start Date</Text>
                      <TextInput
                        style={[styles.dateInput, styles.readOnlyInput]}
                        placeholder="YYYY-MM-DD"
                        value={subSelection.serviceDate || ""}
                        editable={false}
                      />
                    </View>
                    <View style={styles.dateInputContainer}>
                      <Text style={styles.dateLabel}>End Date</Text>
                      <TextInput
                        style={[styles.dateInput, styles.readOnlyInput]}
                        placeholder="YYYY-MM-DD"
                        value={subSelection.serviceEndDate || ""}
                        editable={false}
                      />
                    </View>
                  </View>
                  <Text style={styles.calculatedDateNote}>
                    Dates are automatically calculated based on service date and
                    previous codes
                  </Text>
                </View>
              )}

              {/* Units - Only for codes with multiple_unit_indicator === "U" */}
              {currentCodeForSubSelection.multiple_unit_indicator === "U" && (
                <View style={styles.subSelectionSection}>
                  <Text style={styles.subSelectionSectionTitle}>
                    Number of Units
                    {currentCodeForSubSelection.max_units && (
                      <Text style={styles.maxUnitsText}>
                        {" "}
                        (Max: {currentCodeForSubSelection.max_units})
                      </Text>
                    )}
                  </Text>
                  <View style={styles.unitsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.unitButton,
                        subSelection.numberOfUnits <= 1
                          ? styles.disabledButton
                          : null,
                      ]}
                      onPress={() => {
                        if (subSelection.numberOfUnits > 1) {
                          handleUpdateSubSelection(
                            currentCodeForSubSelection.id,
                            {
                              numberOfUnits: subSelection.numberOfUnits - 1,
                            }
                          );
                        }
                      }}
                      disabled={subSelection.numberOfUnits <= 1}
                    >
                      <Text style={styles.unitButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.unitsInput}
                      value={subSelection.numberOfUnits.toString()}
                      onChangeText={(text) => {
                        const value = parseInt(text) || 1;
                        const maxUnits =
                          currentCodeForSubSelection.max_units || value;
                        handleUpdateSubSelection(
                          currentCodeForSubSelection.id,
                          {
                            numberOfUnits: Math.min(value, maxUnits),
                          }
                        );
                      }}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={[
                        styles.unitButton,
                        currentCodeForSubSelection.max_units &&
                        subSelection.numberOfUnits >=
                          currentCodeForSubSelection.max_units
                          ? styles.disabledButton
                          : null,
                      ]}
                      onPress={() => {
                        const maxUnits =
                          currentCodeForSubSelection.max_units ||
                          subSelection.numberOfUnits + 1;
                        handleUpdateSubSelection(
                          currentCodeForSubSelection.id,
                          {
                            numberOfUnits: Math.min(
                              subSelection.numberOfUnits + 1,
                              maxUnits
                            ),
                          }
                        );
                      }}
                      disabled={
                        !!(
                          currentCodeForSubSelection.max_units &&
                          subSelection.numberOfUnits >=
                            currentCodeForSubSelection.max_units
                        )
                      }
                    >
                      <Text style={styles.unitButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Service Start/End Time */}
              {(currentCodeForSubSelection.start_time_required === "Y" ||
                currentCodeForSubSelection.stop_time_required === "Y") && (
                <View style={styles.subSelectionSection}>
                  <Text style={styles.subSelectionSectionTitle}>
                    Service Times
                  </Text>
                  <View style={styles.timeRow}>
                    {currentCodeForSubSelection.start_time_required === "Y" && (
                      <View style={styles.timeInputContainer}>
                        <Text style={styles.timeLabel}>Start Time</Text>
                        <TextInput
                          style={styles.timeInput}
                          placeholder="HH:MM"
                          value={subSelection.serviceStartTime || ""}
                          onChangeText={(text) =>
                            handleUpdateSubSelection(
                              currentCodeForSubSelection.id,
                              { serviceStartTime: text }
                            )
                          }
                        />
                      </View>
                    )}
                    {currentCodeForSubSelection.stop_time_required === "Y" && (
                      <View style={styles.timeInputContainer}>
                        <Text style={styles.timeLabel}>End Time</Text>
                        <TextInput
                          style={styles.timeInput}
                          placeholder="HH:MM"
                          value={subSelection.serviceEndTime || ""}
                          onChangeText={(text) =>
                            handleUpdateSubSelection(
                              currentCodeForSubSelection.id,
                              { serviceEndTime: text }
                            )
                          }
                        />
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Bilateral Indicator - Only for codes with "Bilateral" in title */}
              {currentCodeForSubSelection.title.includes("Bilateral") && (
                <View style={styles.subSelectionSection}>
                  <Text style={styles.subSelectionSectionTitle}>
                    Bilateral Indicator
                  </Text>
                  <View style={styles.bilateralContainer}>
                    <TouchableOpacity
                      style={[
                        styles.bilateralButton,
                        subSelection.bilateralIndicator === "L" &&
                          styles.selectedBilateralButton,
                      ]}
                      onPress={() =>
                        handleUpdateSubSelection(
                          currentCodeForSubSelection.id,
                          {
                            bilateralIndicator:
                              subSelection.bilateralIndicator === "L"
                                ? null
                                : "L",
                          }
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.bilateralButtonText,
                          subSelection.bilateralIndicator === "L" &&
                            styles.selectedBilateralButtonText,
                        ]}
                      >
                        Left
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.bilateralButton,
                        subSelection.bilateralIndicator === "R" &&
                          styles.selectedBilateralButton,
                      ]}
                      onPress={() =>
                        handleUpdateSubSelection(
                          currentCodeForSubSelection.id,
                          {
                            bilateralIndicator:
                              subSelection.bilateralIndicator === "R"
                                ? null
                                : "R",
                          }
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.bilateralButtonText,
                          subSelection.bilateralIndicator === "R" &&
                            styles.selectedBilateralButtonText,
                        ]}
                      >
                        Right
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.bilateralButton,
                        subSelection.bilateralIndicator === "B" &&
                          styles.selectedBilateralButton,
                      ]}
                      onPress={() =>
                        handleUpdateSubSelection(
                          currentCodeForSubSelection.id,
                          {
                            bilateralIndicator:
                              subSelection.bilateralIndicator === "B"
                                ? null
                                : "B",
                          }
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.bilateralButtonText,
                          subSelection.bilateralIndicator === "B" &&
                            styles.selectedBilateralButtonText,
                        ]}
                      >
                        Both
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Special Circumstances - W/X Section */}
              {isWorXSection(currentCodeForSubSelection) && (
                <View style={styles.subSelectionSection}>
                  <Text style={styles.subSelectionSectionTitle}>
                    Special Circumstances{" "}
                    <Text style={styles.requiredText}>*</Text>
                  </Text>
                  <View style={styles.specialCircumstancesContainer}>
                    <TouchableOpacity
                      style={[
                        styles.specialCircumstancesButton,
                        subSelection.specialCircumstances === "TF" &&
                          styles.selectedSpecialCircumstancesButton,
                      ]}
                      onPress={() =>
                        handleUpdateSubSelection(
                          currentCodeForSubSelection.id,
                          {
                            specialCircumstances: "TF",
                          }
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.specialCircumstancesButtonText,
                          subSelection.specialCircumstances === "TF" &&
                            styles.selectedSpecialCircumstancesButtonText,
                        ]}
                      >
                        Technical
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.specialCircumstancesButton,
                        subSelection.specialCircumstances === "PF" &&
                          styles.selectedSpecialCircumstancesButton,
                      ]}
                      onPress={() =>
                        handleUpdateSubSelection(
                          currentCodeForSubSelection.id,
                          {
                            specialCircumstances: "PF",
                          }
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.specialCircumstancesButtonText,
                          subSelection.specialCircumstances === "PF" &&
                            styles.selectedSpecialCircumstancesButtonText,
                        ]}
                      >
                        Interpretation
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.specialCircumstancesButton,
                        subSelection.specialCircumstances === "CF" &&
                          styles.selectedSpecialCircumstancesButton,
                      ]}
                      onPress={() =>
                        handleUpdateSubSelection(
                          currentCodeForSubSelection.id,
                          {
                            specialCircumstances: "CF",
                          }
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.specialCircumstancesButtonText,
                          subSelection.specialCircumstances === "CF" &&
                            styles.selectedSpecialCircumstancesButtonText,
                        ]}
                      >
                        Both
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Special Circumstances - H Section */}
              {isHSection(currentCodeForSubSelection) && (
                <View style={styles.subSelectionSection}>
                  <Text style={styles.subSelectionSectionTitle}>
                    Special Circumstances
                  </Text>
                  <View style={styles.specialCircumstancesContainer}>
                    <TouchableOpacity
                      style={[
                        styles.specialCircumstancesButton,
                        subSelection.specialCircumstances === "TA" &&
                          styles.selectedSpecialCircumstancesButton,
                      ]}
                      onPress={() =>
                        handleUpdateSubSelection(
                          currentCodeForSubSelection.id,
                          {
                            specialCircumstances:
                              subSelection.specialCircumstances === "TA"
                                ? null
                                : "TA",
                          }
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.specialCircumstancesButtonText,
                          subSelection.specialCircumstances === "TA" &&
                            styles.selectedSpecialCircumstancesButtonText,
                        ]}
                      >
                        Takeover
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtonContainer}>
              <Button
                mode="contained"
                onPress={() => setShowSubSelectionModal(false)}
                style={styles.modalButton}
                labelStyle={styles.modalButtonLabel}
              >
                Done
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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

      {renderSubSelectionModal()}
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
  // Sub-selection modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  subSelectionModalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  subSelectionScrollView: {
    padding: 20,
  },
  subSelectionSection: {
    marginBottom: 24,
  },
  subSelectionSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  requiredText: {
    color: "#ef4444",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  unitsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  unitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  unitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#374151",
  },
  unitsInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 8,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "#ffffff",
  },
  maxUnitsText: {
    fontSize: 12,
    color: "#6b7280",
  },
  bilateralContainer: {
    flexDirection: "row",
    gap: 8,
  },
  bilateralButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  selectedBilateralButton: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  bilateralButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedBilateralButtonText: {
    color: "#1e40af",
    fontWeight: "600",
  },
  specialCircumstancesContainer: {
    flexDirection: "row",
    gap: 8,
  },
  specialCircumstancesButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  selectedSpecialCircumstancesButton: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  specialCircumstancesButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedSpecialCircumstancesButtonText: {
    color: "#1e40af",
    fontWeight: "600",
  },
  modalButtonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  modalButton: {
    backgroundColor: "#2563eb",
  },
  modalButtonLabel: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  readOnlyInput: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  calculatedDateNote: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 8,
  },
  dateNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
});

export default BillingCodeSearchScreen;
