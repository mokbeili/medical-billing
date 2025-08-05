import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { patientsAPI, physiciansAPI, servicesAPI } from "../services/api";
import { Service } from "../types";

const ServicesScreen = ({ navigation }: any) => {
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: services,
    isLoading,
    refetch,
    error,
  } = useQuery({
    queryKey: ["services"],
    queryFn: servicesAPI.getAll,
    retry: 1,
  });

  const { data: patients, refetch: refetchPatients } = useQuery({
    queryKey: ["patients"],
    queryFn: patientsAPI.getAll,
    retry: 1,
  });

  const { data: physicians, refetch: refetchPhysicians } = useQuery({
    queryKey: ["physicians"],
    queryFn: physiciansAPI.getAll,
    retry: 1,
  });

  useEffect(() => {
    if (services) {
      let filtered = [...services];

      // Filter out services with claims by default
      filtered = filtered.filter((service) => service.claimId === null);

      // Filter out services without patient data
      filtered = filtered.filter((service) => service.patient != null);

      // Only show services with OPEN status by default
      filtered = filtered.filter((service) => service.status === "OPEN");

      // Apply search filter
      if (searchQuery.trim()) {
        const searchTerm = searchQuery.toLowerCase().trim();
        filtered = filtered.filter((service) => {
          // Search by patient name
          const patientName = `${service.patient?.firstName || ""} ${
            service.patient?.lastName || ""
          }`.toLowerCase();
          if (patientName.includes(searchTerm)) return true;

          // Search by billing number
          const billingNumber =
            service.patient?.billingNumber?.toLowerCase() || "";
          if (billingNumber.includes(searchTerm)) return true;

          // Search by ICD description
          const icdDescription =
            service.icdCode?.description?.toLowerCase() || "";
          if (icdDescription.includes(searchTerm)) return true;

          return false;
        });
      }

      setFilteredServices(filtered);
    }
  }, [services, searchQuery]);

  const handleCameraScan = () => {
    navigation.navigate("CameraScan");
  };

  const handleScannedPatientData = async (scannedData: any) => {
    try {
      // Validate that all required patient information is present
      if (
        !scannedData.firstName ||
        !scannedData.lastName ||
        !scannedData.dateOfBirth ||
        !scannedData.billingNumber
      ) {
        Alert.alert(
          "Incomplete Patient Data",
          "Please ensure all patient information (full name, date of birth, and billing number) is present before proceeding."
        );
        return;
      }

      // Get current physician (assuming first physician for now)
      const currentPhysician = physicians?.[0];
      if (!currentPhysician) {
        Alert.alert("Error", "No physician found. Please contact support.");
        return;
      }

      // Check if patient exists in physician's list
      const existingPatient = patients?.find(
        (patient) =>
          patient.billingNumber === scannedData.billingNumber &&
          patient.firstName.toLowerCase() ===
            scannedData.firstName.toLowerCase() &&
          patient.lastName.toLowerCase() === scannedData.lastName.toLowerCase()
      );

      let patientId: string;

      if (!existingPatient) {
        // Create new patient
        try {
          const newPatient = await patientsAPI.create({
            firstName: scannedData.firstName,
            lastName: scannedData.lastName,
            billingNumber: scannedData.billingNumber,
            dateOfBirth: scannedData.dateOfBirth,
            sex: scannedData.gender === "M" ? "M" : "F",
            physicianId: currentPhysician.id,
          });
          patientId = newPatient.id;
          await refetchPatients();
          Alert.alert("Success", "New patient created successfully!");
        } catch (error) {
          console.error("Error creating patient:", error);
          Alert.alert(
            "Error",
            "Failed to create new patient. Please try again."
          );
          return;
        }
      } else {
        patientId = existingPatient.id;
      }

      // Check if there are open services for this physician/patient combination
      const openServices = services?.filter(
        (service) =>
          service.patient.id === patientId &&
          service.physician.id === currentPhysician.id &&
          service.status === "OPEN"
      );

      if (!openServices || openServices.length === 0) {
        // Create a new service for the patient
        try {
          const serviceData = {
            physicianId: currentPhysician.id,
            patientId: patientId,
            serviceDate:
              scannedData.serviceDate || new Date().toISOString().split("T")[0],
            referringPhysicianId: null,
            icdCodeId: null,
            healthInstitutionId: null,
            summary: "",
            serviceLocation: null,
            locationOfService: null,
            serviceStatus: "OPEN",
            billingCodes: [],
          };

          const newService = await servicesAPI.create(serviceData);
          await refetch();
          Alert.alert("Success", "New service created for patient!");

          // Navigate to service form to add billing codes
          navigation.navigate("ServiceForm", { serviceId: newService.id });
        } catch (error) {
          console.error("Error creating service:", error);
          Alert.alert(
            "Error",
            "Failed to create new service. Please try again."
          );
          return;
        }
      }

      // Set search query to patient's full name
      const fullName = `${scannedData.firstName} ${scannedData.lastName}`;
      setSearchQuery(fullName);
    } catch (error) {
      console.error("Error handling scanned patient data:", error);
      Alert.alert(
        "Error",
        "Failed to process scanned patient data. Please try again."
      );
    }
  };

  // Listen for navigation events to handle scanned data
  React.useEffect(() => {
    const unsubscribe = navigation.addListener("focus", async () => {
      // Check if we have scanned data from CameraScanScreen in AsyncStorage
      try {
        const scannedDataStr = await AsyncStorage.getItem("scannedPatientData");
        if (scannedDataStr) {
          const scannedData = JSON.parse(scannedDataStr);
          // Clear the stored data to avoid processing again
          await AsyncStorage.removeItem("scannedPatientData");
          handleScannedPatientData(scannedData);
        }
      } catch (error) {
        console.error("Error reading scanned data from AsyncStorage:", error);
      }
    });

    return unsubscribe;
  }, [navigation, patients, physicians, services]);

  const handleServiceSelect = (serviceId: string) => {
    // Don't allow selection of services without patient data
    const service = services?.find((s) => s.id === serviceId);
    if (!service?.patient) {
      Alert.alert("Error", "Cannot select service with missing patient data");
      return;
    }

    // Don't allow selection of services that are not OPEN
    const hasOpenStatus = service.serviceCodes.some(
      (code) => code.status === "OPEN"
    );
    if (!hasOpenStatus) {
      Alert.alert("Error", "Cannot select service that is not in OPEN status");
      return;
    }

    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter((id) => id !== serviceId));
    } else {
      // Check if this is the first selection
      if (selectedServices.length === 0) {
        setSelectedServices([serviceId]);
      } else {
        // Get the first selected service to compare physician and jurisdiction
        const firstSelected = services?.find(
          (s) => s.id === selectedServices[0]
        );
        const currentService = services?.find((s) => s.id === serviceId);

        if (!firstSelected || !currentService) return;

        // Check if the physician and jurisdiction match
        const firstServiceCode = firstSelected.serviceCodes[0];
        const currentServiceCode = currentService.serviceCodes[0];

        if (
          firstServiceCode &&
          currentServiceCode &&
          firstSelected.physician?.id === currentService.physician?.id &&
          firstServiceCode.billingCode.section.code ===
            currentServiceCode.billingCode.section.code
        ) {
          setSelectedServices([...selectedServices, serviceId]);
        } else {
          Alert.alert(
            "Selection Error",
            "You can only select services from the same physician and jurisdiction."
          );
        }
      }
    }
  };

  const handleCreateClaim = async () => {
    if (selectedServices.length === 0) return;

    try {
      const response = await fetch("/api/billing-claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceIds: selectedServices,
        }),
      });

      if (response.ok) {
        Alert.alert("Success", "Claim created successfully!");
        setSelectedServices([]);
        refetch();
      } else {
        Alert.alert("Error", "Failed to create claim");
      }
    } catch (error) {
      console.error("Error creating claim:", error);
      Alert.alert("Error", "Failed to create claim");
    }
  };

  const handleSelectAll = () => {
    if (filteredServices.length === 0) return;

    // If all filtered services are already selected, deselect all
    if (
      filteredServices.every((service) => selectedServices.includes(service.id))
    ) {
      setSelectedServices([]);
      return;
    }

    // Get the first service to use as reference for validation
    const firstService = filteredServices[0];
    const firstServiceCode = firstService.serviceCodes[0];

    // Only select services that match the first service's physician and jurisdiction and have OPEN status
    const validServices = filteredServices.filter((service) => {
      const serviceCode = service.serviceCodes[0];
      const hasOpenStatus = service.serviceCodes.some(
        (code) => code.status === "OPEN"
      );
      return (
        serviceCode &&
        firstServiceCode &&
        hasOpenStatus &&
        service.physician?.id === firstService.physician?.id &&
        serviceCode.billingCode.section.code ===
          firstServiceCode.billingCode.section.code
      );
    });

    setSelectedServices(validServices.map((service) => service.id));
  };

  const renderService = (service: Service) => {
    const isSelected = selectedServices.includes(service.id);
    const hasClaim = service.claimId !== null;
    const hasOpenStatus = service.status === "OPEN";

    // Generate patient description
    const getPatientDescription = () => {
      if (!service.patient) return "Unknown patient";

      const age = service.patient.dateOfBirth
        ? new Date().getFullYear() -
          new Date(service.patient.dateOfBirth).getFullYear()
        : null;

      const sex = service.patient.sex || "unknown";
      const sexText = sex === "M" ? "male" : sex === "F" ? "female" : "unknown";

      if (age) {
        return `${age} year old ${sexText}`;
      }
      return `${sexText}`;
    };

    // Format date as DD/MM/YYYY without timezone conversion
    const formatServiceDate = (dateString: string) => {
      const date = new Date(dateString);
      const day = date.getUTCDate().toString().padStart(2, "0");
      const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
      const year = date.getUTCFullYear();
      return `${day}/${month}/${year}`;
    };

    return (
      <TouchableOpacity
        key={service.id}
        onPress={() =>
          navigation.navigate("ServiceForm", { serviceId: service.id })
        }
      >
        <Card style={styles.card} mode="outlined">
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>
                  {service.patient?.firstName || "Unknown"}{" "}
                  {service.patient?.lastName || "Patient"}
                </Text>
                <Text style={styles.patientDescription}>
                  {getPatientDescription()}
                </Text>
                <Text style={styles.billingNumber}>
                  #{service.patient?.billingNumber || "N/A"}
                </Text>
              </View>
              <View style={styles.serviceDateContainer}>
                <Text style={styles.serviceDate}>
                  {formatServiceDate(service.serviceDate)}
                </Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={async () => {
                      try {
                        const result = await servicesAPI.round(service.id);
                        Alert.alert("Success", result.message);
                        // Refresh the services list
                        refetch();
                      } catch (error) {
                        console.error("Error performing rounding:", error);
                        Alert.alert(
                          "Error",
                          "Failed to perform rounding. Please try again."
                        );
                      }
                    }}
                  >
                    <Ionicons name="repeat" size={20} color="#2563eb" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      // TODO: Add service code functionality
                      console.log(
                        "Add service code pressed for service:",
                        service.id
                      );
                    }}
                  >
                    <Ionicons name="add" size={20} color="#059669" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      // TODO: Add discharge patient functionality
                      console.log(
                        "Discharge patient pressed for service:",
                        service.id
                      );
                    }}
                  >
                    <Ionicons name="exit-outline" size={20} color="#dc2626" />
                  </TouchableOpacity>
                </View>
              </View>
              {/* <Checkbox
                status={isSelected ? "checked" : "unchecked"}
                onPress={(e) => {
                  e.stopPropagation();
                  handleServiceSelect(service.id);
                }}
                disabled={hasClaim || !hasOpenStatus}
              /> */}
            </View>

            {service.icdCode && (
              <View style={styles.icdCode}>
                <Text style={styles.icdText}>
                  {service.icdCode.description}
                </Text>
              </View>
            )}

            {/* <View style={styles.serviceCodes}>
              <Text style={styles.serviceCodesTitle}>Service Codes:</Text>
              {service.serviceCodes.map((code, index) => (
                <View key={index} style={styles.serviceCode}>
                  <Chip mode="flat" style={styles.codeChip}>
                    {code.billingCode.code}
                  </Chip>
                  <Text style={styles.codeTitle}>{code.billingCode.title}</Text>
                  <Text style={styles.codeStatus}>Status: {code.status}</Text>
                </View>
              ))}
            </View> */}

            {hasClaim && (
              <View style={styles.claimedBadge}>
                <Chip mode="flat" style={styles.claimedChip}>
                  Claimed
                </Chip>
              </View>
            )}

            {!hasOpenStatus && !hasClaim && (
              <View style={styles.statusBadge}>
                <Chip mode="flat" style={styles.nonPendingChip}>
                  Not Open
                </Chip>
              </View>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Services</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleCameraScan}
          >
            <Ionicons name="camera" size={24} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("ServiceForm")}
          >
            <Ionicons name="add" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by patient name, billing number, or ICD description..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {selectedServices.length > 0 && (
        <View style={styles.actionBar}>
          <Text style={styles.selectedCount}>
            {selectedServices.length} service(s) selected
          </Text>
          <Button
            mode="contained"
            onPress={handleCreateClaim}
            style={styles.createClaimButton}
          >
            Create Claim
          </Button>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Loading services...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading services</Text>
            <Text style={styles.errorSubtext}>Please try again later</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => refetch()}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredServices && filteredServices.length > 0 ? (
          <View style={styles.servicesList}>
            {filteredServices.map(renderService)}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No services found.</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cameraButton: {
    backgroundColor: "#059669",
    borderRadius: 8,
    padding: 8,
  },
  addButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 8,
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

  actionBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#dbeafe",
    borderBottomWidth: 1,
    borderBottomColor: "#93c5fd",
  },
  selectedCount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e40af",
  },
  createClaimButton: {
    backgroundColor: "#059669",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
  },
  servicesList: {
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
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  patientDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  billingNumber: {
    fontSize: 14,
    color: "#64748b",
  },
  serviceDateContainer: {
    alignItems: "flex-end",
  },
  serviceInfo: {
    marginBottom: 12,
  },
  serviceDate: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "500",
  },
  physician: {
    fontSize: 14,
    color: "#475569",
  },
  icdCode: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
  },
  icdLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 2,
  },
  icdText: {
    fontSize: 14,
    color: "#374151",
  },
  serviceCodes: {
    marginBottom: 8,
  },
  serviceCodesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  serviceCode: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#f8fafc",
    borderRadius: 6,
  },
  codeChip: {
    backgroundColor: "#dbeafe",
    marginBottom: 4,
  },
  codeTitle: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 2,
  },
  codeStatus: {
    fontSize: 12,
    color: "#64748b",
  },
  claimedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  claimedChip: {
    backgroundColor: "#fef3c7",
  },
  statusBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  nonPendingChip: {
    backgroundColor: "#fee2e2",
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#dc2626",
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 16,
  },
  actionButton: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
});

export default ServicesScreen;
