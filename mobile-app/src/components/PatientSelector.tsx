import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Card } from "react-native-paper";
import { patientsAPI } from "../services/api";
import { Patient } from "../types";

interface PatientSelectorProps {
  visible: boolean;
  onClose: () => void;
  onPatientSelected: (patient: Patient) => void;
  physicianId: string;
}

interface NewPatient {
  firstName: string;
  lastName: string;
  billingNumber: string;
  dateOfBirth: string;
  sex: string;
}

interface NewPatientErrors {
  billingNumber: boolean;
  dateOfBirth: boolean;
  sex: boolean;
  billingNumberCheckDigit: boolean;
  billingNumberDuplicate: boolean;
}

const PatientSelector: React.FC<PatientSelectorProps> = ({
  visible,
  onClose,
  onPatientSelected,
  physicianId,
}) => {
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // New patient form state
  const [newPatient, setNewPatient] = useState<NewPatient>({
    firstName: "",
    lastName: "",
    billingNumber: "",
    dateOfBirth: "",
    sex: "",
  });

  const [newPatientErrors, setNewPatientErrors] = useState<NewPatientErrors>({
    billingNumber: false,
    dateOfBirth: false,
    sex: false,
    billingNumberCheckDigit: false,
    billingNumberDuplicate: false,
  });

  const [duplicatePatient, setDuplicatePatient] = useState<Patient | null>(
    null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateOfBirth, setTempDateOfBirth] = useState({
    year: "",
    month: "",
    day: "",
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | null>(
    null
  );
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [datePickerStep, setDatePickerStep] = useState<
    "decade" | "year" | "month" | "day"
  >("decade");
  const [selectedDecade, setSelectedDecade] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(0);
  const [selectedMonth, setSelectedMonth] = useState<number>(0);

  // Fetch patients
  const { data: patients, isLoading: patientsLoading } = useQuery<Patient[]>({
    queryKey: ["patients"],
    queryFn: patientsAPI.getAll,
    enabled: visible,
  });

  // Filter patients based on search query
  useEffect(() => {
    if (!patients || !patientSearchQuery.trim()) {
      setFilteredPatients([]);
      return;
    }

    const searchLower = patientSearchQuery.toLowerCase();
    const filtered = patients.filter(
      (patient) =>
        patient.firstName.toLowerCase().includes(searchLower) ||
        patient.lastName.toLowerCase().includes(searchLower) ||
        patient.billingNumber.includes(searchLower)
    );
    setFilteredPatients(filtered);
  }, [patients, patientSearchQuery]);

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: (patientData: {
      firstName: string;
      lastName: string;
      billingNumber: string;
      dateOfBirth: string;
      sex: string;
      physicianId: string;
    }) => patientsAPI.create(patientData),
    onSuccess: (newPatient) => {
      Alert.alert("Success", "Patient created successfully!");
      setIsCreatingPatient(false);
      setNewPatient({
        firstName: "",
        lastName: "",
        billingNumber: "",
        dateOfBirth: "",
        sex: "",
      });
      onPatientSelected(newPatient);
      onClose();
    },
    onError: (error: any) => {
      console.error("Error creating patient:", error);
      Alert.alert("Error", "Failed to create patient");
    },
  });

  // Billing number validation function
  const checkDigit = (value: string): boolean => {
    if (value.length !== 9) return false;
    const weights = [9, 8, 7, 6, 5, 4, 3, 2];
    const sum = value
      .slice(0, 8)
      .split("")
      .reduce((acc, digit, index) => {
        const product = parseInt(digit) * weights[index];
        return acc + product;
      }, 0);
    const remainder = sum % 11 > 0 ? 11 - (sum % 11) : 0;
    return remainder === parseInt(value[8]);
  };

  const isNewPatientFormValid = (): boolean => {
    // Check if all required fields are filled
    if (
      !newPatient.firstName.trim() ||
      !newPatient.lastName.trim() ||
      !newPatient.billingNumber ||
      !newPatient.dateOfBirth ||
      !newPatient.sex
    ) {
      return false;
    }

    // Validate billing number format
    if (
      newPatient.billingNumber.length !== 9 ||
      !/^\d{9}$/.test(newPatient.billingNumber)
    ) {
      return false;
    }

    if (!checkDigit(newPatient.billingNumber)) {
      return false;
    }

    // Check for duplicate patient error
    if (newPatientErrors.billingNumberDuplicate) {
      return false;
    }

    // Check for duplicate patient
    if (patients) {
      const existingPatient = patients.find(
        (patient) => patient.billingNumber === newPatient.billingNumber
      );
      if (existingPatient) {
        return false;
      }
    }

    return true;
  };

  const handleSelectDuplicatePatient = () => {
    if (duplicatePatient) {
      onPatientSelected(duplicatePatient);
      onClose();
    }
  };

  const handleCreatePatient = () => {
    // Reset errors
    setNewPatientErrors({
      billingNumber: false,
      dateOfBirth: false,
      sex: false,
      billingNumberCheckDigit: false,
      billingNumberDuplicate: false,
    });

    // Validate required fields
    const errors = {
      billingNumber: !newPatient.billingNumber,
      dateOfBirth: !newPatient.dateOfBirth,
      sex: !newPatient.sex,
      billingNumberCheckDigit: false,
      billingNumberDuplicate: false,
    };

    // Check for required fields
    if (!newPatient.firstName || !newPatient.lastName) {
      Alert.alert("Error", "Please fill in all required patient fields");
      return;
    }

    // Validate billing number format and check digit
    if (newPatient.billingNumber) {
      if (
        newPatient.billingNumber.length !== 9 ||
        !/^\d{9}$/.test(newPatient.billingNumber)
      ) {
        errors.billingNumber = true;
        Alert.alert("Error", "Billing number must be exactly 9 digits");
        setNewPatientErrors(errors);
        return;
      }

      if (!checkDigit(newPatient.billingNumber)) {
        errors.billingNumberCheckDigit = true;
        Alert.alert("Error", "Invalid billing number check digit");
        setNewPatientErrors(errors);
        return;
      }
    }

    // Check for duplicate patient
    if (patients) {
      const existingPatient = patients.find(
        (patient) => patient.billingNumber === newPatient.billingNumber
      );
      if (existingPatient) {
        setDuplicatePatient(existingPatient);
        errors.billingNumberDuplicate = true;
        setNewPatientErrors(errors);
        return;
      }
    }

    // Check if any errors exist
    if (errors.billingNumber || errors.dateOfBirth || errors.sex) {
      Alert.alert("Error", "Please fill in all required patient fields");
      setNewPatientErrors(errors);
      return;
    }

    // Create the patient
    createPatientMutation.mutate({
      ...newPatient,
      physicianId,
    });
  };

  const handleSelectPatient = (patient: Patient) => {
    onPatientSelected(patient);
    onClose();
  };

  const handleClosePatientModal = () => {
    setShowPatientDropdown(false);
  };

  const formatFullDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-CA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleOpenDatePicker = () => {
    setDatePickerStep("day");
    setShowDatePicker(true);
    if (newPatient.dateOfBirth) {
      const [year, month, day] = newPatient.dateOfBirth.split("-").map(Number);
      setSelectedYear(year);
      setSelectedMonth(month - 1);
      setSelectedCalendarDate(new Date(year, month - 1, day));
    }
  };

  const handleDateSelect = (date: Date) => {
    const formattedDate = date.toISOString().split("T")[0];
    setNewPatient((prev) => ({ ...prev, dateOfBirth: formattedDate }));
    setShowDatePicker(false);
    setSelectedCalendarDate(null);
    if (newPatientErrors.dateOfBirth) {
      setNewPatientErrors((prev) => ({ ...prev, dateOfBirth: false }));
    }
  };

  const handleClose = () => {
    setIsCreatingPatient(false);
    setPatientSearchQuery("");
    setFilteredPatients([]);
    setShowPatientDropdown(false);
    setNewPatient({
      firstName: "",
      lastName: "",
      billingNumber: "",
      dateOfBirth: "",
      sex: "",
    });
    setNewPatientErrors({
      billingNumber: false,
      dateOfBirth: false,
      sex: false,
      billingNumberCheckDigit: false,
      billingNumberDuplicate: false,
    });
    setDuplicatePatient(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isCreatingPatient ? "Create New Patient" : "Select Patient"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.card}>
            <Card.Content>
              {isCreatingPatient ? (
                <View>
                  <TextInput
                    style={styles.input}
                    placeholder="First Name *"
                    placeholderTextColor="#6b7280"
                    value={newPatient.firstName}
                    onChangeText={(text) =>
                      setNewPatient((prev) => ({ ...prev, firstName: text }))
                    }
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Last Name *"
                    placeholderTextColor="#6b7280"
                    value={newPatient.lastName}
                    onChangeText={(text) =>
                      setNewPatient((prev) => ({ ...prev, lastName: text }))
                    }
                  />

                  <View style={styles.dateGenderRow}>
                    <View style={styles.dateInputContainer}>
                      <TouchableOpacity
                        style={[
                          styles.input,
                          styles.dateInput,
                          newPatientErrors.dateOfBirth && styles.inputError,
                        ]}
                        onPress={handleOpenDatePicker}
                      >
                        <Text
                          style={
                            newPatient.dateOfBirth
                              ? styles.dateInputText
                              : styles.placeholderText
                          }
                        >
                          {newPatient.dateOfBirth || "Date of Birth *"}
                        </Text>
                        <Ionicons name="calendar" size={20} color="#6b7280" />
                      </TouchableOpacity>
                      {newPatientErrors.dateOfBirth && (
                        <Text style={styles.errorText}>
                          Date of birth is required
                        </Text>
                      )}
                    </View>

                    <View style={styles.genderContainer}>
                      <View style={styles.genderButtons}>
                        <TouchableOpacity
                          style={[
                            styles.genderCircleButton,
                            newPatient.sex === "M" &&
                              styles.selectedGenderCircleButton,
                            newPatientErrors.sex && styles.inputError,
                          ]}
                          onPress={() => {
                            setNewPatient((prev) => ({ ...prev, sex: "M" }));
                            if (newPatientErrors.sex) {
                              setNewPatientErrors((prev) => ({
                                ...prev,
                                sex: false,
                              }));
                            }
                          }}
                        >
                          <Ionicons
                            name="male"
                            size={24}
                            color={
                              newPatient.sex === "M" ? "#ffffff" : "#6b7280"
                            }
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.genderCircleButton,
                            newPatient.sex === "F" &&
                              styles.selectedGenderCircleButton,
                            newPatientErrors.sex && styles.inputError,
                          ]}
                          onPress={() => {
                            setNewPatient((prev) => ({ ...prev, sex: "F" }));
                            if (newPatientErrors.sex) {
                              setNewPatientErrors((prev) => ({
                                ...prev,
                                sex: false,
                              }));
                            }
                          }}
                        >
                          <Ionicons
                            name="female"
                            size={24}
                            color={
                              newPatient.sex === "F" ? "#ffffff" : "#6b7280"
                            }
                          />
                        </TouchableOpacity>
                      </View>
                      {newPatientErrors.sex && (
                        <Text style={styles.errorText}>
                          Please select a gender
                        </Text>
                      )}
                    </View>
                  </View>

                  <TextInput
                    style={[
                      styles.input,
                      newPatientErrors.billingNumber && styles.inputError,
                    ]}
                    placeholder="Health Services Number (9 digits) *"
                    placeholderTextColor="#6b7280"
                    value={newPatient.billingNumber}
                    onChangeText={(text) => {
                      // Only allow digits and limit to 9 characters
                      const numericText = text
                        .replace(/[^0-9]/g, "")
                        .slice(0, 9);
                      setNewPatient((prev) => ({
                        ...prev,
                        billingNumber: numericText,
                      }));
                      // Clear errors when user starts typing
                      if (
                        newPatientErrors.billingNumber ||
                        newPatientErrors.billingNumberDuplicate
                      ) {
                        setNewPatientErrors((prev) => ({
                          ...prev,
                          billingNumber: false,
                          billingNumberDuplicate: false,
                        }));
                      }

                      // Real-time duplicate check when billing number is complete
                      if (
                        numericText.length === 9 &&
                        checkDigit(numericText) &&
                        patients
                      ) {
                        const existingPatient = patients.find(
                          (patient) => patient.billingNumber === numericText
                        );
                        if (existingPatient) {
                          setDuplicatePatient(existingPatient);
                          setNewPatientErrors((prev) => ({
                            ...prev,
                            billingNumberDuplicate: true,
                          }));
                        } else {
                          setDuplicatePatient(null);
                        }
                      }
                    }}
                    keyboardType="numeric"
                  />
                  {newPatientErrors.billingNumber && (
                    <Text style={styles.errorText}>
                      Billing number is required
                    </Text>
                  )}
                  {newPatientErrors.billingNumberCheckDigit && (
                    <Text style={styles.errorText}>
                      Billing number check digit is invalid
                    </Text>
                  )}
                  {newPatientErrors.billingNumberDuplicate && (
                    <View style={styles.duplicatePatientContainer}>
                      <Text style={styles.errorText}>
                        A patient with this billing number already exists in
                        your patient list
                      </Text>
                      {duplicatePatient && (
                        <View style={styles.duplicatePatientCard}>
                          <Text style={styles.duplicatePatientTitle}>
                            Existing Patient Found:
                          </Text>
                          <Text style={styles.duplicatePatientName}>
                            {duplicatePatient.firstName}{" "}
                            {duplicatePatient.lastName}
                            {duplicatePatient.middleInitial &&
                              ` ${duplicatePatient.middleInitial}`}
                          </Text>
                          <Text style={styles.duplicatePatientDetails}>
                            DOB: {formatFullDate(duplicatePatient.dateOfBirth)}{" "}
                            | Sex: {duplicatePatient.sex}
                          </Text>
                          <Button
                            mode="contained"
                            onPress={handleSelectDuplicatePatient}
                            style={styles.selectDuplicateButton}
                            labelStyle={styles.selectDuplicateButtonText}
                          >
                            Use This Patient
                          </Button>
                        </View>
                      )}
                    </View>
                  )}

                  <Button
                    mode="contained"
                    onPress={handleCreatePatient}
                    loading={createPatientMutation.isPending}
                    style={[
                      styles.createPatientButton,
                      !isNewPatientFormValid() && styles.disabledButton,
                    ]}
                    disabled={
                      !isNewPatientFormValid() ||
                      createPatientMutation.isPending
                    }
                  >
                    Create Patient
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={() => setIsCreatingPatient(false)}
                    style={styles.backToSearchButton}
                  >
                    Back to Search
                  </Button>
                </View>
              ) : (
                <View style={styles.dropdownContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Search patients by name or hsn..."
                    placeholderTextColor="#6b7280"
                    value={patientSearchQuery}
                    onChangeText={(text) => {
                      setPatientSearchQuery(text);
                      setShowPatientDropdown(true);
                    }}
                    onFocus={() => {
                      setShowPatientDropdown(true);
                    }}
                  />
                  <Modal
                    visible={showPatientDropdown}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={handleClosePatientModal}
                  >
                    <TouchableOpacity
                      style={styles.modalOverlay}
                      activeOpacity={1}
                      onPress={handleClosePatientModal}
                    >
                      <TouchableOpacity
                        style={styles.modalContent}
                        activeOpacity={1}
                        onPress={() => {}} // Prevent closing when tapping inside modal
                      >
                        <View style={styles.modalHeader}>
                          <Text style={styles.modalTitle}>Select Patient</Text>
                          <TouchableOpacity onPress={handleClosePatientModal}>
                            <Ionicons name="close" size={24} color="#6b7280" />
                          </TouchableOpacity>
                        </View>
                        <TextInput
                          style={styles.modalSearchInput}
                          placeholder="Search patients..."
                          placeholderTextColor="#6b7280"
                          value={patientSearchQuery}
                          onChangeText={setPatientSearchQuery}
                          autoFocus={true}
                        />
                        <ScrollView style={styles.modalScrollView}>
                          {patientsLoading ? (
                            <ActivityIndicator
                              size="small"
                              color="#2563eb"
                              style={styles.modalLoading}
                            />
                          ) : (
                            <>
                              {filteredPatients.length > 0 ? (
                                filteredPatients.map((patient) => (
                                  <TouchableOpacity
                                    key={patient.id}
                                    style={styles.modalOption}
                                    onPress={() => {
                                      handleSelectPatient(patient);
                                      handleClosePatientModal();
                                    }}
                                  >
                                    <Text style={styles.modalOptionText}>
                                      {patient.firstName} {patient.lastName} (#
                                      {patient.billingNumber})
                                    </Text>
                                  </TouchableOpacity>
                                ))
                              ) : (
                                <Text style={styles.noResultsText}>
                                  No patients found. Try a different search
                                  term.
                                </Text>
                              )}
                            </>
                          )}
                        </ScrollView>
                      </TouchableOpacity>
                    </TouchableOpacity>
                  </Modal>

                  <Button
                    mode="contained"
                    onPress={() => setIsCreatingPatient(true)}
                    style={styles.createNewPatientButton}
                  >
                    Create New Patient
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        {/* Date Picker Modal */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={() => {}}
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date of Birth</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.datePickerContent}>
                <View style={styles.calendarContainer}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const date = new Date(
                      selectedYear || new Date().getFullYear(),
                      selectedMonth !== null
                        ? selectedMonth
                        : new Date().getMonth(),
                      day
                    );
                    const isSelected =
                      selectedCalendarDate &&
                      selectedCalendarDate.getDate() === day &&
                      selectedCalendarDate.getMonth() ===
                        (selectedMonth !== null
                          ? selectedMonth
                          : new Date().getMonth()) &&
                      selectedCalendarDate.getFullYear() ===
                        (selectedYear || new Date().getFullYear());

                    return (
                      <TouchableOpacity
                        key={day}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.selectedCalendarDay,
                        ]}
                        onPress={() => handleDateSelect(date)}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.selectedCalendarDayText,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50, // Account for status bar
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  card: {
    marginBottom: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  dateGenderRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    marginBottom: 0,
  },
  dateInputText: {
    fontSize: 16,
    color: "#374151",
  },
  placeholderText: {
    fontSize: 16,
    color: "#6b7280",
  },
  genderContainer: {
    alignItems: "center",
  },
  genderButtons: {
    flexDirection: "row",
    gap: 12,
  },
  genderCircleButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedGenderCircleButton: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  duplicatePatientContainer: {
    marginBottom: 16,
  },
  duplicatePatientCard: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#f59e0b",
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  duplicatePatientTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 4,
  },
  duplicatePatientName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#92400e",
    marginBottom: 2,
  },
  duplicatePatientDetails: {
    fontSize: 14,
    color: "#92400e",
    marginBottom: 12,
  },
  selectDuplicateButton: {
    backgroundColor: "#f59e0b",
  },
  selectDuplicateButtonText: {
    color: "#ffffff",
  },
  createPatientButton: {
    backgroundColor: "#059669",
    marginBottom: 12,
  },
  backToSearchButton: {
    borderColor: "#6b7280",
  },
  createNewPatientButton: {
    backgroundColor: "#059669",
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  dropdownContainer: {
    position: "relative",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    marginBottom: 16,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalLoading: {
    padding: 20,
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  noResultsText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 16,
    padding: 20,
  },
  datePickerContent: {
    maxHeight: 400,
  },
  calendarContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 8,
  },
  calendarDay: {
    width: "12%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
  },
  selectedCalendarDay: {
    backgroundColor: "#2563eb",
  },
  calendarDayText: {
    fontSize: 14,
    color: "#374151",
  },
  selectedCalendarDayText: {
    color: "#ffffff",
    fontWeight: "600",
  },
});

export default PatientSelector;
