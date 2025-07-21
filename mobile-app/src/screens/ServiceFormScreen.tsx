import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  Alert,
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
import {
  healthInstitutionsAPI,
  icdCodesAPI,
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

const ServiceFormScreen = ({ navigation }: any) => {
  const route = useRoute();
  const params = route.params as { serviceId?: string } | undefined;
  const serviceId = params?.serviceId;
  const queryClient = useQueryClient();
  const isEditing = !!serviceId;

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
  const [showReferringPhysicianModal, setShowReferringPhysicianModal] =
    useState(false);
  const [showIcdCodeModal, setShowIcdCodeModal] = useState(false);
  const [icdCodeSearchQuery, setIcdCodeSearchQuery] = useState("");
  const [icdCodeSearchResults, setIcdCodeSearchResults] = useState<ICDCode[]>(
    []
  );
  const [isSearchingIcdCode, setIsSearchingIcdCode] = useState(false);
  const [debouncedIcdCodeQuery, setDebouncedIcdCodeQuery] = useState("");
  const [
    debouncedReferringPhysicianQuery,
    setDebouncedReferringPhysicianQuery,
  ] = useState("");
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    billingNumber: "",
    dateOfBirth: "",
    sex: "",
  });

  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

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

  // Location dropdown state
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [filteredLocationOptions, setFilteredLocationOptions] = useState(
    locationOfServiceOptions
  );

  // Helper function to get location of service text
  const getLocationOfServiceText = (value: string) => {
    const option = locationOfServiceOptions.find((opt) => opt.value === value);
    return option ? option.label : value;
  };

  // Helper function to get service location from physician city
  const getServiceLocationFromCity = (city: string): string | null => {
    const cityLower = city.toLowerCase();
    if (cityLower === "saskatoon") {
      return "S";
    } else if (cityLower === "regina") {
      return "R";
    } else {
      return "X"; // Rural/Northern for all other cities
    }
  };

  // Fetch service data (only when editing)
  const { data: service, isLoading: serviceLoading } = useQuery({
    queryKey: ["service", serviceId],
    queryFn: () => servicesAPI.getById(serviceId!),
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

  // Set default physician if only one exists (only for new services)
  useEffect(() => {
    if (!isEditing && physicians && physicians.length === 1) {
      const physician = physicians[0];
      let newServiceLocation = formData.serviceLocation;

      // Pre-select service location based on physician's city if not already set
      if (!formData.serviceLocation && physician.healthInstitution?.city) {
        newServiceLocation = getServiceLocationFromCity(
          physician.healthInstitution.city
        );
      }

      setFormData((prev) => ({
        ...prev,
        physicianId: physician.id,
        serviceLocation: newServiceLocation,
      }));
    }
  }, [physicians, isEditing]);

  // Set service location based on selected physician's city (for new services)
  useEffect(() => {
    if (!isEditing && formData.physicianId && physicians) {
      const selectedPhysician = physicians.find(
        (p) => p.id === formData.physicianId
      );
      if (
        selectedPhysician &&
        selectedPhysician.healthInstitution?.city &&
        !formData.serviceLocation
      ) {
        const newServiceLocation = getServiceLocationFromCity(
          selectedPhysician.healthInstitution.city
        );
        setFormData((prev) => ({
          ...prev,
          serviceLocation: newServiceLocation,
        }));
      }
    }
  }, [formData.physicianId, physicians, isEditing, formData.serviceLocation]);

  // Debug patients data
  useEffect(() => {
    console.log("Patients data changed:", {
      patients: patients?.length || 0,
      loading: patientsLoading,
      data: patients,
    });
  }, [patients, patientsLoading]);

  // Filter location options based on search query
  useEffect(() => {
    if (locationSearchQuery.trim() === "") {
      setFilteredLocationOptions(locationOfServiceOptions);
    } else {
      const filtered = locationOfServiceOptions.filter((option) =>
        option.label.toLowerCase().includes(locationSearchQuery.toLowerCase())
      );
      setFilteredLocationOptions(filtered);
    }
  }, [locationSearchQuery]);

  // Filter patients based on search query
  useEffect(() => {
    if (patients) {
      console.log("Filtering patients:", {
        patients: patients.length,
        query: patientSearchQuery,
      });
      const filtered = patients.filter((patient) => {
        const searchLower = patientSearchQuery.toLowerCase();
        // If search query is empty, show all patients
        if (!searchLower.trim()) {
          return true;
        }
        return (
          patient.firstName.toLowerCase().includes(searchLower) ||
          patient.lastName.toLowerCase().includes(searchLower) ||
          patient.billingNumber.toLowerCase().includes(searchLower)
        );
      });
      console.log("Filtered patients:", filtered.length);
      setFilteredPatients(filtered);
    }
  }, [patients, patientSearchQuery]);

  // Load existing service data (only when editing)
  useEffect(() => {
    if (isEditing && service) {
      setFormData({
        physicianId: service.physician.id,
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
  }, [service, isEditing]);

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

  // Debounce ICD code search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedIcdCodeQuery(icdCodeSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [icdCodeSearchQuery]);

  // Search ICD codes with debounced query
  useEffect(() => {
    const searchIcdCodes = async () => {
      if (!debouncedIcdCodeQuery.trim() || debouncedIcdCodeQuery.length < 2) {
        setIcdCodeSearchResults([]);
        return;
      }

      setIsSearchingIcdCode(true);
      try {
        const results = await icdCodesAPI.search(debouncedIcdCodeQuery);
        setIcdCodeSearchResults(results);
      } catch (error) {
        console.error("Error searching ICD codes:", error);
        Alert.alert("Error", "Failed to search ICD codes");
      } finally {
        setIsSearchingIcdCode(false);
      }
    };

    searchIcdCodes();
  }, [debouncedIcdCodeQuery]);

  // Create patient mutation (only for new services)
  const createPatientMutation = useMutation({
    mutationFn: patientsAPI.create,
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
      // Refresh patients list
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      // Set the new patient as selected
      setFormData((prev) => ({ ...prev, patientId: newPatient.id }));
    },
    onError: (error) => {
      console.error("Error creating patient:", error);
      Alert.alert("Error", "Failed to create patient");
    },
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: servicesAPI.create,
    onSuccess: () => {
      Alert.alert("Success", "Service created successfully!");
      navigation.goBack();
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (error) => {
      console.error("Error creating service:", error);
      Alert.alert("Error", "Failed to create service");
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: (data: ServiceFormData) => servicesAPI.update(serviceId!, data),
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

  const handleCreatePatient = () => {
    if (
      !newPatient.firstName ||
      !newPatient.lastName ||
      !newPatient.billingNumber ||
      !newPatient.dateOfBirth ||
      !newPatient.sex
    ) {
      Alert.alert("Error", "Please fill in all patient fields");
      return;
    }

    createPatientMutation.mutate(newPatient);
  };

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
          numberOfUnits: 1, // Default to 1 unit
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
  };

  const handleRemoveReferringPhysician = () => {
    setSelectedReferringPhysician(null);
    setFormData((prev) => ({ ...prev, referringPhysicianId: null }));
  };

  const handleCloseLocationModal = () => {
    setShowLocationDropdown(false);
    setLocationSearchQuery(""); // Clear search when modal is closed
  };

  const handleClosePatientModal = () => {
    setShowPatientDropdown(false);
    // Don't clear patientSearchQuery here as it shows the selected patient
  };

  const handleCloseReferringPhysicianModal = () => {
    setShowReferringPhysicianModal(false);
    setReferringPhysicianSearchQuery(""); // Clear search when modal is closed
  };

  const handleCloseIcdCodeModal = () => {
    setShowIcdCodeModal(false);
    setIcdCodeSearchQuery(""); // Clear search when modal is closed
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

    // Ensure all billing codes have required fields
    const validatedFormData = {
      ...formData,
      billingCodes: formData.billingCodes.map((code) => ({
        ...code,
        numberOfUnits: code.numberOfUnits || 1, // Ensure numberOfUnits is set
      })),
    };

    if (isEditing) {
      updateServiceMutation.mutate(validatedFormData);
    } else {
      createServiceMutation.mutate(validatedFormData);
    }
  };

  // Show loading state when editing and service is loading
  if (isEditing && serviceLoading) {
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
        <Text style={styles.headerTitle}>
          {isEditing ? "Edit Service" : "New Service"}
        </Text>
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Patient</Text>
              {!isEditing && (
                <TouchableOpacity
                  onPress={() => setIsCreatingPatient(!isCreatingPatient)}
                >
                  <Ionicons name="add-circle" size={24} color="#2563eb" />
                </TouchableOpacity>
              )}
            </View>

            {!isEditing && isCreatingPatient ? (
              <View style={styles.newPatientForm}>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  value={newPatient.firstName}
                  onChangeText={(text) =>
                    setNewPatient((prev) => ({ ...prev, firstName: text }))
                  }
                />
                <TextInput
                  style={styles.input}
                  placeholder="Last Name"
                  value={newPatient.lastName}
                  onChangeText={(text) =>
                    setNewPatient((prev) => ({ ...prev, lastName: text }))
                  }
                />
                <TextInput
                  style={styles.input}
                  placeholder="Billing Number"
                  value={newPatient.billingNumber}
                  onChangeText={(text) =>
                    setNewPatient((prev) => ({ ...prev, billingNumber: text }))
                  }
                />
                <TextInput
                  style={styles.input}
                  placeholder="Date of Birth (YYYY-MM-DD)"
                  value={newPatient.dateOfBirth}
                  onChangeText={(text) =>
                    setNewPatient((prev) => ({ ...prev, dateOfBirth: text }))
                  }
                />
                <TextInput
                  style={styles.input}
                  placeholder="Sex (M/F)"
                  value={newPatient.sex}
                  onChangeText={(text) =>
                    setNewPatient((prev) => ({ ...prev, sex: text }))
                  }
                />
                <Button
                  mode="contained"
                  onPress={handleCreatePatient}
                  loading={createPatientMutation.isPending}
                  style={styles.createPatientButton}
                >
                  Create Patient
                </Button>
              </View>
            ) : (
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
                            <Text style={styles.debugText}>
                              Patients: {patients?.length || 0}, Filtered:{" "}
                              {filteredPatients.length}, Query: "
                              {patientSearchQuery}"
                            </Text>
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
                                No patients found. Try a different search term.
                              </Text>
                            )}
                          </>
                        )}
                      </ScrollView>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
              </View>
            )}
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
              <Modal
                visible={showLocationDropdown}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseLocationModal}
              >
                <TouchableOpacity
                  style={styles.modalOverlay}
                  activeOpacity={1}
                  onPress={handleCloseLocationModal}
                >
                  <TouchableOpacity
                    style={styles.modalContent}
                    activeOpacity={1}
                    onPress={() => {}} // Prevent closing when tapping inside modal
                  >
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>
                        Select Location of Service
                      </Text>
                      <TouchableOpacity onPress={handleCloseLocationModal}>
                        <Ionicons name="close" size={24} color="#6b7280" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Search locations..."
                      value={locationSearchQuery}
                      onChangeText={setLocationSearchQuery}
                      autoFocus={true}
                    />
                    <ScrollView style={styles.modalScrollView}>
                      <Text style={styles.debugText}>
                        Location options: {filteredLocationOptions.length} of{" "}
                        {locationOfServiceOptions.length}
                      </Text>
                      {filteredLocationOptions.length > 0 ? (
                        filteredLocationOptions.map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            style={styles.modalOption}
                            onPress={() => {
                              setFormData((prev) => ({
                                ...prev,
                                locationOfService: option.value,
                              }));
                              handleCloseLocationModal();
                            }}
                          >
                            <Text style={styles.modalOptionText}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <Text style={styles.noResultsText}>
                          No location options available.
                        </Text>
                      )}
                    </ScrollView>
                  </TouchableOpacity>
                </TouchableOpacity>
              </Modal>
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
            <Text style={styles.sectionTitle}>ICD Code</Text>
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
                onPress={() => setShowIcdCodeModal(true)}
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
              <TouchableOpacity
                style={styles.addCodeButton}
                onPress={() => setShowReferringPhysicianModal(true)}
              >
                <Ionicons name="add" size={20} color="#2563eb" />
                <Text style={styles.addCodeButtonText}>
                  Add Referring Physician
                </Text>
              </TouchableOpacity>
            )}
          </Card.Content>
        </Card>

        {/* Referring Physician Modal */}
        <Modal
          visible={showReferringPhysicianModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseReferringPhysicianModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCloseReferringPhysicianModal}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping inside modal
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Select Referring Physician
                </Text>
                <TouchableOpacity onPress={handleCloseReferringPhysicianModal}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search referring physicians..."
                value={referringPhysicianSearchQuery}
                onChangeText={setReferringPhysicianSearchQuery}
                autoFocus={true}
              />
              <ScrollView style={styles.modalScrollView}>
                {isSearchingReferringPhysician ? (
                  <ActivityIndicator
                    size="small"
                    color="#2563eb"
                    style={styles.modalLoading}
                  />
                ) : (
                  <>
                    <Text style={styles.debugText}>
                      Results: {referringPhysicianSearchResults.length}
                    </Text>
                    {referringPhysicianSearchResults.length > 0 ? (
                      referringPhysicianSearchResults.map((physician) => (
                        <TouchableOpacity
                          key={physician.id}
                          style={styles.modalOption}
                          onPress={() => {
                            handleSelectReferringPhysician(physician);
                            handleCloseReferringPhysicianModal();
                          }}
                        >
                          <Text style={styles.modalOptionText}>
                            {physician.name} - {physician.specialty} (
                            {physician.code})
                          </Text>
                          <Text style={styles.modalOptionSubtext}>
                            {physician.location}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.noResultsText}>
                        {referringPhysicianSearchQuery.trim()
                          ? "No referring physicians found. Try a different search term."
                          : "Start typing to search for referring physicians."}
                      </Text>
                    )}
                  </>
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* ICD Code Modal */}
        <Modal
          visible={showIcdCodeModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseIcdCodeModal}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={handleCloseIcdCodeModal}
          >
            <TouchableOpacity
              style={styles.modalContent}
              activeOpacity={1}
              onPress={() => {}} // Prevent closing when tapping inside modal
            >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select ICD Code</Text>
                <TouchableOpacity onPress={handleCloseIcdCodeModal}>
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search ICD codes..."
                value={icdCodeSearchQuery}
                onChangeText={setIcdCodeSearchQuery}
                autoFocus={true}
              />
              <ScrollView style={styles.modalScrollView}>
                {isSearchingIcdCode ? (
                  <ActivityIndicator
                    size="small"
                    color="#2563eb"
                    style={styles.modalLoading}
                  />
                ) : (
                  <>
                    <Text style={styles.debugText}>
                      Results: {icdCodeSearchResults.length}
                    </Text>
                    {icdCodeSearchResults.length > 0 ? (
                      icdCodeSearchResults.map((icdCode) => (
                        <TouchableOpacity
                          key={icdCode.id}
                          style={styles.modalOption}
                          onPress={() => {
                            handleSelectIcdCode(icdCode);
                            handleCloseIcdCodeModal();
                          }}
                        >
                          <Text style={styles.modalOptionText}>
                            {icdCode.code} - {icdCode.description}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.noResultsText}>
                        {icdCodeSearchQuery.trim()
                          ? "No ICD codes found. Try a different search term."
                          : "Start typing to search for ICD codes."}
                      </Text>
                    )}
                  </>
                )}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

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
          loading={
            createServiceMutation.isPending || updateServiceMutation.isPending
          }
          style={styles.submitButton}
          disabled={
            createServiceMutation.isPending || updateServiceMutation.isPending
          }
        >
          {isEditing ? "Update Service" : "Create Service"}
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
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    marginTop: 8,
  },
  newPatientForm: {
    marginTop: 8,
  },
  createPatientButton: {
    marginTop: 12,
    backgroundColor: "#059669",
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    justifyContent: "flex-start",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
  },
  modalSearchInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f3f4f6",
    marginBottom: 15,
  },
  modalScrollView: {
    width: "100%",
    flex: 1,
    minHeight: 200,
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  modalLoading: {
    marginTop: 10,
  },
  debugText: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 10,
    textAlign: "center",
  },
  noResultsText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    marginTop: 20,
    fontStyle: "italic",
  },
});

export default ServiceFormScreen;
