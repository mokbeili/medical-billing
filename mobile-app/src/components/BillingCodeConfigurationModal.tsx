import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BillingCode, Physician } from "../types";
import {
  splitBillingCodeByTimeAndLocation,
  type LocationOfService,
  type SplitBillingCode,
} from "../utils/billingCodeUtils";
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
  locationOfService: string | null;
}

interface BillingCodeConfigurationModalProps {
  visible: boolean;
  billingCode: BillingCode | null;
  subSelection: CodeSubSelection | null;
  onClose: () => void;
  onSave: (subSelection: CodeSubSelection) => void;
  serviceDate?: string;
  physician?: Physician | null;
}

const BillingCodeConfigurationModal: React.FC<
  BillingCodeConfigurationModalProps
> = ({
  visible,
  billingCode,
  subSelection,
  onClose,
  onSave,
  serviceDate,
  physician,
}) => {
  const [localSubSelection, setLocalSubSelection] =
    useState<CodeSubSelection | null>(null);
  const [showFullList, setShowFullList] = useState(false);
  const [splitCodes, setSplitCodes] = useState<SplitBillingCode[]>([]);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);
  const [tempHour, setTempHour] = useState(0);
  const [tempMinute, setTempMinute] = useState(0);
  const [dataEntryMode, setDataEntryMode] = useState<"time" | "units">("time");
  const [locationError, setLocationError] = useState<string | null>(null);

  // Full Location of Service options
  const fullLocationOfServiceOptions = React.useMemo(
    () => [
      { value: "1", label: "Office" },
      { value: "2", label: "Hospital In-Patient" },
      { value: "3", label: "Hospital Out-Patient" },
      { value: "4", label: "Patient's Home" },
      { value: "5", label: "Other" },
      { value: "7", label: "Premium" },
      { value: "9", label: "Emergency Room" },
      { value: "B", label: "Hospital In-Patient (Premium)" },
      { value: "C", label: "Hospital Out-Patient (Premium)" },
      { value: "D", label: "Patient's Home (Premium)" },
      { value: "E", label: "Other (Premium)" },
      { value: "F", label: "After-Hours-Clinic (Premium)" },
      { value: "K", label: "In Hospital (Premium)" },
      { value: "M", label: "Out Patient (Premium)" },
      { value: "P", label: "Home (Premium)" },
      { value: "T", label: "Other (Premium)" },
    ],
    []
  );

  // Physician's Location of Service options
  const physicianLocationOptions = React.useMemo(() => {
    if (!physician?.physicianLocationsOfService) return [];
    return physician.physicianLocationsOfService.map((plos) => ({
      value: plos.locationOfService.code,
      label: plos.locationOfService.name,
    }));
  }, [physician]);

  // Determine which options to display
  const locationOfServiceOptions = React.useMemo(() => {
    if (showFullList || physicianLocationOptions.length === 0) {
      return fullLocationOfServiceOptions;
    }
    return physicianLocationOptions;
  }, [showFullList, physicianLocationOptions, fullLocationOfServiceOptions]);

  // Initialize local state when modal opens
  React.useEffect(() => {
    if (visible && subSelection) {
      // Clear any previous errors when modal opens
      setLocationError(null);

      // Use the provided subSelection, but use serviceDate prop as fallback if null
      const effectiveServiceDate =
        subSelection.serviceDate ||
        serviceDate ||
        new Date().toISOString().split("T")[0];

      // Check if this billing code requires time fields
      const requiresTime =
        billingCode &&
        (billingCode.start_time_required === "Y" ||
          billingCode.stop_time_required === "Y" ||
          (billingCode.multiple_unit_indicator === "U" &&
            billingCode.billing_unit_type?.includes("MINUTES")));

      // Initialize time fields with default values only if times are required and currently null
      const effectiveStartTime = requiresTime
        ? subSelection.serviceStartTime || "07:00"
        : subSelection.serviceStartTime;
      const effectiveEndTime = requiresTime
        ? subSelection.serviceEndTime || "12:00"
        : subSelection.serviceEndTime;

      setLocalSubSelection({
        ...subSelection,
        serviceDate: effectiveServiceDate,
        serviceStartTime: effectiveStartTime,
        serviceEndTime: effectiveEndTime,
      });
    } else if (visible && !subSelection) {
      // Clear any previous errors when modal opens
      setLocationError(null);

      // Check if this billing code requires time fields
      const requiresTime =
        billingCode &&
        (billingCode.start_time_required === "Y" ||
          billingCode.stop_time_required === "Y" ||
          (billingCode.multiple_unit_indicator === "U" &&
            billingCode.billing_unit_type?.includes("MINUTES")));

      // If no subSelection provided, create default
      const defaultDate = serviceDate || new Date().toISOString().split("T")[0];
      setLocalSubSelection({
        codeId: billingCode?.id || 0,
        serviceDate: defaultDate,
        serviceEndDate: null,
        bilateralIndicator: null,
        serviceStartTime: requiresTime ? "07:00" : null,
        serviceEndTime: requiresTime ? "12:00" : null,
        numberOfUnits: 1,
        specialCircumstances: null,
        locationOfService: null, // User must select
      });
    }
  }, [visible, subSelection, billingCode, serviceDate]);

  // Calculate split codes when times change
  useEffect(() => {
    if (
      !billingCode ||
      !localSubSelection ||
      !physician?.physicianLocationsOfService
    ) {
      setSplitCodes([]);
      return;
    }

    if (
      billingCode.multiple_unit_indicator === "U" &&
      billingCode.billing_unit_type?.includes("MINUTES") &&
      localSubSelection.serviceStartTime &&
      localSubSelection.serviceEndTime
    ) {
      // Convert physician locations to LocationOfService format
      const locationsOfService: LocationOfService[] =
        physician.physicianLocationsOfService.map((plos) => ({
          id: plos.locationOfService.id,
          code: plos.locationOfService.code,
          name: plos.locationOfService.name,
          startTime: plos.locationOfService.startTime || null,
          endTime: plos.locationOfService.endTime || null,
          holidayStartTime: plos.locationOfService.holidayStartTime || null,
          holidayEndTime: plos.locationOfService.holidayEndTime || null,
        }));

      // Calculate split codes
      const result = splitBillingCodeByTimeAndLocation(
        {
          codeId: billingCode.id,
          code: billingCode.code,
          title: billingCode.title,
          multiple_unit_indicator: billingCode.multiple_unit_indicator,
          billing_unit_type: billingCode.billing_unit_type,
          serviceStartTime: extractTimeString(
            localSubSelection.serviceStartTime
          ),
          serviceEndTime: extractTimeString(localSubSelection.serviceEndTime),
          serviceDate: localSubSelection.serviceDate,
          numberOfUnits: localSubSelection.numberOfUnits,
          bilateralIndicator: localSubSelection.bilateralIndicator,
          specialCircumstances: localSubSelection.specialCircumstances,
          locationOfService: localSubSelection.locationOfService,
        },
        locationsOfService,
        physician.timezone || "America/Regina",
        [] // Empty holidays array for now
      );

      setSplitCodes(result);
    } else {
      setSplitCodes([]);
    }
  }, [
    billingCode,
    localSubSelection?.serviceStartTime,
    localSubSelection?.serviceEndTime,
    localSubSelection?.serviceDate,
    physician,
  ]);

  if (!billingCode || !localSubSelection) return null;

  const handleUpdateSubSelection = (updates: Partial<CodeSubSelection>) => {
    setLocalSubSelection((prev) => (prev ? { ...prev, ...updates } : null));
    // Clear location error when location is selected
    if (updates.locationOfService) {
      setLocationError(null);
    }
  };

  const handleSave = () => {
    if (localSubSelection) {
      // Validate that locationOfService is selected
      if (!localSubSelection.locationOfService) {
        setLocationError("Please select a Location of Service before saving");
        return;
      }
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
    // Get today in local timezone (not UTC)
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(now.getDate()).padStart(2, "0")}`;
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

  const hasTimeOrUnitsOption = (code: BillingCode) => {
    return (
      code.multiple_unit_indicator === "U" &&
      code.billing_unit_type?.includes("MINUTES")
    );
  };

  // Helper to extract HH:MM from various time formats
  const extractTimeString = (timeValue: string | null): string => {
    if (!timeValue) return "09:00";

    // If it's already in HH:MM format, return as-is (user input)
    if (/^\d{1,2}:\d{2}$/.test(timeValue)) {
      return timeValue;
    }

    // If it's an ISO datetime string from database, convert from UTC to local time
    if (timeValue.includes("T") || timeValue.includes("Z")) {
      try {
        const date = new Date(timeValue);
        if (!isNaN(date.getTime())) {
          // Convert to physician's timezone
          const physicianTimezone = physician?.timezone || "America/Regina";
          const localTime = date.toLocaleString("en-US", {
            timeZone: physicianTimezone,
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
          return localTime; // Returns "HH:MM" format
        }
      } catch (error) {
        console.error("Error parsing time:", error);
      }
    }

    // Fallback
    return "09:00";
  };

  // Time picker handlers
  const openStartTimePicker = () => {
    const timeString = extractTimeString(localSubSelection?.serviceStartTime);
    const [hour, minute] = timeString.split(":").map(Number);
    setTempHour(hour);
    setTempMinute(minute);
    setShowStartTimePicker(true);
  };

  const openEndTimePicker = () => {
    const timeString = extractTimeString(localSubSelection?.serviceEndTime);
    const [hour, minute] = timeString.split(":").map(Number);
    setTempHour(hour);
    setTempMinute(minute);
    setShowEndTimePicker(true);
  };

  const confirmStartTime = () => {
    const timeString = `${String(tempHour).padStart(2, "0")}:${String(
      tempMinute
    ).padStart(2, "0")}`;
    handleUpdateSubSelection({ serviceStartTime: timeString });
    setShowStartTimePicker(false);
  };

  const confirmEndTime = () => {
    const timeString = `${String(tempHour).padStart(2, "0")}:${String(
      tempMinute
    ).padStart(2, "0")}`;
    handleUpdateSubSelection({ serviceEndTime: timeString });
    setShowEndTimePicker(false);
  };

  const adjustHour = (delta: number) => {
    setTempHour((prev) => {
      let newHour = prev + delta;
      if (newHour < 0) newHour = 23;
      if (newHour > 23) newHour = 0;
      return newHour;
    });
  };

  const adjustMinute = (delta: number) => {
    setTempMinute((prev) => {
      let newMinute = prev + delta;
      if (newMinute < 0) newMinute = 55;
      if (newMinute > 59) newMinute = 0;
      return newMinute;
    });
  };

  const formatTimeDisplay = (time: string | null) => {
    if (!time) return "Select time";

    // Extract HH:MM from the time string (handles both "HH:MM" and ISO datetime)
    const timeString = extractTimeString(time);
    const [hour, minute] = timeString.split(":");
    const h = parseInt(hour);
    const ampm = h >= 12 ? "PM" : "AM";
    const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayHour}:${minute} ${ampm}`;
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

            {/* Data Entry Mode Toggle */}
            {hasTimeOrUnitsOption(billingCode) && (
              <View style={styles.subSelectionSection}>
                <Text style={styles.subSelectionSectionTitle}>
                  Data Entry Mode
                </Text>
                <View style={styles.dataEntryModeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.dataEntryModeButton,
                      dataEntryMode === "time" &&
                        styles.selectedDataEntryModeButton,
                    ]}
                    onPress={() => setDataEntryMode("time")}
                  >
                    <Text
                      style={[
                        styles.dataEntryModeButtonText,
                        dataEntryMode === "time" &&
                          styles.selectedDataEntryModeButtonText,
                      ]}
                    >
                      By Time
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.dataEntryModeButton,
                      dataEntryMode === "units" &&
                        styles.selectedDataEntryModeButton,
                    ]}
                    onPress={() => setDataEntryMode("units")}
                  >
                    <Text
                      style={[
                        styles.dataEntryModeButtonText,
                        dataEntryMode === "units" &&
                          styles.selectedDataEntryModeButtonText,
                      ]}
                    >
                      By Units
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Service Start/End Time */}
            {(billingCode.start_time_required === "Y" ||
              billingCode.stop_time_required === "Y" ||
              (hasTimeOrUnitsOption(billingCode) &&
                dataEntryMode === "time")) && (
              <View style={styles.subSelectionSection}>
                <Text style={styles.subSelectionSectionTitle}>
                  Service Times
                </Text>
                <View style={styles.timeRow}>
                  {(billingCode.start_time_required === "Y" ||
                    (hasTimeOrUnitsOption(billingCode) &&
                      dataEntryMode === "time")) && (
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.timeLabel}>Start Time</Text>
                      <TouchableOpacity
                        style={styles.timeSelector}
                        onPress={openStartTimePicker}
                      >
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color="#6b7280"
                        />
                        <Text
                          style={[
                            styles.timeSelectorText,
                            !localSubSelection.serviceStartTime &&
                              styles.timeSelectorPlaceholder,
                          ]}
                        >
                          {formatTimeDisplay(
                            localSubSelection.serviceStartTime
                          )}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {(billingCode.stop_time_required === "Y" ||
                    (hasTimeOrUnitsOption(billingCode) &&
                      dataEntryMode === "time")) && (
                    <View style={styles.timeInputContainer}>
                      <Text style={styles.timeLabel}>End Time</Text>
                      <TouchableOpacity
                        style={styles.timeSelector}
                        onPress={openEndTimePicker}
                      >
                        <Ionicons
                          name="time-outline"
                          size={20}
                          color="#6b7280"
                        />
                        <Text
                          style={[
                            styles.timeSelectorText,
                            !localSubSelection.serviceEndTime &&
                              styles.timeSelectorPlaceholder,
                          ]}
                        >
                          {formatTimeDisplay(localSubSelection.serviceEndTime)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Split Codes Preview */}
            {splitCodes.length > 1 && dataEntryMode === "time" && (
              <View style={styles.splitCodesPreview}>
                <View style={styles.splitCodesHeader}>
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#3b82f6"
                  />
                  <Text style={styles.splitCodesTitle}>
                    This code will be split into {splitCodes.length} codes:
                  </Text>
                </View>
                {splitCodes.map((code, index) => {
                  const location = physician?.physicianLocationsOfService
                    ?.map((plos) => plos.locationOfService)
                    ?.find((loc) => loc.code === code.locationOfService);
                  const locationName =
                    location?.name || `Location ${code.locationOfService}`;

                  return (
                    <View key={index} style={styles.splitCodeItem}>
                      <Text style={styles.splitCodeIndex}>{index + 1}.</Text>
                      <View style={styles.splitCodeDetails}>
                        <Text style={styles.splitCodeTime}>
                          {code.serviceStartTime} - {code.serviceEndTime}
                        </Text>
                        <Text style={styles.splitCodeInfo}>
                          {code.numberOfUnits} units at {locationName}
                        </Text>
                        {code.serviceDate &&
                          code.serviceDate !==
                            localSubSelection.serviceDate && (
                            <Text style={styles.splitCodeDate}>
                              [{formatFullDate(code.serviceDate)}]
                            </Text>
                          )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Units - Only for codes with multiple_unit_indicator === "U" */}
            {billingCode.multiple_unit_indicator === "U" &&
              (!hasTimeOrUnitsOption(billingCode) ||
                dataEntryMode === "units") && (
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
                        specialCircumstances:
                          localSubSelection.specialCircumstances === "TA"
                            ? null
                            : "TA",
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
                      Takeover
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Location of Service - Required for all codes */}
            {(!hasTimeOrUnitsOption(billingCode) ||
              dataEntryMode === "units") && (
              <View style={styles.subSelectionSection}>
                <View style={styles.locationOfServiceHeader}>
                  <Text style={styles.subSelectionSectionTitle}>
                    Location of Service{" "}
                    <Text style={styles.requiredText}>*</Text>
                  </Text>
                  {physicianLocationOptions.length > 0 && (
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setShowFullList(!showFullList)}
                    >
                      <Text style={styles.toggleButtonText}>
                        {showFullList
                          ? "Show My Locations"
                          : "Show All Locations"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                <ScrollView
                  style={styles.locationOfServiceScrollView}
                  nestedScrollEnabled={true}
                >
                  {locationOfServiceOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.locationOfServiceOption,
                        localSubSelection.locationOfService === option.value &&
                          styles.selectedLocationOfServiceOption,
                      ]}
                      onPress={() =>
                        handleUpdateSubSelection({
                          locationOfService: option.value,
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.locationOfServiceOptionText,
                          localSubSelection.locationOfService ===
                            option.value &&
                            styles.selectedLocationOfServiceOptionText,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {locationError && (
                  <Text style={styles.errorText}>{locationError}</Text>
                )}
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

      {/* Time Picker Modal */}
      <Modal
        visible={showStartTimePicker || showEndTimePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowStartTimePicker(false);
          setShowEndTimePicker(false);
        }}
      >
        <View style={styles.timePickerOverlay}>
          <View style={styles.timePickerModal}>
            <View style={styles.timePickerHeader}>
              <Text style={styles.timePickerTitle}>
                {showStartTimePicker ? "Select Start Time" : "Select End Time"}
              </Text>
            </View>

            <View style={styles.timePickerContent}>
              <View style={styles.timePickerColumn}>
                <TouchableOpacity
                  style={styles.timePickerArrow}
                  onPress={() => adjustHour(1)}
                >
                  <Ionicons name="chevron-up" size={24} color="#3b82f6" />
                </TouchableOpacity>
                <View style={styles.timePickerValueContainer}>
                  <Text style={styles.timePickerValue}>
                    {String(tempHour).padStart(2, "0")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.timePickerArrow}
                  onPress={() => adjustHour(-1)}
                >
                  <Ionicons name="chevron-down" size={24} color="#3b82f6" />
                </TouchableOpacity>
                <Text style={styles.timePickerLabel}>Hour</Text>
              </View>

              <Text style={styles.timePickerSeparator}>:</Text>

              <View style={styles.timePickerColumn}>
                <TouchableOpacity
                  style={styles.timePickerArrow}
                  onPress={() => adjustMinute(5)}
                >
                  <Ionicons name="chevron-up" size={24} color="#3b82f6" />
                </TouchableOpacity>
                <View style={styles.timePickerValueContainer}>
                  <Text style={styles.timePickerValue}>
                    {String(tempMinute).padStart(2, "0")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.timePickerArrow}
                  onPress={() => adjustMinute(-5)}
                >
                  <Ionicons name="chevron-down" size={24} color="#3b82f6" />
                </TouchableOpacity>
                <Text style={styles.timePickerLabel}>Minute</Text>
              </View>
            </View>

            <View style={styles.timePickerQuickButtons}>
              <TouchableOpacity
                style={styles.quickTimeButton}
                onPress={() => {
                  setTempHour(9);
                  setTempMinute(0);
                }}
              >
                <Text style={styles.quickTimeButtonText}>9:00 AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickTimeButton}
                onPress={() => {
                  setTempHour(12);
                  setTempMinute(0);
                }}
              >
                <Text style={styles.quickTimeButtonText}>12:00 PM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickTimeButton}
                onPress={() => {
                  setTempHour(17);
                  setTempMinute(0);
                }}
              >
                <Text style={styles.quickTimeButtonText}>5:00 PM</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerFooter}>
              <TouchableOpacity
                style={styles.timePickerCancelButton}
                onPress={() => {
                  setShowStartTimePicker(false);
                  setShowEndTimePicker(false);
                }}
              >
                <Text style={styles.timePickerCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.timePickerConfirmButton}
                onPress={
                  showStartTimePicker ? confirmStartTime : confirmEndTime
                }
              >
                <Text style={styles.timePickerConfirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  timeSelector: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    gap: 8,
  },
  timeSelectorText: {
    fontSize: 16,
    color: "#111827",
    flex: 1,
  },
  timeSelectorPlaceholder: {
    color: "#9ca3af",
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
  locationOfServiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  toggleButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  toggleButtonText: {
    fontSize: 12,
    color: "#3b82f6",
    fontWeight: "500",
  },
  locationOfServiceScrollView: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  locationOfServiceOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  selectedLocationOfServiceOption: {
    backgroundColor: "#eff6ff",
  },
  locationOfServiceOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  selectedLocationOfServiceOptionText: {
    color: "#3b82f6",
    fontWeight: "600",
  },
  splitCodesPreview: {
    marginTop: 16,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  splitCodesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  splitCodesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
    flex: 1,
  },
  splitCodeItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 4,
  },
  splitCodeIndex: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginRight: 8,
    minWidth: 20,
  },
  splitCodeDetails: {
    flex: 1,
  },
  splitCodeTime: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  splitCodeInfo: {
    fontSize: 12,
    color: "#6b7280",
  },
  splitCodeDate: {
    fontSize: 11,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 2,
  },
  timePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  timePickerModal: {
    backgroundColor: "#fff",
    borderRadius: 16,
    width: "90%",
    maxWidth: 400,
    overflow: "hidden",
  },
  timePickerHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  timePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
  timePickerContent: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    gap: 20,
  },
  timePickerColumn: {
    alignItems: "center",
    gap: 10,
  },
  timePickerArrow: {
    padding: 8,
  },
  timePickerValueContainer: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 80,
    alignItems: "center",
  },
  timePickerValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
  },
  timePickerLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    textTransform: "uppercase",
  },
  timePickerSeparator: {
    fontSize: 32,
    fontWeight: "700",
    color: "#6b7280",
    marginTop: -20,
  },
  timePickerQuickButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 8,
  },
  quickTimeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  quickTimeButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#3b82f6",
    textAlign: "center",
  },
  timePickerFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    gap: 12,
  },
  timePickerCancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  timePickerCancelButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  timePickerConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: "#3b82f6",
  },
  timePickerConfirmButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
    textAlign: "center",
  },
  dataEntryModeContainer: {
    flexDirection: "row",
    gap: 8,
  },
  dataEntryModeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    alignItems: "center",
  },
  selectedDataEntryModeButton: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  dataEntryModeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  selectedDataEntryModeButtonText: {
    color: "#fff",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    marginTop: 8,
    fontWeight: "500",
  },
});

export default BillingCodeConfigurationModal;
