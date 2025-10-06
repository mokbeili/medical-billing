import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BillingCode } from "../types";
import { formatFullDate } from "../utils/dateUtils";

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

interface BillingCodeConfigurationModalProps {
  visible: boolean;
  billingCode: BillingCode | null;
  subSelection: CodeSubSelection | null;
  onClose: () => void;
  onSave: (subSelection: CodeSubSelection) => void;
  serviceDate?: string;
}

const BillingCodeConfigurationModal: React.FC<
  BillingCodeConfigurationModalProps
> = ({ visible, billingCode, subSelection, onClose, onSave, serviceDate }) => {
  const [localSubSelection, setLocalSubSelection] =
    useState<CodeSubSelection | null>(null);

  // Initialize local state when modal opens
  React.useEffect(() => {
    if (visible && subSelection) {
      setLocalSubSelection(subSelection);
    } else if (visible && !subSelection) {
      // If no subSelection provided, create default with today's date
      const today = new Date().toISOString().split("T")[0];
      setLocalSubSelection({
        codeId: billingCode?.id || 0,
        serviceDate: today,
        serviceEndDate: null,
        bilateralIndicator: null,
        serviceStartTime: null,
        serviceEndTime: null,
        numberOfUnits: 1,
        specialCircumstances: null,
      });
    }
  }, [visible, subSelection, billingCode]);

  if (!billingCode || !localSubSelection) return null;

  const handleUpdateSubSelection = (updates: Partial<CodeSubSelection>) => {
    setLocalSubSelection((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleSave = () => {
    if (localSubSelection) {
      onSave(localSubSelection);
    }
    onClose();
  };

  // Date navigation helpers - timezone safe
  const canDecrementDate = () => {
    if (!localSubSelection?.serviceDate) return false;
    // Parse date without timezone conversion
    const dateOnly = localSubSelection.serviceDate.split("T")[0];
    return dateOnly > "2020-01-01"; // Simple string comparison for YYYY-MM-DD
  };

  const canIncrementDate = () => {
    if (!localSubSelection?.serviceDate) return false;
    // Parse date without timezone conversion
    const dateOnly = localSubSelection.serviceDate.split("T")[0];
    const today = new Date().toISOString().split("T")[0];
    // Disable if current date is today or in the future
    return dateOnly < today;
  };

  const decrementDate = () => {
    if (!localSubSelection?.serviceDate || !canDecrementDate()) return;
    // Parse date manually to avoid timezone issues
    const dateOnly = localSubSelection.serviceDate.split("T")[0];
    const [year, month, day] = dateOnly.split("-").map(Number);

    // Create a local date and decrement
    const localDate = new Date(year, month - 1, day);
    localDate.setDate(localDate.getDate() - 1);

    // Format back to YYYY-MM-DD
    const newYear = localDate.getFullYear();
    const newMonth = String(localDate.getMonth() + 1).padStart(2, "0");
    const newDay = String(localDate.getDate()).padStart(2, "0");
    const newDate = `${newYear}-${newMonth}-${newDay}`;

    handleUpdateSubSelection({ serviceDate: newDate });
  };

  const incrementDate = () => {
    if (!localSubSelection?.serviceDate || !canIncrementDate()) return;
    // Parse date manually to avoid timezone issues
    const dateOnly = localSubSelection.serviceDate.split("T")[0];
    const [year, month, day] = dateOnly.split("-").map(Number);

    // Create a local date and increment
    const localDate = new Date(year, month - 1, day);
    localDate.setDate(localDate.getDate() + 1);

    // Format back to YYYY-MM-DD
    const newYear = localDate.getFullYear();
    const newMonth = String(localDate.getMonth() + 1).padStart(2, "0");
    const newDay = String(localDate.getDate()).padStart(2, "0");
    const newDate = `${newYear}-${newMonth}-${newDay}`;

    handleUpdateSubSelection({ serviceDate: newDate });
  };

  // Helper functions
  const isType57Code = (code: BillingCode) => {
    return code.billing_record_type === 57;
  };

  const isWorXSection = (code: BillingCode) => {
    return code.section.code === "W" || code.section.code === "X";
  };

  const isHSection = (code: BillingCode) => {
    return code.section.code === "H";
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.subSelectionModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Configure {billingCode.code}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.subSelectionScrollView}>
            {/* Service Date - Required for all codes except Type 57 */}
            {!isType57Code(billingCode) && (
              <View style={styles.subSelectionSection}>
                <Text style={styles.subSelectionSectionTitle}>
                  Service Date <Text style={styles.requiredText}>*</Text>
                </Text>
                <View style={styles.dateInputContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dateArrowButton,
                      !canDecrementDate() && styles.disabledDateArrowButton,
                    ]}
                    onPress={decrementDate}
                    disabled={!canDecrementDate()}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={20}
                      color={canDecrementDate() ? "#3b82f6" : "#d1d5db"}
                    />
                  </TouchableOpacity>
                  <TextInput
                    style={[styles.dateInput, styles.readOnlyInput]}
                    placeholder="YYYY-MM-DD"
                    value={formatFullDate(localSubSelection.serviceDate || "")}
                    editable={false}
                  />
                  <TouchableOpacity
                    style={[
                      styles.dateArrowButton,
                      !canIncrementDate() && styles.disabledDateArrowButton,
                    ]}
                    onPress={incrementDate}
                    disabled={!canIncrementDate()}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={canIncrementDate() ? "#3b82f6" : "#d1d5db"}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.dateNote}>
                  Use arrows to adjust date by one day (max: today)
                </Text>
              </View>
            )}

            {/* Service Start/End Date - Only for Type 57 codes */}
            {isType57Code(billingCode) && (
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
                      value={formatFullDate(
                        localSubSelection.serviceDate || ""
                      )}
                      editable={false}
                    />
                  </View>
                  <View style={styles.dateInputContainer}>
                    <Text style={styles.dateLabel}>End Date</Text>
                    <TextInput
                      style={[styles.dateInput, styles.readOnlyInput]}
                      placeholder="YYYY-MM-DD"
                      value={formatFullDate(
                        localSubSelection.serviceEndDate || ""
                      )}
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
            {billingCode.multiple_unit_indicator === "U" && (
              <View style={styles.subSelectionSection}>
                <Text style={styles.subSelectionSectionTitle}>
                  Number of Units
                  {billingCode.max_units && (
                    <Text style={styles.maxUnitsText}>
                      {" "}
                      (Max: {billingCode.max_units})
                    </Text>
                  )}
                </Text>
                <View style={styles.unitsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      (localSubSelection.numberOfUnits || 1) <= 1
                        ? styles.disabledButton
                        : null,
                    ]}
                    onPress={() => {
                      if ((localSubSelection.numberOfUnits || 1) > 1) {
                        handleUpdateSubSelection({
                          numberOfUnits:
                            (localSubSelection.numberOfUnits || 1) - 1,
                        });
                      }
                    }}
                    disabled={(localSubSelection.numberOfUnits || 1) <= 1}
                  >
                    <Text style={styles.unitButtonText}>-</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.unitsInput}
                    value={(localSubSelection.numberOfUnits || 1).toString()}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 1;
                      const maxUnits = billingCode.max_units || value;
                      handleUpdateSubSelection({
                        numberOfUnits: Math.min(value, maxUnits),
                      });
                    }}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={[
                      styles.unitButton,
                      billingCode.max_units &&
                      (localSubSelection.numberOfUnits || 1) >=
                        billingCode.max_units
                        ? styles.disabledButton
                        : null,
                    ]}
                    onPress={() => {
                      const maxUnits =
                        billingCode.max_units ||
                        (localSubSelection.numberOfUnits || 1) + 1;
                      handleUpdateSubSelection({
                        numberOfUnits: Math.min(
                          (localSubSelection.numberOfUnits || 1) + 1,
                          maxUnits
                        ),
                      });
                    }}
                    disabled={
                      !!(
                        billingCode.max_units &&
                        (localSubSelection.numberOfUnits || 1) >=
                          billingCode.max_units
                      )
                    }
                  >
                    <Text style={styles.unitButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Service Start/End Time */}
            {(billingCode.start_time_required === "Y" ||
              billingCode.stop_time_required === "Y") && (
              <View style={styles.subSelectionSection}>
                <Text style={styles.subSelectionSectionTitle}>
                  Service Times
                </Text>
                <View style={styles.timeRow}>
                  {billingCode.start_time_required === "Y" && (
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.timeLabel}>Start Time</Text>
                      <TextInput
                        style={styles.timeInput}
                        placeholder="HH:MM"
                        value={localSubSelection.serviceStartTime || ""}
                        onChangeText={(text) =>
                          handleUpdateSubSelection({ serviceStartTime: text })
                        }
                      />
                    </View>
                  )}
                  {billingCode.stop_time_required === "Y" && (
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.timeLabel}>End Time</Text>
                      <TextInput
                        style={styles.timeInput}
                        placeholder="HH:MM"
                        value={localSubSelection.serviceEndTime || ""}
                        onChangeText={(text) =>
                          handleUpdateSubSelection({ serviceEndTime: text })
                        }
                      />
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Bilateral Indicator - Only for codes with "Bilateral" in title */}
            {billingCode.title.includes("Bilateral") && (
              <View style={styles.subSelectionSection}>
                <Text style={styles.subSelectionSectionTitle}>
                  Bilateral Indicator
                </Text>
                <View style={styles.bilateralContainer}>
                  <TouchableOpacity
                    style={[
                      styles.bilateralButton,
                      localSubSelection.bilateralIndicator === "L" &&
                        styles.selectedBilateralButton,
                    ]}
                    onPress={() =>
                      handleUpdateSubSelection({
                        bilateralIndicator:
                          localSubSelection.bilateralIndicator === "L"
                            ? null
                            : "L",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.bilateralButtonText,
                        localSubSelection.bilateralIndicator === "L" &&
                          styles.selectedBilateralButtonText,
                      ]}
                    >
                      Left
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bilateralButton,
                      localSubSelection.bilateralIndicator === "R" &&
                        styles.selectedBilateralButton,
                    ]}
                    onPress={() =>
                      handleUpdateSubSelection({
                        bilateralIndicator:
                          localSubSelection.bilateralIndicator === "R"
                            ? null
                            : "R",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.bilateralButtonText,
                        localSubSelection.bilateralIndicator === "R" &&
                          styles.selectedBilateralButtonText,
                      ]}
                    >
                      Right
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.bilateralButton,
                      localSubSelection.bilateralIndicator === "B" &&
                        styles.selectedBilateralButton,
                    ]}
                    onPress={() =>
                      handleUpdateSubSelection({
                        bilateralIndicator:
                          localSubSelection.bilateralIndicator === "B"
                            ? null
                            : "B",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.bilateralButtonText,
                        localSubSelection.bilateralIndicator === "B" &&
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
            {isWorXSection(billingCode) && (
              <View style={styles.subSelectionSection}>
                <Text style={styles.subSelectionSectionTitle}>
                  Special Circumstances{" "}
                  <Text style={styles.requiredText}>*</Text>
                </Text>
                <View style={styles.specialCircumstancesContainer}>
                  <TouchableOpacity
                    style={[
                      styles.specialCircumstancesButton,
                      localSubSelection.specialCircumstances === "TF" &&
                        styles.selectedSpecialCircumstancesButton,
                    ]}
                    onPress={() =>
                      handleUpdateSubSelection({
                        specialCircumstances: "TF",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.specialCircumstancesButtonText,
                        localSubSelection.specialCircumstances === "TF" &&
                          styles.selectedSpecialCircumstancesButtonText,
                      ]}
                    >
                      Technical
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.specialCircumstancesButton,
                      localSubSelection.specialCircumstances === "PF" &&
                        styles.selectedSpecialCircumstancesButton,
                    ]}
                    onPress={() =>
                      handleUpdateSubSelection({
                        specialCircumstances: "PF",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.specialCircumstancesButtonText,
                        localSubSelection.specialCircumstances === "PF" &&
                          styles.selectedSpecialCircumstancesButtonText,
                      ]}
                    >
                      Interpretation
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.specialCircumstancesButton,
                      localSubSelection.specialCircumstances === "CF" &&
                        styles.selectedSpecialCircumstancesButton,
                    ]}
                    onPress={() =>
                      handleUpdateSubSelection({
                        specialCircumstances: "CF",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.specialCircumstancesButtonText,
                        localSubSelection.specialCircumstances === "CF" &&
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
            {isHSection(billingCode) && (
              <View style={styles.subSelectionSection}>
                <Text style={styles.subSelectionSectionTitle}>
                  Special Circumstances
                </Text>
                <View style={styles.specialCircumstancesContainer}>
                  <TouchableOpacity
                    style={[
                      styles.specialCircumstancesButton,
                      localSubSelection.specialCircumstances === "TA" &&
                        styles.selectedSpecialCircumstancesButton,
                    ]}
                    onPress={() =>
                      handleUpdateSubSelection({
                        specialCircumstances: "TA",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.specialCircumstancesButtonText,
                        localSubSelection.specialCircumstances === "TA" &&
                          styles.selectedSpecialCircumstancesButtonText,
                      ]}
                    >
                      Technical
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.specialCircumstancesButton,
                      localSubSelection.specialCircumstances === "PA" &&
                        styles.selectedSpecialCircumstancesButton,
                    ]}
                    onPress={() =>
                      handleUpdateSubSelection({
                        specialCircumstances: "PA",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.specialCircumstancesButtonText,
                        localSubSelection.specialCircumstances === "PA" &&
                          styles.selectedSpecialCircumstancesButtonText,
                      ]}
                    >
                      Interpretation
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.specialCircumstancesButton,
                      localSubSelection.specialCircumstances === "CA" &&
                        styles.selectedSpecialCircumstancesButton,
                    ]}
                    onPress={() =>
                      handleUpdateSubSelection({
                        specialCircumstances: "CA",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.specialCircumstancesButtonText,
                        localSubSelection.specialCircumstances === "CA" &&
                          styles.selectedSpecialCircumstancesButtonText,
                      ]}
                    >
                      Both
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  subSelectionModalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    maxHeight: "90%",
    width: "100%",
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  subSelectionScrollView: {
    maxHeight: 400,
    padding: 20,
  },
  subSelectionSection: {
    marginBottom: 24,
  },
  subSelectionSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  requiredText: {
    color: "#dc2626",
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    flex: 1,
    textAlign: "center",
  },
  dateInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateArrowButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledDateArrowButton: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  readOnlyInput: {
    backgroundColor: "#f9fafb",
    color: "#6b7280",
  },
  dateNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  calculatedDateNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  unitsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  unitButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#d1d5db",
  },
  unitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  unitsInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
    minWidth: 60,
  },
  maxUnitsText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "400",
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
    fontWeight: "500",
    color: "#374151",
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  bilateralContainer: {
    flexDirection: "row",
    gap: 8,
  },
  bilateralButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  selectedBilateralButton: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  bilateralButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  selectedBilateralButtonText: {
    color: "#fff",
  },
  specialCircumstancesContainer: {
    flexDirection: "row",
    gap: 8,
  },
  specialCircumstancesButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  selectedSpecialCircumstancesButton: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  specialCircumstancesButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  selectedSpecialCircumstancesButtonText: {
    color: "#fff",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  saveButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
  },
});

export default BillingCodeConfigurationModal;
