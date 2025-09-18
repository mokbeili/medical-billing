import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, TextInput } from "react-native-paper";
import {
  billingCodesAPI,
  healthInstitutionsAPI,
  icdCodesAPI,
  patientsAPI,
  physiciansAPI,
  servicesAPI,
} from "../services/api";
import { BillingCode } from "../types";
import BillingCodeConfigurationModal from "./BillingCodeConfigurationModal";

interface ScannedPatientData {
  billingNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  serviceDate?: string;
}

interface HealthInstitution {
  id: number;
  name: string;
  city: string;
  state: string;
}

interface ICDCode {
  id: number;
  code: string;
  description: string;
}

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

interface ServiceCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  scannedData: ScannedPatientData;
  physicianId: string;
}

type Step =
  | "patient"
  | "billingCodes"
  | "serviceDate"
  | "serviceLocation"
  | "locationOfService"
  | "icdCode"
  | "summary";

const ServiceCreationModal: React.FC<ServiceCreationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  scannedData,
  physicianId,
}) => {
  // Clear AsyncStorage when modal is closed
  const handleClose = async () => {
    try {
      await AsyncStorage.removeItem("scannedPatientData");
    } catch (error) {
      console.error("Error clearing scanned patient data on close:", error);
    }
    onClose();
  };
  const [currentStep, setCurrentStep] = useState<Step>("patient");
  const [patientData, setPatientData] =
    useState<ScannedPatientData>(scannedData);
  const [serviceDate, setServiceDate] = useState<string>(
    scannedData.serviceDate || format(new Date(), "yyyy-MM-dd")
  );
  const [serviceLocation, setServiceLocation] = useState<string>("X"); // Default to Rural/Northern
  const [locationOfService, setLocationOfService] = useState<string>("1"); // Default to Office
  const [selectedICDCode, setSelectedICDCode] = useState<ICDCode | null>(null);
  const [icdSearchQuery, setIcdSearchQuery] = useState<string>("");
  const [isPatientConfirmed, setIsPatientConfirmed] = useState<boolean>(false);
  const [selectedBillingCodes, setSelectedBillingCodes] = useState<
    BillingCode[]
  >([]);
  const [showBillingCodeDetails, setShowBillingCodeDetails] =
    useState<BillingCode | null>(null);
  const [codeSubSelections, setCodeSubSelections] = useState<
    CodeSubSelection[]
  >([]);
  const [showBillingCodeConfigModal, setShowBillingCodeConfigModal] =
    useState(false);
  const [currentCodeForConfig, setCurrentCodeForConfig] =
    useState<BillingCode | null>(null);

  // Service location options (based on ServiceFormScreen)
  const serviceLocationOptions = [
    { value: "R", label: "Regina" },
    { value: "S", label: "Saskatoon" },
    { value: "X", label: "Rural/Northern" },
  ];

  // Location of service options (based on ServiceFormScreen)
  const locationOfServiceOptions = [
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
  ];

  // Fetch health institutions
  const { data: healthInstitutions = [] } = useQuery<HealthInstitution[]>({
    queryKey: ["healthInstitutions"],
    queryFn: healthInstitutionsAPI.getAll,
  });

  // Fetch physician information to auto-set service location
  const { data: physician } = useQuery({
    queryKey: ["physician", physicianId],
    queryFn: async () => {
      const physicians = await physiciansAPI.getAll();
      return physicians.find((p) => p.id === physicianId) || null;
    },
    enabled: !!physicianId,
  });

  // Auto-set service location based on physician's city (like ServiceFormScreen)
  React.useEffect(() => {
    if (physician?.healthInstitution?.city) {
      const cityLower = physician.healthInstitution.city.toLowerCase();
      if (cityLower === "saskatoon") {
        setServiceLocation("S");
      } else if (cityLower === "regina") {
        setServiceLocation("R");
      } else {
        setServiceLocation("X"); // Rural/Northern for all other cities
      }
    }
  }, [physician]);

  // Fetch ICD codes
  const { data: icdCodes = [], isLoading: icdLoading } = useQuery<ICDCode[]>({
    queryKey: ["icdCodes", icdSearchQuery],
    queryFn: () => icdCodesAPI.search(icdSearchQuery),
    enabled: icdSearchQuery.length >= 2,
  });

  // Fetch frequently used billing codes for the physician
  const {
    data: frequentBillingCodes,
    isLoading: frequentCodesLoading,
    error: frequentCodesError,
  } = useQuery({
    queryKey: ["frequentBillingCodes", physicianId],
    queryFn: () => billingCodesAPI.getFrequentlyUsed(physicianId),
    enabled: !!physicianId,
    retry: false, // Don't retry on error
  });

  // Create patient mutation
  const createPatientMutation = useMutation({
    mutationFn: (patientData: ScannedPatientData) =>
      patientsAPI.create({
        ...patientData,
        physicianId,
        sex: patientData.gender,
      }),
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: (serviceData: any) => servicesAPI.create(serviceData),
  });

  // Check if patient exists
  const { data: existingPatient, isLoading: checkingPatient } = useQuery({
    queryKey: ["patient", patientData.billingNumber, physicianId],
    queryFn: async () => {
      try {
        const patients = await patientsAPI.getAll();
        const foundPatient = patients.find(
          (p: any) => p.billingNumber === patientData.billingNumber
        );
        return foundPatient || null; // Always return a value, null if not found
      } catch (error) {
        console.error("Error fetching patients:", error);
        return null; // Return null on error instead of throwing
      }
    },
    enabled:
      visible && patientData.billingNumber.length > 0 && physicianId.length > 0,
  });

  const handleNext = () => {
    switch (currentStep) {
      case "patient":
        if (existingPatient) {
          setIsPatientConfirmed(true);
          setCurrentStep("billingCodes");
        } else {
          // For new patients, they must create the patient first
          // This should not be reachable due to canProceed() logic
          return;
        }
        break;
      case "billingCodes":
        // If billing codes are selected, go to service location steps
        // If no billing codes selected, skip to ICD code
        if (selectedBillingCodes.length > 0) {
          setCurrentStep("serviceDate");
        } else {
          setCurrentStep("icdCode");
        }
        break;
      case "serviceDate":
        setCurrentStep("serviceLocation");
        break;
      case "serviceLocation":
        setCurrentStep("locationOfService");
        break;
      case "locationOfService":
        setCurrentStep("icdCode");
        break;
      case "icdCode":
        setCurrentStep("summary");
        break;
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case "billingCodes":
        setCurrentStep("patient");
        break;
      case "serviceDate":
        setCurrentStep("billingCodes");
        break;
      case "serviceLocation":
        setCurrentStep("serviceDate");
        break;
      case "locationOfService":
        setCurrentStep("serviceLocation");
        break;
      case "icdCode":
        // If we have billing codes, go back to locationOfService
        // If no billing codes, go back to billingCodes
        if (selectedBillingCodes.length > 0) {
          setCurrentStep("locationOfService");
        } else {
          setCurrentStep("billingCodes");
        }
        break;
      case "summary":
        setCurrentStep("icdCode");
        break;
    }
  };

  const handleCreatePatient = async () => {
    try {
      await createPatientMutation.mutateAsync(patientData);
      setIsPatientConfirmed(true);
      Alert.alert("Success", "Patient created successfully", [
        {
          text: "Continue",
          onPress: () => setCurrentStep("serviceDate"),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to create patient");
    }
  };

  const handleCreateService = async () => {
    try {
      // Prepare billing codes data using configured sub-selections
      const billingCodesData = selectedBillingCodes.map((code) => {
        const subSelection = getSubSelectionForCode(code.id);
        return {
          codeId: code.id,
          status: "ACTIVE",
          billing_record_type: code.billing_record_type || 1,
          serviceStartTime: subSelection?.serviceStartTime || null,
          serviceEndTime: subSelection?.serviceEndTime || null,
          numberOfUnits: subSelection?.numberOfUnits || 1,
          bilateralIndicator: subSelection?.bilateralIndicator || null,
          specialCircumstances: subSelection?.specialCircumstances || null,
          serviceDate: subSelection?.serviceDate || serviceDate,
          serviceEndDate: subSelection?.serviceEndDate || null,
          fee_determinant: code.fee_determinant || "A",
          multiple_unit_indicator: code.multiple_unit_indicator || null,
        };
      });

      const serviceData = {
        physicianId,
        patientId: existingPatient?.id || createPatientMutation.data?.id,
        serviceDate,
        serviceLocation:
          selectedBillingCodes.length > 0 ? serviceLocation : null,
        locationOfService:
          selectedBillingCodes.length > 0 ? locationOfService : null,
        icdCodeId: selectedICDCode?.id,
        summary: `Service created from camera scan - ${patientData.firstName} ${patientData.lastName}`,
        serviceStatus: "OPEN",
        billingCodes: billingCodesData,
      };

      await createServiceMutation.mutateAsync(serviceData);

      // Clear scanned patient data from AsyncStorage to prevent re-triggering
      try {
        await AsyncStorage.removeItem("scannedPatientData");
      } catch (error) {
        console.error("Error clearing scanned patient data:", error);
      }

      Alert.alert("Success", "Claim created successfully", [
        {
          text: "OK",
          onPress: () => {
            onSuccess();
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error("Error creating service:", error);
      Alert.alert("Error", "Failed to create claim");
    }
  };

  // Helper functions for billing code configuration
  const isType57Code = (code: BillingCode) => {
    return code.billing_record_type === 57;
  };

  const isWorXSection = (code: BillingCode) => {
    return code.section.code === "W" || code.section.code === "X";
  };

  const isHSection = (code: BillingCode) => {
    return code.section.code === "H";
  };

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

    // Check if bilateral indicator is required
    if (code.title.includes("Bilateral")) {
      return true;
    }

    // Check if special circumstances are required (W/X section)
    if (isWorXSection(code)) {
      return true;
    }

    // Check if special circumstances are required (H section)
    if (isHSection(code)) {
      return true;
    }

    return false;
  };

  const calculateServiceDates = (
    code: BillingCode
  ): { serviceDate: string | null; serviceEndDate: string | null } => {
    const today = new Date().toISOString().split("T")[0];
    // For type 57 codes, calculate dates based on service date and existing codes
    if (isType57Code(code)) {
      // This would need more complex logic based on existing service codes
      // For now, return basic dates
      return {
        serviceDate: today,
        serviceEndDate: today,
      };
    }
    return {
      serviceDate: today,
      serviceEndDate: null,
    };
  };

  const getSubSelectionForCode = (
    codeId: number
  ): CodeSubSelection | undefined => {
    return codeSubSelections.find((sub) => sub.codeId === codeId);
  };

  const handleUpdateSubSelection = (
    codeId: number,
    updates: Partial<CodeSubSelection>
  ) => {
    setCodeSubSelections((prev) =>
      prev.map((sub) => (sub.codeId === codeId ? { ...sub, ...updates } : sub))
    );
  };

  const handleBillingCodeConfiguration = (code: BillingCode) => {
    // Create or get existing sub-selection for this code
    let subSelection = getSubSelectionForCode(code.id);
    if (!subSelection) {
      const calculatedDates = calculateServiceDates(code);
      const today = new Date().toISOString().split("T")[0];
      const defaultServiceDate = !isType57Code(code)
        ? today
        : calculatedDates.serviceDate;

      subSelection = {
        codeId: code.id,
        serviceDate: defaultServiceDate,
        serviceEndDate: calculatedDates.serviceEndDate,
        bilateralIndicator: null,
        serviceStartTime: null,
        serviceEndTime: null,
        numberOfUnits: 1,
        specialCircumstances: null,
      };

      setCodeSubSelections((prev) => [...prev, subSelection!]);
    }

    setCurrentCodeForConfig(code);
    setShowBillingCodeConfigModal(true);
  };

  const canProceed = () => {
    switch (currentStep) {
      case "patient":
        return existingPatient && !checkingPatient;
      case "billingCodes":
        return true; // Billing codes are optional
      case "serviceDate":
        return serviceDate.length > 0;
      case "serviceLocation":
        return serviceLocation.length > 0;
      case "locationOfService":
        return locationOfService.length > 0;
      case "icdCode":
        return selectedICDCode !== null;
      case "summary":
        return true;
      default:
        return false;
    }
  };

  // Date navigation helpers for service date
  const canDecrementServiceDate = () => {
    if (!serviceDate) return false;
    const currentDate = new Date(serviceDate + "T00:00:00");
    const minDate = new Date("2020-01-01T00:00:00");
    return currentDate > minDate; // Reasonable minimum date
  };

  const canIncrementServiceDate = () => {
    if (!serviceDate) return false;
    const currentDate = new Date(serviceDate + "T00:00:00");
    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const todayDate = new Date(todayString + "T00:00:00");
    // Disable if current date is today or in the future
    return currentDate < todayDate;
  };

  const decrementServiceDate = () => {
    if (!serviceDate || !canDecrementServiceDate()) return;
    const currentDate = new Date(serviceDate);
    currentDate.setDate(currentDate.getDate() - 1);
    const newDate = currentDate.toISOString().split("T")[0];
    setServiceDate(newDate);
  };

  const incrementServiceDate = () => {
    if (!serviceDate || !canIncrementServiceDate()) return;
    const currentDate = new Date(serviceDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const newDate = currentDate.toISOString().split("T")[0];
    setServiceDate(newDate);
  };

  const renderPatientStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Patient Information</Text>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.fieldLabel}>Health Service Number:</Text>
          <Text style={styles.fieldValue}>{patientData.billingNumber}</Text>

          <Text style={styles.fieldLabel}>Name:</Text>
          <Text style={styles.fieldValue}>
            {patientData.firstName} {patientData.lastName}
          </Text>

          <Text style={styles.fieldLabel}>Date of Birth:</Text>
          <Text style={styles.fieldValue}>{patientData.dateOfBirth}</Text>

          <Text style={styles.fieldLabel}>Gender:</Text>
          <Text style={styles.fieldValue}>{patientData.gender}</Text>
        </Card.Content>
      </Card>

      {checkingPatient ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" style={styles.loading} />
          <Text style={styles.loadingText}>Checking patient records...</Text>
        </View>
      ) : existingPatient ? (
        <View style={styles.patientStatusContainer}>
          <Text style={styles.infoText}>✓ You've seen this patient before</Text>
          <Text style={styles.debugText}>
            Found: {existingPatient.firstName} {existingPatient.lastName}
          </Text>
        </View>
      ) : (
        <View style={styles.newPatientContainer}>
          <Text style={styles.infoText}>
            This is a new patient. Please confirm the information above and
            create the patient to continue.
          </Text>
          <Text style={styles.debugText}>
            Searching for billing number: {patientData.billingNumber}
          </Text>
          <TouchableOpacity
            onPress={handleCreatePatient}
            disabled={createPatientMutation.isPending}
            style={[
              styles.createPatientButton,
              createPatientMutation.isPending && styles.disabledButton,
            ]}
          >
            {createPatientMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createPatientButtonText}>Create Patient</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBillingCodesStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Billing Codes</Text>
      <Text style={styles.stepSubtitle}>
        Select frequently used billing codes (optional)
      </Text>
      <Text style={styles.stepNote}>
        If you select billing codes, you'll be asked to set service location and
        location of service for all selected codes.
      </Text>

      {frequentCodesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" style={styles.loading} />
          <Text style={styles.loadingText}>Loading billing codes...</Text>
        </View>
      ) : frequentCodesError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Unable to load billing codes</Text>
          <Text style={styles.errorSubtext}>
            You can still proceed without selecting codes
          </Text>
        </View>
      ) : (frequentBillingCodes || []).length === 0 ? (
        <View style={styles.noCodesContainer}>
          <Text style={styles.noCodesText}>No frequently used codes found</Text>
          <Text style={styles.noCodesSubtext}>
            You can still proceed without selecting codes
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.billingCodesList}
          showsVerticalScrollIndicator={false}
        >
          {(frequentBillingCodes || []).map((code: BillingCode) => (
            <TouchableOpacity
              key={code.id}
              style={[
                styles.billingCodeItem,
                selectedBillingCodes.some(
                  (selected) => selected.id === code.id
                ) && styles.selectedBillingCodeItem,
              ]}
              onPress={() => {
                const isSelected = selectedBillingCodes.some(
                  (selected) => selected.id === code.id
                );
                if (isSelected) {
                  // Remove the code and its sub-selection
                  setSelectedBillingCodes(
                    selectedBillingCodes.filter(
                      (selected) => selected.id !== code.id
                    )
                  );
                  setCodeSubSelections(
                    codeSubSelections.filter((sub) => sub.codeId !== code.id)
                  );
                } else {
                  // Add the code to selection
                  setSelectedBillingCodes([...selectedBillingCodes, code]);

                  // If the code requires configuration, show the configuration modal
                  if (requiresExtraSelections(code)) {
                    handleBillingCodeConfiguration(code);
                  } else {
                    // For codes that don't require configuration, add default sub-selection
                    const today = new Date().toISOString().split("T")[0];
                    const defaultSubSelection: CodeSubSelection = {
                      codeId: code.id,
                      serviceDate: today,
                      serviceEndDate: null,
                      bilateralIndicator: null,
                      serviceStartTime: null,
                      serviceEndTime: null,
                      numberOfUnits: 1,
                      specialCircumstances: null,
                    };
                    setCodeSubSelections((prev) => [
                      ...prev,
                      defaultSubSelection,
                    ]);
                  }
                }
              }}
              onLongPress={() => setShowBillingCodeDetails(code)}
            >
              <View style={styles.billingCodeHeader}>
                <Text style={styles.billingCodeCode}>{code.code}</Text>
                <Text style={styles.billingCodeTitle}>{code.title}</Text>
              </View>
              <Text style={styles.billingCodeDescription} numberOfLines={2}>
                {code.description || "No description available"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {selectedBillingCodes.length > 0 && (
        <View style={styles.selectedCodesContainer}>
          <Text style={styles.selectedCodesTitle}>Selected Codes:</Text>
          {selectedBillingCodes.map((code) => (
            <View key={code.id} style={styles.selectedCodeItem}>
              <Text style={styles.selectedCodeText}>
                {code.code} - {code.title}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Billing Code Details Modal */}
      <Modal
        visible={!!showBillingCodeDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBillingCodeDetails(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModal}>
            <Text style={styles.detailsModalTitle}>
              {showBillingCodeDetails?.code} - {showBillingCodeDetails?.title}
            </Text>
            <Text style={styles.detailsModalDescription}>
              {showBillingCodeDetails?.description ||
                "No description available"}
            </Text>
            <TouchableOpacity
              style={styles.closeDetailsButton}
              onPress={() => setShowBillingCodeDetails(null)}
            >
              <Text style={styles.closeDetailsButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderServiceDateStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Admission Date</Text>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.dateInputContainer}>
            <TouchableOpacity
              style={[
                styles.dateArrowButton,
                !canDecrementServiceDate() && styles.disabledDateArrowButton,
              ]}
              onPress={decrementServiceDate}
              disabled={!canDecrementServiceDate()}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={canDecrementServiceDate() ? "#3b82f6" : "#d1d5db"}
              />
            </TouchableOpacity>
            <TextInput
              label="Service Date"
              value={serviceDate}
              onChangeText={setServiceDate}
              mode="outlined"
              style={[styles.input, styles.dateInputWithArrows]}
            />
            <TouchableOpacity
              style={[
                styles.dateArrowButton,
                !canIncrementServiceDate() && styles.disabledDateArrowButton,
              ]}
              onPress={incrementServiceDate}
              disabled={!canIncrementServiceDate()}
            >
              <Ionicons
                name="chevron-forward"
                size={20}
                color={canIncrementServiceDate() ? "#3b82f6" : "#d1d5db"}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.dateNote}>
            Use arrows to adjust date by one day (max: today)
          </Text>
        </Card.Content>
      </Card>
    </View>
  );

  const renderServiceLocationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Service Location</Text>
      <View style={styles.buttonGrid}>
        {serviceLocationOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              serviceLocation === option.value && styles.selectedOptionButton,
            ]}
            onPress={() => setServiceLocation(option.value)}
          >
            <Text
              style={[
                styles.optionButtonText,
                serviceLocation === option.value &&
                  styles.selectedOptionButtonText,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLocationOfServiceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Location of Service</Text>
      <ScrollView
        style={styles.scrollableButtonGrid}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.buttonGrid}>
          {locationOfServiceOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                locationOfService === option.value &&
                  styles.selectedOptionButton,
              ]}
              onPress={() => setLocationOfService(option.value)}
            >
              <Text
                style={[
                  styles.optionButtonText,
                  locationOfService === option.value &&
                    styles.selectedOptionButtonText,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderICDCodeStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>ICD Code</Text>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Search ICD Code"
            value={icdSearchQuery}
            onChangeText={setIcdSearchQuery}
            mode="outlined"
            style={styles.input}
          />

          {icdLoading && (
            <ActivityIndicator size="small" style={styles.loading} />
          )}

          {icdCodes.length > 0 && (
            <ScrollView style={styles.icdList} nestedScrollEnabled>
              {icdCodes.map((code) => (
                <TouchableOpacity
                  key={code.id}
                  style={[
                    styles.icdItem,
                    selectedICDCode?.id === code.id && styles.selectedIcdItem,
                  ]}
                  onPress={() => setSelectedICDCode(code)}
                >
                  <Text style={styles.icdCode}>{code.code}</Text>
                  <Text style={styles.icdDescription}>{code.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {selectedICDCode && (
            <View style={styles.selectedIcdContainer}>
              <Text style={styles.selectedIcdText}>
                Selected: {selectedICDCode.code} - {selectedICDCode.description}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>
    </View>
  );

  const renderSummaryStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Summary</Text>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.fieldLabel}>Patient:</Text>
          <Text style={styles.fieldValue}>
            {patientData.firstName} {patientData.lastName}
          </Text>

          <Text style={styles.fieldLabel}>Service Date:</Text>
          <Text style={styles.fieldValue}>{serviceDate}</Text>

          {selectedBillingCodes.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Billing Codes:</Text>
              {selectedBillingCodes.map((code) => (
                <Text key={code.id} style={styles.fieldValue}>
                  {code.code} - {code.title}
                </Text>
              ))}
            </>
          )}

          {selectedBillingCodes.length > 0 && (
            <>
              <Text style={styles.fieldLabel}>Service Location:</Text>
              <Text style={styles.fieldValue}>
                {
                  serviceLocationOptions.find(
                    (opt) => opt.value === serviceLocation
                  )?.label
                }{" "}
                (will be applied to all billing codes)
              </Text>

              <Text style={styles.fieldLabel}>Location of Service:</Text>
              <Text style={styles.fieldValue}>
                {
                  locationOfServiceOptions.find(
                    (opt) => opt.value === locationOfService
                  )?.label
                }{" "}
                (will be applied to all billing codes)
              </Text>
            </>
          )}

          {selectedICDCode && (
            <>
              <Text style={styles.fieldLabel}>ICD Code:</Text>
              <Text style={styles.fieldValue}>
                {selectedICDCode.code} - {selectedICDCode.description}
              </Text>
            </>
          )}
        </Card.Content>
      </Card>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case "patient":
        return renderPatientStep();
      case "billingCodes":
        return renderBillingCodesStep();
      case "serviceDate":
        return renderServiceDateStep();
      case "serviceLocation":
        return renderServiceLocationStep();
      case "locationOfService":
        return renderLocationOfServiceStep();
      case "icdCode":
        return renderICDCodeStep();
      case "summary":
        return renderSummaryStep();
      default:
        return null;
    }
  };

  const isLastStep = currentStep === "summary";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Claim</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderCurrentStep()}
        </ScrollView>

        <View style={styles.footer}>
          {currentStep !== "patient" && (
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={isLastStep ? handleCreateService : handleNext}
            disabled={!canProceed() || createServiceMutation.isPending}
            style={[
              styles.nextButton,
              (!canProceed() || createServiceMutation.isPending) &&
                styles.disabledButton,
            ]}
          >
            {createServiceMutation.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>
                {isLastStep ? "Create Claim" : "Next"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Billing Code Configuration Modal */}
      <BillingCodeConfigurationModal
        visible={showBillingCodeConfigModal}
        billingCode={currentCodeForConfig}
        subSelection={
          currentCodeForConfig
            ? getSubSelectionForCode(currentCodeForConfig.id) || null
            : null
        }
        onClose={() => setShowBillingCodeConfigModal(false)}
        onSave={(subSelection) => {
          handleUpdateSubSelection(subSelection.codeId, subSelection);
        }}
        serviceDate={serviceDate}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
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
  stepContainer: {
    flex: 1,
    minHeight: 400, // Ensure minimum height for better space utilization
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#333",
    textAlign: "center",
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
  fieldLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 18,
    color: "#333",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  input: {
    marginBottom: 20,
  },
  // New button grid styles
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  scrollableButtonGrid: {
    flex: 1,
    maxHeight: 500,
  },
  optionButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 12,
    minWidth: "45%",
    flex: 1,
    marginHorizontal: 6,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedOptionButton: {
    backgroundColor: "#2196f3",
    borderColor: "#1976d2",
    shadowColor: "#2196f3",
    shadowOpacity: 0.3,
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  selectedOptionButtonText: {
    color: "#fff",
  },
  icdList: {
    maxHeight: 300,
    marginTop: 12,
  },
  icdItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  selectedIcdItem: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
    borderWidth: 2,
  },
  icdCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  icdDescription: {
    fontSize: 16,
    color: "#666",
    marginTop: 6,
  },
  selectedIcdContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#e8f5e8",
    borderRadius: 12,
  },
  selectedIcdText: {
    fontSize: 16,
    color: "#2e7d32",
    fontWeight: "600",
  },
  infoText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginVertical: 12,
    lineHeight: 24,
  },
  debugText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginVertical: 6,
    fontStyle: "italic",
  },
  loading: {
    marginVertical: 12,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    flex: 1,
    marginRight: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  nextButton: {
    flex: 2,
    marginLeft: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#2196f3",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2196f3",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  disabledButton: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  // Patient step specific styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    marginTop: 12,
  },
  patientStatusContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  newPatientContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  createPatientButton: {
    marginTop: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: "#4caf50",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4caf50",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  createPatientButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  // Billing codes step styles
  stepSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
  },
  stepNote: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
    fontStyle: "italic",
  },
  billingCodesList: {
    flex: 1,
    maxHeight: 400,
  },
  billingCodeItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedBillingCodeItem: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
  },
  billingCodeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  billingCodeCode: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#2196f3",
  },
  billingCodeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    marginLeft: 12,
  },
  billingCodeDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  selectedCodesContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  selectedCodesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  selectedCodeItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedCodeText: {
    fontSize: 14,
    color: "#333",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  detailsModal: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    maxWidth: "90%",
    maxHeight: "80%",
  },
  detailsModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  detailsModalDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 24,
  },
  closeDetailsButton: {
    backgroundColor: "#2196f3",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  closeDetailsButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  // Error styles
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  // No codes styles
  noCodesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  noCodesText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 8,
  },
  noCodesSubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  // Date navigation styles
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
  dateInputWithArrows: {
    flex: 1,
  },
  dateNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    textAlign: "center",
  },
});

export default ServiceCreationModal;
