import { Ionicons } from "@expo/vector-icons";
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
import { Button, Card, RadioButton, TextInput } from "react-native-paper";
import {
  healthInstitutionsAPI,
  icdCodesAPI,
  patientsAPI,
  physiciansAPI,
  servicesAPI,
} from "../services/api";

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

interface ServiceCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  scannedData: ScannedPatientData;
  physicianId: string;
}

type Step =
  | "patient"
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
          setCurrentStep("serviceDate");
        } else {
          setCurrentStep("serviceDate");
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
      case "serviceDate":
        setCurrentStep("patient");
        break;
      case "serviceLocation":
        setCurrentStep("serviceDate");
        break;
      case "locationOfService":
        setCurrentStep("serviceLocation");
        break;
      case "icdCode":
        setCurrentStep("locationOfService");
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
      Alert.alert("Success", "Patient created successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to create patient");
    }
  };

  const handleCreateService = async () => {
    try {
      const serviceData = {
        physicianId,
        patientId: existingPatient?.id || createPatientMutation.data?.id,
        serviceDate,
        serviceLocation,
        locationOfService,
        icdCodeId: selectedICDCode?.id,
        summary: `Service created from camera scan - ${patientData.firstName} ${patientData.lastName}`,
        serviceStatus: "OPEN",
        billingCodes: [], // Empty for now, can be added later
      };

      await createServiceMutation.mutateAsync(serviceData);
      Alert.alert("Success", "Service created successfully", [
        {
          text: "OK",
          onPress: () => {
            onSuccess();
            onClose();
          },
        },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to create claim");
    }
  };

  const renderPatientStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Patient Information</Text>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.fieldLabel}>Billing Number:</Text>
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
        <ActivityIndicator size="small" style={styles.loading} />
      ) : existingPatient ? (
        <View>
          <Text style={styles.infoText}>✓ You've seen ths patient before</Text>
          <Text style={styles.debugText}>
            Found: {existingPatient.firstName} {existingPatient.lastName}
          </Text>
        </View>
      ) : (
        <View>
          <Text style={styles.infoText}>
            Patient not found. Create new patient?
          </Text>
          <Text style={styles.debugText}>
            Searching for billing number: {patientData.billingNumber}
          </Text>
          <Button
            mode="contained"
            onPress={handleCreatePatient}
            loading={createPatientMutation.isPending}
            style={styles.button}
          >
            Create Patient
          </Button>
        </View>
      )}
    </View>
  );

  const renderServiceDateStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Service Date</Text>
      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Service Date"
            value={serviceDate}
            onChangeText={setServiceDate}
            mode="outlined"
            style={styles.input}
          />
        </Card.Content>
      </Card>
    </View>
  );

  const renderServiceLocationStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Service Location</Text>
      <Card style={styles.card}>
        <Card.Content>
          {serviceLocationOptions.map((option) => (
            <View key={option.value} style={styles.radioOption}>
              <RadioButton
                value={option.value}
                status={
                  serviceLocation === option.value ? "checked" : "unchecked"
                }
                onPress={() => setServiceLocation(option.value)}
              />
              <Text style={styles.radioLabel}>{option.label}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    </View>
  );

  const renderLocationOfServiceStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Location of Service</Text>
      <Card style={styles.card}>
        <Card.Content>
          {locationOfServiceOptions.map((option) => (
            <View key={option.value} style={styles.radioOption}>
              <RadioButton
                value={option.value}
                status={
                  locationOfService === option.value ? "checked" : "unchecked"
                }
                onPress={() => setLocationOfService(option.value)}
              />
              <Text style={styles.radioLabel}>{option.label}</Text>
            </View>
          ))}
        </Card.Content>
      </Card>
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

          <Text style={styles.fieldLabel}>Service Location:</Text>
          <Text style={styles.fieldValue}>
            {
              serviceLocationOptions.find(
                (opt) => opt.value === serviceLocation
              )?.label
            }
          </Text>

          <Text style={styles.fieldLabel}>Location of Service:</Text>
          <Text style={styles.fieldValue}>
            {
              locationOfServiceOptions.find(
                (opt) => opt.value === locationOfService
              )?.label
            }
          </Text>

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

  const canProceed = () => {
    switch (currentStep) {
      case "patient":
        return existingPatient || isPatientConfirmed;
      case "serviceDate":
        return serviceDate.length > 0;
      case "serviceLocation":
        return serviceLocation.length > 0;
      case "locationOfService":
        return locationOfService.length > 0;
      case "icdCode":
        return true; // ICD code is optional
      case "summary":
        return true;
      default:
        return false;
    }
  };

  const isLastStep = currentStep === "summary";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Claim</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>{renderCurrentStep()}</ScrollView>

        <View style={styles.footer}>
          {currentStep !== "patient" && (
            <Button mode="outlined" onPress={handleBack} style={styles.button}>
              Back
            </Button>
          )}
          <Button
            mode="contained"
            onPress={isLastStep ? handleCreateService : handleNext}
            disabled={!canProceed() || createServiceMutation.isPending}
            loading={createServiceMutation.isPending}
            style={[styles.button, styles.primaryButton]}
          >
            {isLastStep ? "Create Claim" : "Next"}
          </Button>
        </View>
      </View>
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
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  card: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  radioLabel: {
    marginLeft: 8,
    fontSize: 16,
  },
  icdList: {
    maxHeight: 200,
    marginTop: 8,
  },
  icdItem: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedIcdItem: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196f3",
  },
  icdCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  icdDescription: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  selectedIcdContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#e8f5e8",
    borderRadius: 8,
  },
  selectedIcdText: {
    fontSize: 14,
    color: "#2e7d32",
    fontWeight: "600",
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginVertical: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginVertical: 4,
    fontStyle: "italic",
  },
  loading: {
    marginVertical: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  primaryButton: {
    backgroundColor: "#2196f3",
  },
});

export default ServiceCreationModal;
