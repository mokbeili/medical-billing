import { Ionicons } from "@expo/vector-icons";
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
import {
  ActivityIndicator,
  Button,
  Card,
  Checkbox,
  Chip,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { servicesAPI } from "../services/api";
import { Service } from "../types";

const ServicesScreen = ({ navigation }: any) => {
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    patientName: "",
    billingNumber: "",
    status: "",
    serviceDate: "",
    code: "",
    section: "",
    includeClaimed: false,
  });

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

  useEffect(() => {
    if (services) {
      let filtered = [...services];

      // Filter out services with claims by default unless includeClaimed is true
      if (!filters.includeClaimed) {
        filtered = filtered.filter((service) => service.claimId === null);
      }

      // Filter out services without patient data
      filtered = filtered.filter((service) => service.patient != null);

      if (filters.status && filters.status !== "ALL") {
        filtered = filtered.filter((service) =>
          service.serviceCodes.some((code) => code.status === filters.status)
        );
      }

      if (filters.patientName) {
        const searchTerm = filters.patientName.toLowerCase();
        filtered = filtered.filter(
          (service) =>
            service.patient?.firstName?.toLowerCase().includes(searchTerm) ||
            service.patient?.lastName?.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.billingNumber) {
        const searchTerm = filters.billingNumber.toLowerCase();
        filtered = filtered.filter((service) =>
          service.patient?.billingNumber?.toLowerCase().includes(searchTerm)
        );
      }

      if (filters.serviceDate) {
        const searchTerm = filters.serviceDate.toLowerCase();
        filtered = filtered.filter(
          (service) =>
            new Date(service.serviceDate).toISOString().slice(0, 16) ===
            searchTerm
        );
      }

      if (filters.code) {
        const searchTerm = filters.code.toLowerCase();
        filtered = filtered.filter((service) =>
          service.serviceCodes.some((code) =>
            code.billingCode.code.toLowerCase().includes(searchTerm)
          )
        );
      }

      if (filters.section) {
        const searchTerm = filters.section.toLowerCase();
        filtered = filtered.filter((service) =>
          service.serviceCodes.some(
            (code) =>
              code.billingCode.section.code
                .toLowerCase()
                .includes(searchTerm) ||
              code.billingCode.section.title.toLowerCase().includes(searchTerm)
          )
        );
      }

      setFilteredServices(filtered);
    }
  }, [services, filters]);

  const handleServiceSelect = (serviceId: string) => {
    // Don't allow selection of services without patient data
    const service = services?.find((s) => s.id === serviceId);
    if (!service?.patient) {
      Alert.alert("Error", "Cannot select service with missing patient data");
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

    // Only select services that match the first service's physician and jurisdiction
    const validServices = filteredServices.filter((service) => {
      const serviceCode = service.serviceCodes[0];
      return (
        serviceCode &&
        firstServiceCode &&
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
                <Text style={styles.billingNumber}>
                  #{service.patient?.billingNumber || "N/A"}
                </Text>
              </View>
              <Checkbox
                status={isSelected ? "checked" : "unchecked"}
                onPress={(e) => {
                  e.stopPropagation();
                  handleServiceSelect(service.id);
                }}
                disabled={hasClaim}
              />
            </View>

            <View style={styles.serviceInfo}>
              <Text style={styles.serviceDate}>
                Service Date:{" "}
                {new Date(service.serviceDate).toLocaleDateString()}
              </Text>
              <Text style={styles.physician}>
                Physician: {service.physician?.firstName || "Unknown"}{" "}
                {service.physician?.lastName || "Physician"}
              </Text>
            </View>

            {service.icdCode && (
              <View style={styles.icdCode}>
                <Text style={styles.icdLabel}>ICD Code:</Text>
                <Text style={styles.icdText}>
                  {service.icdCode.code} - {service.icdCode.description}
                </Text>
              </View>
            )}

            <View style={styles.serviceCodes}>
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
            </View>

            {hasClaim && (
              <View style={styles.claimedBadge}>
                <Chip mode="flat" style={styles.claimedChip}>
                  Claimed
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
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate("ServiceForm")}
        >
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TextInput
          style={styles.filterInput}
          placeholder="Patient Name"
          value={filters.patientName}
          onChangeText={(text) => setFilters({ ...filters, patientName: text })}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Billing Number"
          value={filters.billingNumber}
          onChangeText={(text) =>
            setFilters({ ...filters, billingNumber: text })
          }
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Service Date (YYYY-MM-DD)"
          value={filters.serviceDate}
          onChangeText={(text) => setFilters({ ...filters, serviceDate: text })}
        />
        <TextInput
          style={styles.filterInput}
          placeholder="Code"
          value={filters.code}
          onChangeText={(text) => setFilters({ ...filters, code: text })}
        />
        <View style={styles.checkboxContainer}>
          <Checkbox
            status={filters.includeClaimed ? "checked" : "unchecked"}
            onPress={() =>
              setFilters({
                ...filters,
                includeClaimed: !filters.includeClaimed,
              })
            }
          />
          <Text style={styles.checkboxLabel}>Include Claimed Services</Text>
        </View>
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
  addButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 8,
  },
  filters: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    fontSize: 16,
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 16,
    color: "#374151",
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
  billingNumber: {
    fontSize: 14,
    color: "#64748b",
  },
  serviceInfo: {
    marginBottom: 12,
  },
  serviceDate: {
    fontSize: 14,
    color: "#475569",
    marginBottom: 4,
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
});

export default ServicesScreen;
