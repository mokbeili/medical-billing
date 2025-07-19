import { Ionicons } from "@expo/vector-icons";
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

const NewServiceScreen = ({ navigation }: any) => {
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
  const [icdSearchQuery, setIcdSearchQuery] = useState("");
  const [icdSearchResults, setIcdSearchResults] = useState<ICDCode[]>([]);
  const [isSearchingIcd, setIsSearchingIcd] = useState(false);
  const [selectedIcdCode, setSelectedIcdCode] = useState<ICDCode | null>(null);
  const [referringPhysicianSearchQuery, setReferringPhysicianSearchQuery] =
    useState("");
  const [referringPhysicianSearchResults, setReferringPhysicianSearchResults] =
    useState<ReferringPhysician[]>([]);
  const [isSearchingReferringPhysician, setIsSearchingReferringPhysician] =
    useState(false);
  const [selectedReferringPhysician, setSelectedReferringPhysician] =
    useState<ReferringPhysician | null>(null);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    billingNumber: "",
    dateOfBirth: "",
    sex: "",
  });

  // Fetch data
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

  // Set default physician if only one exists
  useEffect(() => {
    if (physicians && physicians.length === 1) {
      setFormData((prev) => ({ ...prev, physicianId: physicians[0].id }));
    }
  }, [physicians]);

  // Search ICD codes
  const searchIcdCodes = async () => {
    if (!icdSearchQuery.trim()) {
      setIcdSearchResults([]);
      return;
    }

    setIsSearchingIcd(true);
    try {
      const results = await icdCodesAPI.search(icdSearchQuery);
      setIcdSearchResults(results);
    } catch (error) {
      console.error("Error searching ICD codes:", error);
      Alert.alert("Error", "Failed to search ICD codes");
    } finally {
      setIsSearchingIcd(false);
    }
  };

  // Search referring physicians
  const searchReferringPhysicians = async () => {
    if (!referringPhysicianSearchQuery.trim()) {
      setReferringPhysicianSearchResults([]);
      return;
    }

    setIsSearchingReferringPhysician(true);
    try {
      const results = await referringPhysiciansAPI.search(
        referringPhysicianSearchQuery
      );
      setReferringPhysicianSearchResults(results);
    } catch (error) {
      console.error("Error searching referring physicians:", error);
      Alert.alert("Error", "Failed to search referring physicians");
    } finally {
      setIsSearchingReferringPhysician(false);
    }
  };

  // Create patient mutation
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
    setIcdSearchQuery("");
    setIcdSearchResults([]);
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
    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    createServiceMutation.mutate(formData);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Physician Selection */}
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

        {/* Patient Selection */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Patient</Text>
              <TouchableOpacity
                onPress={() => setIsCreatingPatient(!isCreatingPatient)}
              >
                <Ionicons name="add-circle" size={24} color="#2563eb" />
              </TouchableOpacity>
            </View>

            {isCreatingPatient ? (
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
              <View style={styles.pickerContainer}>
                {patientsLoading ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  patients?.map((patient) => (
                    <TouchableOpacity
                      key={patient.id}
                      style={[
                        styles.pickerOption,
                        formData.patientId === patient.id &&
                          styles.selectedOption,
                      ]}
                      onPress={() =>
                        setFormData((prev) => ({
                          ...prev,
                          patientId: patient.id,
                        }))
                      }
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          formData.patientId === patient.id &&
                            styles.selectedOptionText,
                        ]}
                      >
                        {patient.firstName} {patient.lastName} (#
                        {patient.billingNumber})
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
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
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Search ICD codes..."
                  value={icdSearchQuery}
                  onChangeText={setIcdSearchQuery}
                  onSubmitEditing={searchIcdCodes}
                />
                {isSearchingIcd && (
                  <ActivityIndicator size="small" color="#2563eb" />
                )}
                {icdSearchResults.map((code) => (
                  <TouchableOpacity
                    key={code.id}
                    style={styles.searchResult}
                    onPress={() => handleSelectIcdCode(code)}
                  >
                    <Text style={styles.searchResultText}>
                      {code.code} - {code.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
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
                <Text style={styles.selectedItemText}>
                  {selectedReferringPhysician.name} (
                  {selectedReferringPhysician.code})
                </Text>
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
                  onSubmitEditing={searchReferringPhysicians}
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
                      {physician.name} ({physician.code})
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </Card.Content>
        </Card>

        {/* Health Institution */}
        <Card style={styles.card}>
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
        </Card>

        {/* Summary */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Summary</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Service summary..."
              value={formData.summary}
              onChangeText={(text) =>
                setFormData((prev) => ({ ...prev, summary: text }))
              }
              multiline
              numberOfLines={3}
            />
          </Card.Content>
        </Card>

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
          loading={createServiceMutation.isPending}
          style={styles.submitButton}
          disabled={createServiceMutation.isPending}
        >
          Create Service
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
  selectedItemText: {
    fontSize: 14,
    color: "#1e40af",
    flex: 1,
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
});

export default NewServiceScreen;
