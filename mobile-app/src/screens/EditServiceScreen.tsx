import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  healthInstitutionsAPI,
  patientsAPI,
  physiciansAPI,
  referringPhysiciansAPI,
  servicesAPI,
} from "../services/api";
import {
  BillingCode,
  ICDCode,
  ReferringPhysician,
  ServiceFormData,
} from "../types";

const EditServiceScreen = ({ navigation }: any) => {
  const route = useRoute();
  const { serviceId } = route.params as { serviceId: string };
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<ServiceFormData>({
    physicianId: "",
    patientId: "",
    referringPhysicianId: null,
    icdCodeId: null,
    healthInstitutionId: null,
    summary: "",
    serviceDate: new Date().toISOString().split("T")[0],
    serviceLocation: null,
    locationOfService: null,
    billingCodes: [],
  });

  const [selectedCodes, setSelectedCodes] = useState<BillingCode[]>([]);
  const [selectedIcdCode, setSelectedIcdCode] = useState<ICDCode | null>(null);
  const [referringPhysicianSearchQuery, setReferringPhysicianSearchQuery] =
    useState("");
  const [referringPhysicianSearchResults, setReferringPhysicianSearchResults] =
    useState<ReferringPhysician[]>([]);
  const [isSearchingReferringPhysician, setIsSearchingReferringPhysician] =
    useState(false);
  const [selectedReferringPhysician, setSelectedReferringPhysician] =
    useState<ReferringPhysician | null>(null);
  const [
    debouncedReferringPhysicianQuery,
    setDebouncedReferringPhysicianQuery,
  ] = useState("");

  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Location dropdown state
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Location of Service options
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

  // Helper function to get location of service text
  const getLocationOfServiceText = (value: string) => {
    const option = locationOfServiceOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  // Fetch service data
  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => servicesAPI.getById(serviceId),
    enabled: !!serviceId,
  });

  // Fetch other data
  const { data: physicians, isLoading: physiciansLoading } = useQuery({
    queryKey: ["physicians"],
    queryFn: physiciansAPI.getAll,
  });

  const { data: patients, isLoading: patientsLoading } = useQuery({
    queryKey: ["patients"],
    queryFn: patientsAPI.getAll,
  });

  const { data: healthInstitutions, isLoading: healthInstitutionsLoading } =
    useQuery({
      queryKey: ["health-institutions"],
      queryFn: healthInstitutionsAPI.getAll,
    });

  // Filter patients based on search query
  useEffect(() => {
    if (patients) {
      const filtered = patients.filter((patient) => {
        const searchLower = patientSearchQuery.toLowerCase();
        return (
          patient.firstName.toLowerCase().includes(searchLower) ||
          patient.lastName.toLowerCase().includes(searchLower) ||
          patient.billingNumber.toLowerCase().includes(searchLower)
        );
      });
      setFilteredPatients(filtered);
    }
  }, [patients, patientSearchQuery]);

  // Load existing service data
  useEffect(() => {
    if (service) {
      setFormData({
        physicianId: service.patient.physician.id,
        patientId: service.patient.id || "",
        referringPhysicianId: service.referringPhysician?.id || null,
        icdCodeId: service.icdCode?.id || null,
        healthInstitutionId: service.healthInstitution?.id || null,
        summary: service.serviceCodes[0]?.summary || "",
        serviceDate: new Date(service.serviceDate).toISOString().split("T")[0],
        serviceLocation: service.serviceCodes[0]?.serviceLocation || null,
        locationOfService: service.serviceCodes[0]?.locationOfService || null,
        billingCodes: service.serviceCodes.map((code) => ({
          codeId: code.billingCode.id,
          status: code.status,
          billing_record_type: code.billingCode.billing_record_type || 1,
          serviceStartTime: code.serviceStartTime,
          serviceEndTime: code.serviceEndTime,
          numberOfUnits: code.numberOfUnits,
          bilateralIndicator: code.bilateralIndicator,
          specialCircumstances: code.specialCircumstances,
          serviceDate: code.serviceDate,
          serviceEndDate: code.serviceEndDate,
        })),
      });

      // Set selected codes
      setSelectedCodes(service.serviceCodes.map((code) => code.billingCode));

      // Set selected ICD code
      if (service.icdCode) {
        setSelectedIcdCode({
          id: parseInt(service.icdCode.code),
          version: "10",
          code: service.icdCode.code,
          description: service.icdCode.description,
        });
      }

      // Set selected referring physician
      if (service.referringPhysician) {
        setSelectedReferringPhysician({
          id: parseInt(service.referringPhysician.code),
          code: service.referringPhysician.code,
          name: service.referringPhysician.name,
          location: "",
          specialty: "",
        });
      }

      // Set patient search query with selected patient
      if (service.patient) {
        setPatientSearchQuery(
          `${service.patient.firstName} ${service.patient.lastName} (#${service.patient.billingNumber})`
        );
      }
    }
  }, [service]);

  // Debounce referring physician search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedReferringPhysicianQuery(referringPhysicianSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [referringPhysicianSearchQuery]);

  // Search referring physicians with debounced query
  useEffect(() => {
    const searchReferringPhysicians = async () => {
      if (
        !debouncedReferringPhysicianQuery.trim() ||
        debouncedReferringPhysicianQuery.length < 2
      ) {
        setReferringPhysicianSearchResults([]);
        return;
      }

      setIsSearchingReferringPhysician(true);
      try {
        const results = await referringPhysiciansAPI.search(
          debouncedReferringPhysicianQuery
        );
        setReferringPhysicianSearchResults(results);
      } catch (error) {
        console.error("Error searching referring physicians:", error);
        Alert.alert("Error", "Failed to search referring physicians");
      } finally {
        setIsSearchingReferringPhysician(false);
      }
    };

    searchReferringPhysicians();
  }, [debouncedReferringPhysicianQuery]);

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: (data: ServiceFormData) => servicesAPI.update(serviceId, data),
    onSuccess: () => {
      Alert.alert("Success", "Service updated successfully!");
      navigation.goBack();
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["service", serviceId] });
    },
    onError: (error) => {
      console.error("Error updating service:", error);
      Alert.alert("Error", "Failed to update service");
    },
  });

  const handleAddCode = (code: BillingCode) => {
    if (selectedCodes.some((c) => c.id === code.id)) {
      Alert.alert("Error", "This code is already added");
      return;
    }

    setSelectedCodes([...selectedCodes, code]);
    setFormData((prev) => ({
      ...prev,
      billingCodes: [
        ...prev.billingCodes,
        {
          codeId: code.id,
          status: "PENDING",
          billing_record_type: code.billing_record_type,
          serviceStartTime: null,
          serviceEndTime: null,
          numberOfUnits: null,
          bilateralIndicator: null,
          specialCircumstances: null,
          serviceDate: null,
          serviceEndDate: null,
        },
      ],
    }));
  };

  const handleRemoveCode = (codeId: number) => {
    setSelectedCodes(selectedCodes.filter((c) => c.id !== codeId));
    setFormData((prev) => ({
      ...prev,
      billingCodes: prev.billingCodes.filter((c) => c.codeId !== codeId),
    }));
  };

  const handleSelectIcdCode = (icdCode: ICDCode) => {
    setSelectedIcdCode(icdCode);
    setFormData((prev) => ({ ...prev, icdCodeId: icdCode.id }));
  };

  const handleRemoveIcdCode = () => {
    setSelectedIcdCode(null);
    setFormData((prev) => ({ ...prev, icdCodeId: null }));
  };

  const handleSelectReferringPhysician = (physician: ReferringPhysician) => {
    setSelectedReferringPhysician(physician);
    setFormData((prev) => ({ ...prev, referringPhysicianId: physician.id }));
    setReferringPhysicianSearchQuery("");
    setReferringPhysicianSearchResults([]);
  };

  const handleRemoveReferringPhysician = () => {
    setSelectedReferringPhysician(null);
    setFormData((prev) => ({ ...prev, referringPhysicianId: null }));
  };

  const handleSelectPatient = (patient: any) => {
    setFormData((prev) => ({ ...prev, patientId: patient.id }));
    setPatientSearchQuery(
      `${patient.firstName} ${patient.lastName} (#${patient.billingNumber})`
    );
    setShowPatientDropdown(false);
  };

  const validateForm = () => {
    if (!formData.physicianId) {
      Alert.alert("Error", "Please select a physician");
      return false;
    }
    if (!formData.patientId) {
      Alert.alert("Error", "Please select a patient");
      return false;
    }
    if (formData.billingCodes.length === 0) {
      Alert.alert("Error", "Please add at least one billing code");
      return false;
    }
    if (!formData.serviceDate) {
      Alert.alert("Error", "Please select a service date");
      return false;
    }
    if (!formData.serviceLocation) {
      Alert.alert("Error", "Please select a service location");
      return false;
    }
    if (!formData.locationOfService) {
      Alert.alert("Error", "Please select a location of service");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    updateServiceMutation.mutate(formData);
  };

  if (serviceLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading service...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Physician Selection - Only show if more than one physician */}
        {physicians && physicians.length > 1 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Physician</Text>
              {physiciansLoading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <View style={styles.pickerContainer}>
                  {physicians?.map((physician) => (
                    <TouchableOpacity
                      key={physician.id}
                      style={[
                        styles.pickerOption,
                        formData.physicianId === physician.id &&
                          styles.selectedOption,
                      ]}
                      onPress={() =>
                        setFormData((prev) => ({
                          ...prev,
                          physicianId: physician.id,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.physicianId === physician.id &&
                            styles.selectedOptionText,
                        ]}
                      >
                        {physician.firstName} {physician.lastName} (
                        {physician.billingNumber})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Patient Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Patient</Text>
            <View style={styles.dropdownContainer}>
              <TextInput
                style={styles.input}
                placeholder="Search patients by name or billing number..."
                value={patientSearchQuery}
                onChangeText={(text) => {
                  setPatientSearchQuery(text);
                  setShowPatientDropdown(true);
                }}
                onFocus={() => setShowPatientDropdown(true)}
              />
              {showPatientDropdown && (
                <View style={styles.dropdown}>
                  {patientsLoading ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    filteredPatients.map((patient) => (
                      <TouchableOpacity
                        key={patient.id}
                        style={styles.dropdownOption}
                        onPress={() => handleSelectPatient(patient)}
                      >
                        <Text style={styles.dropdownOptionText}>
                          {patient.firstName} {patient.lastName} (#
                          {patient.billingNumber})
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>
          </Card.Content>
        </Card>

        {/* Service Date */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Service Date</Text>
            <TextInput
              style={styles.input}
              placeholder="Service Date (YYYY-MM-DD)"
              value={formData.serviceDate}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, serviceDate: text }))
              }
            />
          </Card.Content>
        </Card>

        {/* Service Location */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Service Location *</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  formData.serviceLocation === "R" &&
                    styles.selectedLocationButton,
                ]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    serviceLocation:
                      formData.serviceLocation === "R" ? null : "R",
                  }))
                }
              >
                <Text
                  style={[
                    styles.locationButtonText,
                    formData.serviceLocation === "R" &&
                      styles.selectedLocationButtonText,
                  ]}
                >
                  Regina
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  formData.serviceLocation === "S" &&
                    styles.selectedLocationButton,
                ]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    serviceLocation:
                      formData.serviceLocation === "S" ? null : "S",
                  }))
                }
              >
                <Text
                  style={[
                    styles.locationButtonText,
                    formData.serviceLocation === "S" &&
                      styles.selectedLocationButtonText,
                  ]}
                >
                  Saskatoon
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  formData.serviceLocation === "X" &&
                    styles.selectedLocationButton,
                ]}
                onPress={() =>
                  setFormData((prev) => ({
                    ...prev,
                    serviceLocation:
                      formData.serviceLocation === "X" ? null : "X",
                  }))
                }
              >
                <Text
                  style={[
                    styles.locationButtonText,
                    formData.serviceLocation === "X" &&
                      styles.selectedLocationButtonText,
                  ]}
                >
                  Rural/Northern
                </Text>
              </TouchableOpacity>
            </View>
            {!formData.serviceLocation && (
              <Text style={styles.errorText}>
                Please select a service location
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* Location of Service */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Location of Service *</Text>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.input, styles.dropdownInput]}
                onPress={() => setShowLocationDropdown(!showLocationDropdown)}
              >
                <Text
                  style={
                    formData.locationOfService
                      ? styles.dropdownText
                      : styles.placeholderText
                  }
                >
                  {formData.locationOfService
                    ? getLocationOfServiceText(formData.locationOfService)
                    : "Select location of service"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
              {showLocationDropdown && (
                <View style={styles.dropdown}>
                  {locationOfServiceOptions.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={styles.dropdownOption}
                      onPress={() => {
                        setFormData((prev) => ({
                          ...prev,
                          locationOfService: option.value,
                        }));
                        setShowLocationDropdown(false);
                      }}
                    >
                      <Text style={styles.dropdownOptionText}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            {!formData.locationOfService && (
              <Text style={styles.errorText}>
                Please select a location of service
              </Text>
            )}
          </Card.Content>
        </Card>

        {/* ICD Code */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>ICD Code (Optional)</Text>
            {selectedIcdCode ? (
              <View style={styles.selectedItem}>
                <Text style={styles.selectedItemText}>
                  {selectedIcdCode.code} - {selectedIcdCode.description}
                </Text>
                <TouchableOpacity onPress={handleRemoveIcdCode}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addCodeButton}
                onPress={() =>
                  navigation.navigate("ICDCodeSearch", {
                    onSelect: handleSelectIcdCode,
                  })
                }
              >
                <Ionicons name="add" size={20} color="#2563eb" />
                <Text style={styles.addCodeButtonText}>Add ICD Code</Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>

        {/* Referring Physician */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              Referring Physician (Optional)
            </Text>
            {selectedReferringPhysician ? (
              <View style={styles.selectedItem}>
                <View style={styles.selectedItemContent}>
                  <Text style={styles.selectedItemText}>
                    {selectedReferringPhysician.name} -{" "}
                    {selectedReferringPhysician.specialty} (
                    {selectedReferringPhysician.code})
                  </Text>
                  <Text style={styles.selectedItemSubtext}>
                    {selectedReferringPhysician.location}
                  </Text>
                </View>
                <TouchableOpacity onPress={handleRemoveReferringPhysician}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Search referring physicians..."
                  value={referringPhysicianSearchQuery}
                  onChangeText={setReferringPhysicianSearchQuery}
                />
                {isSearchingReferringPhysician && (
                  <ActivityIndicator size="small" color="#2563eb" />
                )}
                {referringPhysicianSearchResults.map((physician) => (
                  <TouchableOpacity
                    key={physician.id}
                    style={styles.searchResult}
                    onPress={() => handleSelectReferringPhysician(physician)}
                  >
                    <Text style={styles.searchResultText}>
                      {physician.name} - {physician.specialty} ({physician.code}
                      )
                    </Text>
                    <Text style={styles.searchResultSubtext}>
                      {physician.location}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Health Institution - Commented out */}
        {/* <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              Health Institution (Optional)
            </Text>
            {healthInstitutionsLoading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <View style={styles.pickerContainer}>
                <TouchableOpacity
                  style={[
                    styles.pickerOption,
                    formData.healthInstitutionId === null &&
                      styles.selectedOption,
                  ]}
                  onPress={() =>
                    setFormData((prev) => ({
                      ...prev,
                      healthInstitutionId: null,
                    }))
                  }
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      formData.healthInstitutionId === null &&
                        styles.selectedOptionText,
                    ]}
                  >
                    None
                  </Text>
                </TouchableOpacity>
                {healthInstitutions?.map((institution) => (
                  <TouchableOpacity
                    key={institution.id}
                    style={[
                      styles.pickerOption,
                      formData.healthInstitutionId === institution.id &&
                        styles.selectedOption,
                    ]}
                    onPress={() =>
                      setFormData((prev) => ({
                        ...prev,
                        healthInstitutionId: institution.id,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        formData.healthInstitutionId === institution.id &&
                          styles.selectedOptionText,
                      ]}
                    >
                      {institution.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Card.Content>
        </Card> */}

        {/* Summary - Removed */}

        {/* Billing Codes */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Billing Codes</Text>
            {selectedCodes.map((code) => (
              <View key={code.id} style={styles.selectedCode}>
                <View style={styles.codeInfo}>
                  <Chip mode="flat" style={styles.codeChip}>
                    {code.code}
                  </Chip>
                  <Text style={styles.codeTitle}>{code.title}</Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveCode(code.id)}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addCodeButton}
              onPress={() =>
                navigation.navigate("BillingCodeSearch", {
                  onSelect: handleAddCode,
                })
              }
            >
              <Ionicons name="add" size={20} color="#2563eb" />
              <Text style={styles.addCodeButtonText}>Add Billing Code</Text>
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={updateServiceMutation.isPending}
          style={styles.submitButton}
          disabled={updateServiceMutation.isPending}
        >
          Update Service
        </Button>
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  content: {
    flex: 1,
    padding: 16,
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
  card: {
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  pickerContainer: {
    marginTop: 8,
  },
  pickerOption: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: "#ffffff",
  },
  selectedOption: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  pickerOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  selectedOptionText: {
    color: "#1e40af",
    fontWeight: "600",
  },
  dropdownContainer: {
    position: "relative",
    marginTop: 8,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    maxHeight: 200,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  dropdownOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  searchResult: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: "#ffffff",
  },
  searchResultText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  searchResultSubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  selectedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  selectedItemContent: {
    flex: 1,
  },
  selectedItemText: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "500",
  },
  selectedItemSubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  selectedCode: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  codeInfo: {
    flex: 1,
  },
  codeChip: {
    backgroundColor: "#dbeafe",
    marginBottom: 4,
  },
  codeTitle: {
    fontSize: 14,
    color: "#374151",
  },
  addCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 2,
    borderColor: "#2563eb",
    borderStyle: "dashed",
    borderRadius: 8,
    marginTop: 8,
  },
  addCodeButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "500",
  },
  submitButton: {
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: "#2563eb",
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  locationButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  selectedLocationButton: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  locationButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedLocationButtonText: {
    color: "#1e40af",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 14,
    color: "#ef4444",
    marginTop: 4,
  },
  dropdownText: {
    fontSize: 16,
    color: "#374151",
  },
  placeholderText: {
    fontSize: 16,
    color: "#9ca3af",
  },
  dropdownInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});

export default EditServiceScreen;
