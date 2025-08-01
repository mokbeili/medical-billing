import { Ionicons } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
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

interface ScannedPatientData {
  billingNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  serviceDate?: string;
}

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
    serviceStatus: "OPEN",
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

  // Add state for discharge date modal
  const [showDischargeDateModal, setShowDischargeDateModal] = useState(false);
  const [dischargeDate, setDischargeDate] = useState("");
  const [pendingApproveAndFinish, setPendingApproveAndFinish] = useState(false);

  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // New patient form state
  const [newPatientErrors, setNewPatientErrors] = useState({
    billingNumber: false,
    dateOfBirth: false,
    sex: false,
    billingNumberCheckDigit: false,
  });
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

  // Service date picker state
  const [showServiceDatePicker, setShowServiceDatePicker] = useState(false);
  const [selectedServiceCalendarDate, setSelectedServiceCalendarDate] =
    useState<Date | null>(null);
  const [currentServiceCalendarMonth, setCurrentServiceCalendarMonth] =
    useState(new Date());
  const [showServiceYearPicker, setShowServiceYearPicker] = useState(false);
  const [serviceDatePickerStep, setServiceDatePickerStep] = useState<
    "decade" | "year" | "month" | "day"
  >("decade");
  const [selectedServiceDecade, setSelectedServiceDecade] = useState<number>(0);
  const [selectedServiceYear, setSelectedServiceYear] = useState<number>(0);
  const [selectedServiceMonth, setSelectedServiceMonth] = useState<number>(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Billing number validation function (from web form)
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
    return String(remainder) === value[8];
  };

  // Validate new patient form data
  const isNewPatientFormValid = () => {
    // Check if all required fields are filled
    if (!newPatient.firstName?.trim() || !newPatient.lastName?.trim()) {
      return false;
    }

    if (
      !newPatient.billingNumber ||
      !newPatient.dateOfBirth ||
      !newPatient.sex
    ) {
      return false;
    }

    // Validate billing number format and check digit
    if (
      newPatient.billingNumber.length !== 9 ||
      !/^\d{9}$/.test(newPatient.billingNumber)
    ) {
      return false;
    }

    if (!checkDigit(newPatient.billingNumber)) {
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

  // Keyboard event listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      "keyboardDidShow",
      () => {
        setKeyboardVisible(true);
        // Scroll to ensure the Create Patient button is visible
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      "keyboardDidHide",
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

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
        serviceStatus: service.status,
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
          fee_determinant: code.billingCode.fee_determinant,
          multiple_unit_indicator: code.billingCode.multiple_unit_indicator,
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

  // Handle scanned patient data from camera
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      const params = route.params as
        | { scannedPatientData?: ScannedPatientData }
        | undefined;
      if (params?.scannedPatientData && !isEditing) {
        const scannedData = params.scannedPatientData;

        // Check if patient already exists
        if (patients) {
          const existingPatient = patients.find(
            (patient) => patient.billingNumber === scannedData.billingNumber
          );

          if (existingPatient) {
            // Patient exists, select them
            setFormData((prev) => ({ ...prev, patientId: existingPatient.id }));
            setPatientSearchQuery(
              `${existingPatient.firstName} ${existingPatient.lastName} (#${existingPatient.billingNumber})`
            );
            Alert.alert(
              "Patient Found",
              `Patient ${existingPatient.firstName} ${existingPatient.lastName} already exists and has been selected.`
            );
          } else {
            // Patient doesn't exist, populate new patient form
            setNewPatient({
              firstName: scannedData.firstName,
              lastName: scannedData.lastName,
              billingNumber: scannedData.billingNumber,
              dateOfBirth: scannedData.dateOfBirth,
              sex: scannedData.gender,
            });
            setIsCreatingPatient(true);
            Alert.alert(
              "New Patient",
              `Patient ${scannedData.firstName} ${scannedData.lastName} not found. New patient form has been populated with scanned data.`
            );
          }
        }

        // Set service date if available
        if (scannedData.serviceDate) {
          setFormData((prev) => ({
            ...prev,
            serviceDate: scannedData.serviceDate!,
          }));
        }

        // Clear the params to prevent re-processing
        navigation.setParams({ scannedPatientData: undefined });
      }
    });

    return unsubscribe;
  }, [navigation, route.params, patients, isEditing]);

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
      // Update patient search query to show the selected patient
      setPatientSearchQuery(
        `${newPatient.firstName} ${newPatient.lastName} (#${newPatient.billingNumber})`
      );
    },
    onError: (error) => {
      console.error("Error creating patient:", error);
      Alert.alert("Error", "Failed to create patient");
    },
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: servicesAPI.create,
    onSuccess: (data) => {
      const status =
        data.status === "PENDING" ? "approved and finished" : "saved";
      Alert.alert("Success", `Service ${status} successfully!`);
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
    onSuccess: (data) => {
      const status =
        data.status === "PENDING" ? "approved and finished" : "saved";
      Alert.alert("Success", `Service ${status} successfully!`);
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
    // Reset errors
    setNewPatientErrors({
      billingNumber: false,
      dateOfBirth: false,
      sex: false,
      billingNumberCheckDigit: false,
    });

    // Validate required fields
    const errors = {
      billingNumber: !newPatient.billingNumber,
      dateOfBirth: !newPatient.dateOfBirth,
      sex: !newPatient.sex,
      billingNumberCheckDigit: false,
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
        Alert.alert(
          "Error",
          "A patient with this billing number already exists"
        );
        return;
      }
    }

    // Check if any errors exist
    if (errors.billingNumber || errors.dateOfBirth || errors.sex) {
      Alert.alert("Error", "Please fill in all required patient fields");
      setNewPatientErrors(errors);
      return;
    }

    // Add physicianId to the patient data
    const patientDataWithPhysician = {
      ...newPatient,
      physicianId: formData.physicianId,
    };

    createPatientMutation.mutate(patientDataWithPhysician);
  };

  const handleAddCodes = (codes: BillingCode[], subSelections?: any[]) => {
    // Filter out codes that are already selected
    const newCodes = codes.filter(
      (code) => !selectedCodes.some((c) => c.id === code.id)
    );

    if (newCodes.length === 0) {
      Alert.alert("Info", "All selected codes are already added");
      return;
    }

    setSelectedCodes([...selectedCodes, ...newCodes]);
    setFormData((prev) => {
      const updatedBillingCodes = [...prev.billingCodes];

      // Process each new code
      newCodes.forEach((code) => {
        const subSelection = subSelections?.find((s) => s.codeId === code.id);

        // Calculate service start date for type 57 codes
        let serviceStartDate =
          subSelection?.serviceDate || formData.serviceDate;
        let serviceEndDate = subSelection?.serviceEndDate || null;

        if (code.billing_record_type === 57) {
          // Check if this code has previous codes defined and if any of them are already selected
          if (code.previousCodes && code.previousCodes.length > 0) {
            // Find if any of the previous codes are already in the form
            const selectedPreviousCodes = updatedBillingCodes.filter(
              (selectedCode) =>
                code.previousCodes?.some(
                  (prevCode) =>
                    prevCode.previous_code.id === selectedCode.codeId
                )
            );

            if (selectedPreviousCodes.length > 0) {
              // Find the most recent previous code and calculate dates
              const previousCode =
                selectedPreviousCodes[selectedPreviousCodes.length - 1];
              const previousCodeIndex = updatedBillingCodes.findIndex(
                (bc) => bc.codeId === previousCode.codeId
              );
              const previousSelectedCode = selectedCodes.find(
                (c) => c.id === previousCode.codeId
              );

              if (previousCodeIndex >= 0 && previousSelectedCode) {
                const previousStartDate = new Date(
                  updatedBillingCodes[previousCodeIndex].serviceDate ||
                    formData.serviceDate
                );

                // Set the previous code's end date as previous start date + day range - 1
                if (
                  previousSelectedCode.day_range &&
                  previousSelectedCode.day_range > 0
                ) {
                  const previousEndDate = new Date(previousStartDate);
                  previousEndDate.setDate(
                    previousEndDate.getDate() +
                      previousSelectedCode.day_range -
                      1
                  );

                  // Update the previous code's end date
                  updatedBillingCodes[previousCodeIndex] = {
                    ...updatedBillingCodes[previousCodeIndex],
                    serviceEndDate: previousEndDate.toISOString().split("T")[0],
                  };
                }

                // Set the new code's start date to previous start date + day range
                if (
                  previousSelectedCode.day_range &&
                  previousSelectedCode.day_range > 0
                ) {
                  const newStartDate = new Date(previousStartDate);
                  newStartDate.setDate(
                    newStartDate.getDate() + previousSelectedCode.day_range
                  );
                  serviceStartDate = newStartDate.toISOString().split("T")[0];
                } else {
                  // If previous code has no day range, start the next day
                  const newStartDate = new Date(previousStartDate);
                  newStartDate.setDate(newStartDate.getDate() + 1);
                  serviceStartDate = newStartDate.toISOString().split("T")[0];
                }
              }
            }
            // If no previous codes are selected, keep the default service start date
          }
          // For type 57 codes, do not set an end date initially
          serviceEndDate = null;
        } else {
          // For non-type 57 codes, calculate service end date based on day range
          if (code.day_range && code.day_range > 0) {
            const startDate = new Date(serviceStartDate);
            startDate.setDate(startDate.getDate() + code.day_range - 1); // -1 because it's inclusive
            serviceEndDate = startDate.toISOString().split("T")[0];
          }
        }

        // Add the new code to the billing codes
        updatedBillingCodes.push({
          codeId: code.id,
          status: "PENDING",
          billing_record_type: code.billing_record_type,
          serviceStartTime: subSelection?.serviceStartTime || null,
          serviceEndTime: subSelection?.serviceEndTime || null,
          numberOfUnits: subSelection?.numberOfUnits || 1,
          bilateralIndicator: subSelection?.bilateralIndicator || null,
          specialCircumstances: subSelection?.specialCircumstances || null,
          serviceDate: serviceStartDate,
          serviceEndDate: serviceEndDate,
          fee_determinant: code.fee_determinant,
          multiple_unit_indicator: code.multiple_unit_indicator,
        });
      });

      return {
        ...prev,
        billingCodes: updatedBillingCodes,
      };
    });
  };

  const handleRemoveCode = (codeId: number) => {
    setSelectedCodes(selectedCodes.filter((c) => c.id !== codeId));
    setFormData((prev) => ({
      ...prev,
      billingCodes: prev.billingCodes.filter((c) => c.codeId !== codeId),
    }));

    // Check if we still need a referring physician after removing this code
    const remainingCodes = selectedCodes.filter((c) => c.id !== codeId);
    const stillRequiresReferringPhysician = remainingCodes.some(
      (code) => code.referring_practitioner_required === "Y"
    );

    // If no longer required, clear the referring physician
    if (!stillRequiresReferringPhysician && selectedReferringPhysician) {
      handleRemoveReferringPhysician();
    }
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

  // Check if any selected billing codes require a referring practitioner
  const requiresReferringPhysician = selectedCodes.some(
    (code) => code.referring_practitioner_required === "Y"
  );

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

  const handleOpenDatePicker = () => {
    // Initialize step-by-step picker
    if (newPatient.dateOfBirth) {
      const [year, month, day] = newPatient.dateOfBirth.split("-");
      const existingDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );
      setSelectedCalendarDate(existingDate);
      setCurrentCalendarMonth(existingDate);

      // Set the step values based on existing date
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      setSelectedDecade(Math.floor(yearNum / 10) * 10);
      setSelectedYear(yearNum);
      setSelectedMonth(monthNum);
      setDatePickerStep("day"); // Start at day selection since we have a date
    } else {
      const today = new Date();
      setSelectedCalendarDate(today);
      setCurrentCalendarMonth(today);

      // Set default values
      const currentYear = today.getFullYear();
      setSelectedDecade(Math.floor(currentYear / 10) * 10);
      setSelectedYear(currentYear);
      setSelectedMonth(today.getMonth() + 1);
      setDatePickerStep("decade"); // Start at decade selection for new dates
    }
    setShowDatePicker(true);
  };

  const handleOpenServiceDatePicker = () => {
    // Initialize simple calendar picker for service date
    if (formData.serviceDate) {
      const [year, month, day] = formData.serviceDate.split("-");
      const existingDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      );
      setSelectedServiceCalendarDate(existingDate);
      setCurrentServiceCalendarMonth(existingDate);
    } else {
      const today = new Date();
      setSelectedServiceCalendarDate(today);
      setCurrentServiceCalendarMonth(today);
    }
    setShowServiceDatePicker(true);
  };

  const handleCalendarConfirm = () => {
    if (selectedCalendarDate) {
      const formattedDate = formatDate(selectedCalendarDate);

      // Check if this is for discharge date
      if (showDischargeDateModal) {
        setDischargeDate(formattedDate);
        setShowDatePicker(false);
        return;
      }

      // Default behavior for new patient date of birth
      setNewPatient((prev) => ({ ...prev, dateOfBirth: formattedDate }));
      if (newPatientErrors.dateOfBirth) {
        setNewPatientErrors((prev) => ({ ...prev, dateOfBirth: false }));
      }
    }
    setShowDatePicker(false);
  };

  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDayOfMonth = getFirstDayOfMonth(date);
    const days = [];
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(date.getFullYear(), date.getMonth(), i);

      // Check if this day is in the future
      const isFutureDay =
        date.getFullYear() > currentYear ||
        (date.getFullYear() === currentYear &&
          date.getMonth() + 1 > currentMonth) ||
        (date.getFullYear() === currentYear &&
          date.getMonth() + 1 === currentMonth &&
          i > currentDay);

      days.push({ date: dayDate, isFuture: isFutureDay });
    }

    return days;
  };

  const generateServiceCalendarDays = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDayOfMonth = getFirstDayOfMonth(date);
    const days = [];
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }

    // Add days of the month - for service dates, only allow dates within 6 months and up to today
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(date.getFullYear(), date.getMonth(), i);

      // Check if this day is too old (more than 6 months ago) or in the future
      const isTooOld = dayDate < sixMonthsAgo;
      const isFuture = dayDate > today;

      days.push({ date: dayDate, isFuture, isTooOld }); // Track if date is too old or future
    }

    return days;
  };

  const generateServiceCalendarMonths = () => {
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    const months = [];
    let currentDate = new Date(sixMonthsAgo);

    // Generate all months from 6 months ago to current month (not future months)
    while (currentDate <= today) {
      months.push(new Date(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Reverse the array so current month appears first
    return months.reverse();
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return formatDate(date1) === formatDate(date2);
  };

  const handleCalendarDateSelect = (date: Date) => {
    setSelectedCalendarDate(date);
  };

  const handleServiceCalendarDateSelect = (date: Date) => {
    setSelectedServiceCalendarDate(date);
  };

  const handleServiceCalendarConfirm = () => {
    if (selectedServiceCalendarDate) {
      const formattedDate = formatDate(selectedServiceCalendarDate);
      setFormData((prev) => ({ ...prev, serviceDate: formattedDate }));
    }
    setShowServiceDatePicker(false);
  };

  const handlePreviousMonth = () => {
    setCurrentCalendarMonth(
      new Date(
        currentCalendarMonth.getFullYear(),
        currentCalendarMonth.getMonth() - 1,
        1
      )
    );
  };

  const handleNextMonth = () => {
    setCurrentCalendarMonth(
      new Date(
        currentCalendarMonth.getFullYear(),
        currentCalendarMonth.getMonth() + 1,
        1
      )
    );
  };

  const handlePreviousYear = () => {
    setCurrentCalendarMonth(
      new Date(
        currentCalendarMonth.getFullYear() - 1,
        currentCalendarMonth.getMonth(),
        1
      )
    );
  };

  const handleNextYear = () => {
    setCurrentCalendarMonth(
      new Date(
        currentCalendarMonth.getFullYear() + 1,
        currentCalendarMonth.getMonth(),
        1
      )
    );
  };

  // Service date calendar navigation functions
  const handleServicePreviousMonth = () => {
    setCurrentServiceCalendarMonth(
      new Date(
        currentServiceCalendarMonth.getFullYear(),
        currentServiceCalendarMonth.getMonth() - 1,
        1
      )
    );
  };

  const handleServiceNextMonth = () => {
    setCurrentServiceCalendarMonth(
      new Date(
        currentServiceCalendarMonth.getFullYear(),
        currentServiceCalendarMonth.getMonth() + 1,
        1
      )
    );
  };

  const handleServicePreviousYear = () => {
    setCurrentServiceCalendarMonth(
      new Date(
        currentServiceCalendarMonth.getFullYear() - 1,
        currentServiceCalendarMonth.getMonth(),
        1
      )
    );
  };

  const handleServiceNextYear = () => {
    setCurrentServiceCalendarMonth(
      new Date(
        currentServiceCalendarMonth.getFullYear() + 1,
        currentServiceCalendarMonth.getMonth(),
        1
      )
    );
  };

  const handleYearSelect = () => {
    // Show year picker modal
    setShowYearPicker(true);
  };

  // Step-by-step date picker functions
  const handleDecadeSelect = (decade: number) => {
    setSelectedDecade(decade);
    setDatePickerStep("year");
  };

  const handleYearSelectStep = (year: number) => {
    setSelectedYear(year);
    setDatePickerStep("month");
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    setDatePickerStep("day");
    // Set the calendar to the selected year/month
    setCurrentCalendarMonth(new Date(selectedYear, month - 1, 1));
  };

  const handleDaySelect = (day: number) => {
    const selectedDate = new Date(selectedYear, selectedMonth - 1, day);
    setSelectedCalendarDate(selectedDate);
    setDatePickerStep("day");
  };

  const handleBackToDecade = () => {
    setDatePickerStep("decade");
  };

  const handleBackToYear = () => {
    setDatePickerStep("year");
  };

  const handleBackToMonth = () => {
    setDatePickerStep("month");
  };

  // Service date step-by-step picker functions
  const handleServiceDecadeSelect = (decade: number) => {
    setSelectedServiceDecade(decade);
    setServiceDatePickerStep("year");
  };

  const handleServiceYearSelectStep = (year: number) => {
    setSelectedServiceYear(year);
    setServiceDatePickerStep("month");
  };

  const handleServiceMonthSelect = (month: number) => {
    setSelectedServiceMonth(month);
    setServiceDatePickerStep("day");
    // Set the calendar to the selected year/month
    setCurrentServiceCalendarMonth(new Date(selectedServiceYear, month - 1, 1));
  };

  const handleServiceDaySelect = (day: number) => {
    const selectedDate = new Date(
      selectedServiceYear,
      selectedServiceMonth - 1,
      day
    );
    setSelectedServiceCalendarDate(selectedDate);
    setServiceDatePickerStep("day");
  };

  const handleServiceBackToDecade = () => {
    setServiceDatePickerStep("decade");
  };

  const handleServiceBackToYear = () => {
    setServiceDatePickerStep("year");
  };

  const handleServiceBackToMonth = () => {
    setServiceDatePickerStep("month");
  };

  const generateDecades = () => {
    const currentYear = new Date().getFullYear();
    const decades = [];
    // Start with the current decade (e.g., 2020s for 2024)
    const currentDecade = Math.floor(currentYear / 10) * 10;
    for (let i = 0; i < 12; i++) {
      const decadeStart = currentDecade - i * 10;
      decades.push(decadeStart);
    }
    return decades;
  };

  const generateServiceDecades = () => {
    const currentYear = new Date().getFullYear();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoYear = sixMonthsAgo.getFullYear();

    const decades = [];
    // Start with the current decade
    const currentDecade = Math.floor(currentYear / 10) * 10;
    const sixMonthsAgoDecade = Math.floor(sixMonthsAgoYear / 10) * 10;

    // Only show decades that contain years within the 6-month range
    for (let i = 0; i < 12; i++) {
      const decadeStart = currentDecade - i * 10;
      const decadeEnd = decadeStart + 9;

      // Only include decade if it overlaps with our valid range
      if (decadeEnd >= sixMonthsAgoYear && decadeStart <= currentYear) {
        decades.push(decadeStart);
      }
    }
    return decades;
  };

  const generateYearsInDecade = (decade: number) => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = 0; i < 10; i++) {
      const year = decade + i;
      if (year <= currentYear) {
        years.push(year);
      }
    }
    return years;
  };

  const generateServiceYearsInDecade = (decade: number) => {
    const currentYear = new Date().getFullYear();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoYear = sixMonthsAgo.getFullYear();

    const years = [];
    for (let i = 0; i < 10; i++) {
      const year = decade + i;
      if (year >= sixMonthsAgoYear && year <= currentYear) {
        years.push(year);
      }
    }
    return years;
  };

  const generateMonths = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // getMonth() returns 0-11

    const allMonths = [
      { value: 1, label: "January" },
      { value: 2, label: "February" },
      { value: 3, label: "March" },
      { value: 4, label: "April" },
      { value: 5, label: "May" },
      { value: 6, label: "June" },
      { value: 7, label: "July" },
      { value: 8, label: "August" },
      { value: 9, label: "September" },
      { value: 10, label: "October" },
      { value: 11, label: "November" },
      { value: 12, label: "December" },
    ];

    // If selected year is current year, only show months up to current month
    if (selectedYear === currentYear) {
      return allMonths.filter((month) => month.value <= currentMonth);
    }

    return allMonths;
  };

  const generateServiceMonths = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // getMonth() returns 0-11
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sixMonthsAgoYear = sixMonthsAgo.getFullYear();
    const sixMonthsAgoMonth = sixMonthsAgo.getMonth() + 1;

    const allMonths = [
      { value: 1, label: "January" },
      { value: 2, label: "February" },
      { value: 3, label: "March" },
      { value: 4, label: "April" },
      { value: 5, label: "May" },
      { value: 6, label: "June" },
      { value: 7, label: "July" },
      { value: 8, label: "August" },
      { value: 9, label: "September" },
      { value: 10, label: "October" },
      { value: 11, label: "November" },
      { value: 12, label: "December" },
    ];

    // Filter months based on 6-month restriction
    return allMonths.filter((month) => {
      // If selected year is current year, show all months
      if (selectedServiceYear === currentYear) {
        return true;
      }
      // If selected year is 6 months ago year, only show months from 6 months ago onwards
      if (selectedServiceYear === sixMonthsAgoYear) {
        return month.value >= sixMonthsAgoMonth;
      }
      // If selected year is between 6 months ago and current year, show all months
      if (
        selectedServiceYear > sixMonthsAgoYear &&
        selectedServiceYear < currentYear
      ) {
        return true;
      }
      // Don't show months for years before 6 months ago
      return false;
    });
  };

  const handleSelectPatient = (patient: any) => {
    setFormData((prev) => ({ ...prev, patientId: patient.id }));
    setPatientSearchQuery(
      `${patient.firstName} ${patient.lastName} (#${patient.billingNumber})`
    );
    setShowPatientDropdown(false);
  };

  const handleTextInputFocus = () => {
    // Scroll to ensure the Create Patient button is visible when focusing on text inputs
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 300);
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
    if (requiresReferringPhysician && !formData.referringPhysicianId) {
      Alert.alert(
        "Error",
        "Please select a referring physician (required for selected billing codes)"
      );
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

  const handleSave = () => {
    if (!validateForm()) return;

    // Ensure all billing codes have required fields
    const validatedFormData = {
      ...formData,
      serviceStatus: "OPEN",
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

  const handleApproveAndFinish = () => {
    if (!validateForm()) return;

    // Check if there are type 57 codes that need discharge date
    const type57Codes = formData.billingCodes.filter((code) => {
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      return selectedCode && selectedCode.billing_record_type === 57;
    });

    // Find the last type 57 code (the one with no next codes present)
    const lastType57Code = type57Codes.find((code) => {
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      if (!selectedCode) return false;

      // Check if this code has any next codes that are also selected
      const hasNextCodes = formData.billingCodes.some((nextCode) => {
        const nextSelectedCode = selectedCodes.find(
          (c) => c.id === nextCode.codeId
        );
        return (
          nextSelectedCode &&
          nextSelectedCode.previousCodes?.some(
            (prevCode) => prevCode.previous_code.id === selectedCode.id
          )
        );
      });

      return !hasNextCodes;
    });

    if (lastType57Code && !lastType57Code.serviceEndDate) {
      // Prompt for discharge date
      setShowDischargeDateModal(true);
      setPendingApproveAndFinish(true);
      return;
    }

    // Proceed with normal approve and finish
    performApproveAndFinish();
  };

  const handleConfirmDischargeDate = () => {
    if (!dischargeDate) return;

    // Find the last type 57 code and set its end date
    const type57Codes = formData.billingCodes.filter((code) => {
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      return selectedCode && selectedCode.billing_record_type === 57;
    });

    const lastType57Code = type57Codes.find((code) => {
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      if (!selectedCode) return false;

      const hasNextCodes = formData.billingCodes.some((nextCode) => {
        const nextSelectedCode = selectedCodes.find(
          (c) => c.id === nextCode.codeId
        );
        return (
          nextSelectedCode &&
          nextSelectedCode.previousCodes?.some(
            (prevCode) => prevCode.previous_code.id === selectedCode.id
          )
        );
      });

      return !hasNextCodes;
    });

    if (lastType57Code) {
      setFormData((prev) => ({
        ...prev,
        billingCodes: prev.billingCodes.map((code) => {
          if (code.codeId === lastType57Code.codeId) {
            return {
              ...code,
              serviceEndDate: dischargeDate,
            };
          }
          return code;
        }),
      }));
    }

    setShowDischargeDateModal(false);
    setDischargeDate("");
    setPendingApproveAndFinish(false);

    // Now proceed with approve and finish
    performApproveAndFinish();
  };

  const performApproveAndFinish = () => {
    // Ensure all billing codes have required fields
    const validatedFormData = {
      ...formData,
      serviceStatus: "PENDING",
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

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        enabled={true}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={Keyboard.dismiss}
          contentContainerStyle={[
            styles.scrollContentContainer,
            { marginBottom: keyboardVisible ? 50 : 0 },
          ]}
          showsVerticalScrollIndicator={true}
        >
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

          {/* Service Date */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Service / Admit Date</Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate("CameraScan")}
                  style={styles.headerButton}
                >
                  <Ionicons name="camera" size={20} color="#2563eb" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.input, styles.dateInput]}
                onPress={handleOpenServiceDatePicker}
              >
                <Text
                  style={
                    formData.serviceDate
                      ? styles.dateInputText
                      : styles.placeholderText
                  }
                >
                  {formData.serviceDate || "Select Service Date"}
                </Text>
                <Ionicons name="calendar" size={20} color="#6b7280" />
              </TouchableOpacity>
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
                  <TouchableOpacity
                    onPress={handleCloseReferringPhysicianModal}
                  >
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
                onPress={() => {}} // Prevent closing when tapping inside modal
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Date of Birth</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <View style={styles.stepPickerContainer}>
                  {/* Step Header */}
                  <View style={styles.stepHeader}>
                    {datePickerStep !== "decade" && (
                      <TouchableOpacity onPress={handleBackToDecade}>
                        <Ionicons name="arrow-back" size={20} color="#6b7280" />
                      </TouchableOpacity>
                    )}
                    <Text style={styles.stepTitle}>
                      {datePickerStep === "decade" && "Select Decade"}
                      {datePickerStep === "year" &&
                        `Select Year (${selectedDecade}s)`}
                      {datePickerStep === "month" &&
                        `Select Month (${selectedYear})`}
                      {datePickerStep === "day" &&
                        `Select Day (${
                          generateMonths().find(
                            (m) => m.value === selectedMonth
                          )?.label
                        } ${selectedYear})`}
                    </Text>
                    {datePickerStep !== "decade" && (
                      <View style={{ width: 20 }} />
                    )}
                  </View>

                  {/* Decade Selection */}
                  {datePickerStep === "decade" && (
                    <ScrollView style={styles.stepScrollView}>
                      {generateDecades().map((decade) => (
                        <TouchableOpacity
                          key={decade}
                          style={styles.stepOption}
                          onPress={() => handleDecadeSelect(decade)}
                        >
                          <Text style={styles.stepOptionText}>
                            {decade}s ({decade} - {decade + 9})
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Year Selection */}
                  {datePickerStep === "year" && (
                    <ScrollView style={styles.stepScrollView}>
                      {generateYearsInDecade(selectedDecade).map((year) => (
                        <TouchableOpacity
                          key={year}
                          style={[
                            styles.stepOption,
                            selectedYear === year && styles.selectedStepOption,
                          ]}
                          onPress={() => handleYearSelectStep(year)}
                        >
                          <Text
                            style={[
                              styles.stepOptionText,
                              selectedYear === year &&
                                styles.selectedStepOptionText,
                            ]}
                          >
                            {year}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Month Selection */}
                  {datePickerStep === "month" && (
                    <ScrollView style={styles.stepScrollView}>
                      {generateMonths().map((month) => (
                        <TouchableOpacity
                          key={month.value}
                          style={[
                            styles.stepOption,
                            selectedMonth === month.value &&
                              styles.selectedStepOption,
                          ]}
                          onPress={() => handleMonthSelect(month.value)}
                        >
                          <Text
                            style={[
                              styles.stepOptionText,
                              selectedMonth === month.value &&
                                styles.selectedStepOptionText,
                            ]}
                          >
                            {month.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  )}

                  {/* Day Selection */}
                  {datePickerStep === "day" && (
                    <View>
                      {/* Calendar Days Header */}
                      <View style={styles.calendarDaysHeader}>
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                          (day) => (
                            <Text key={day} style={styles.calendarDayHeader}>
                              {day}
                            </Text>
                          )
                        )}
                      </View>

                      {/* Calendar Grid */}
                      <View style={styles.calendarGrid}>
                        {generateCalendarDays(currentCalendarMonth).map(
                          (dayData, index) => (
                            <TouchableOpacity
                              key={index}
                              style={[
                                styles.calendarDay,
                                dayData &&
                                  selectedCalendarDate &&
                                  isSameDate(
                                    dayData.date,
                                    selectedCalendarDate
                                  ) &&
                                  styles.selectedCalendarDay,
                                !dayData && styles.emptyCalendarDay,
                                dayData?.isFuture && styles.futureCalendarDay,
                              ]}
                              onPress={() =>
                                dayData &&
                                !dayData.isFuture &&
                                handleCalendarDateSelect(dayData.date)
                              }
                              disabled={!dayData || dayData.isFuture}
                            >
                              {dayData && (
                                <Text
                                  style={[
                                    styles.calendarDayText,
                                    selectedCalendarDate &&
                                      isSameDate(
                                        dayData.date,
                                        selectedCalendarDate
                                      ) &&
                                      styles.selectedCalendarDayText,
                                    dayData.isFuture &&
                                      styles.futureCalendarDayText,
                                  ]}
                                >
                                  {dayData.date.getDate()}
                                </Text>
                              )}
                            </TouchableOpacity>
                          )
                        )}
                      </View>

                      {/* Selected Date Display */}
                      {selectedCalendarDate && (
                        <View style={styles.selectedDateContainer}>
                          <Text style={styles.selectedDateText}>
                            Selected:{" "}
                            {selectedCalendarDate.toLocaleDateString()}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.modalButtonContainer}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowDatePicker(false)}
                    style={styles.modalButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleCalendarConfirm}
                    style={styles.modalButton}
                    disabled={!selectedCalendarDate}
                  >
                    Confirm
                  </Button>
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          {/* Year Picker Modal */}
          <Modal
            visible={showYearPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowYearPicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowYearPicker(false)}
            >
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={() => {}} // Prevent closing when tapping inside modal
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Year</Text>
                  <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.yearPickerScrollView}>
                  {Array.from({ length: 120 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.yearPickerOption,
                          currentCalendarMonth.getFullYear() === year &&
                            styles.selectedYearPickerOption,
                        ]}
                        onPress={() => {
                          setCurrentCalendarMonth(
                            new Date(year, currentCalendarMonth.getMonth(), 1)
                          );
                          setShowYearPicker(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.yearPickerOptionText,
                            currentCalendarMonth.getFullYear() === year &&
                              styles.selectedYearPickerOptionText,
                          ]}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </TouchableOpacity>
            </TouchableOpacity>
          </Modal>

          {/* Service Date Picker Modal */}
          <Modal
            visible={showServiceDatePicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowServiceDatePicker(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setShowServiceDatePicker(false)}
            >
              <TouchableOpacity
                style={styles.modalContent}
                activeOpacity={1}
                onPress={() => {}} // Prevent closing when tapping inside modal
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Service Date</Text>
                  <TouchableOpacity
                    onPress={() => setShowServiceDatePicker(false)}
                  >
                    <Ionicons name="close" size={24} color="#6b7280" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.serviceCalendarScrollView}>
                  {generateServiceCalendarMonths().map(
                    (monthDate, monthIndex) => (
                      <View
                        key={monthIndex}
                        style={styles.serviceMonthContainer}
                      >
                        <Text style={styles.serviceMonthTitle}>
                          {monthDate.toLocaleDateString("en-US", {
                            month: "long",
                            year: "numeric",
                          })}
                        </Text>

                        {/* Calendar Days Header */}
                        <View style={styles.calendarDaysHeader}>
                          {[
                            "Sun",
                            "Mon",
                            "Tue",
                            "Wed",
                            "Thu",
                            "Fri",
                            "Sat",
                          ].map((day) => (
                            <Text key={day} style={styles.calendarDayHeader}>
                              {day}
                            </Text>
                          ))}
                        </View>

                        {/* Calendar Grid */}
                        <View style={styles.calendarGrid}>
                          {generateServiceCalendarDays(monthDate).map(
                            (dayData, index) => (
                              <TouchableOpacity
                                key={index}
                                style={[
                                  styles.calendarDay,
                                  dayData &&
                                    selectedServiceCalendarDate &&
                                    isSameDate(
                                      dayData.date,
                                      selectedServiceCalendarDate
                                    ) &&
                                    styles.selectedCalendarDay,
                                  !dayData && styles.emptyCalendarDay,
                                  dayData?.isTooOld && styles.tooOldCalendarDay,
                                  dayData?.isFuture && styles.futureCalendarDay,
                                ]}
                                onPress={() =>
                                  dayData &&
                                  !dayData.isTooOld &&
                                  !dayData.isFuture &&
                                  handleServiceCalendarDateSelect(dayData.date)
                                }
                                disabled={
                                  !dayData ||
                                  dayData.isTooOld ||
                                  dayData.isFuture
                                }
                              >
                                {dayData && (
                                  <Text
                                    style={[
                                      styles.calendarDayText,
                                      selectedServiceCalendarDate &&
                                        isSameDate(
                                          dayData.date,
                                          selectedServiceCalendarDate
                                        ) &&
                                        styles.selectedCalendarDayText,
                                      dayData.isTooOld &&
                                        styles.tooOldCalendarDayText,
                                      dayData.isFuture &&
                                        styles.futureCalendarDayText,
                                    ]}
                                  >
                                    {dayData.date.getDate()}
                                  </Text>
                                )}
                              </TouchableOpacity>
                            )
                          )}
                        </View>
                      </View>
                    )
                  )}
                </ScrollView>

                {/* Selected Date Display */}
                {selectedServiceCalendarDate && (
                  <View style={styles.selectedDateContainer}>
                    <Text style={styles.selectedDateText}>
                      Selected:{" "}
                      {selectedServiceCalendarDate.toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <View style={styles.modalButtonContainer}>
                  <Button
                    mode="outlined"
                    onPress={() => setShowServiceDatePicker(false)}
                    style={styles.modalButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleServiceCalendarConfirm}
                    style={styles.modalButton}
                    disabled={!selectedServiceCalendarDate}
                  >
                    Confirm
                  </Button>
                </View>
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
                    onSelect: handleAddCodes,
                    existingCodes: selectedCodes,
                    serviceDate: formData.serviceDate,
                  })
                }
              >
                <Ionicons name="add" size={20} color="#2563eb" />
                <Text style={styles.addCodeButtonText}>Add Billing Code</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>

          {requiresReferringPhysician && (
            <Card style={styles.card}>
              <Card.Content>
                <Text style={styles.sectionTitle}>
                  Referring Physician (Required)
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
          )}

          {/* Patient Selection */}
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Patient</Text>
                {!isEditing && (
                  <View style={styles.headerButtons}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("CameraScan")}
                      style={styles.headerButton}
                    >
                      <Ionicons name="camera" size={20} color="#2563eb" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setIsCreatingPatient(!isCreatingPatient)}
                      style={styles.headerButton}
                    >
                      <Ionicons
                        name={isCreatingPatient ? "close-circle" : "add-circle"}
                        size={24}
                        color="#2563eb"
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {!isEditing && isCreatingPatient ? (
                <View style={styles.newPatientForm}>
                  <TextInput
                    style={styles.input}
                    placeholder="First Name *"
                    value={newPatient.firstName}
                    onChangeText={(text) =>
                      setNewPatient((prev) => ({ ...prev, firstName: text }))
                    }
                    onFocus={handleTextInputFocus}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Last Name *"
                    value={newPatient.lastName}
                    onChangeText={(text) =>
                      setNewPatient((prev) => ({ ...prev, lastName: text }))
                    }
                    onFocus={handleTextInputFocus}
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
                    placeholder="Billing Number (9 digits) *"
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
                      // Clear error when user starts typing
                      if (newPatientErrors.billingNumber) {
                        setNewPatientErrors((prev) => ({
                          ...prev,
                          billingNumber: false,
                        }));
                      }
                    }}
                    keyboardType="numeric"
                    onFocus={handleTextInputFocus}
                  />
                  {newPatientErrors.billingNumber && (
                    <Text style={styles.errorText}>
                      Billing number is required
                    </Text>
                  )}
                  {newPatientErrors.billingNumberCheckDigit && (
                    <Text style={styles.errorText}>
                      Invalid billing number check digit
                    </Text>
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
                    onFocus={() => {
                      setShowPatientDropdown(true);
                      handleTextInputFocus();
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
                </View>
              )}
            </Card.Content>
          </Card>

          {/* Submit Buttons */}
          <View style={styles.submitButtonsContainer}>
            <Button
              mode="outlined"
              onPress={handleSave}
              loading={
                createServiceMutation.isPending ||
                updateServiceMutation.isPending
              }
              style={[styles.submitButton, styles.saveButton]}
              disabled={
                createServiceMutation.isPending ||
                updateServiceMutation.isPending
              }
            >
              Save
            </Button>
            <Button
              mode="contained"
              onPress={handleApproveAndFinish}
              loading={
                createServiceMutation.isPending ||
                updateServiceMutation.isPending
              }
              style={[styles.submitButton, styles.approveButton]}
              disabled={
                createServiceMutation.isPending ||
                updateServiceMutation.isPending
              }
            >
              Approve & Finish
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Discharge Date Modal */}
      <Modal
        visible={showDischargeDateModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDischargeDateModal(false);
          setDischargeDate("");
          setPendingApproveAndFinish(false);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDischargeDateModal(false);
            setDischargeDate("");
            setPendingApproveAndFinish(false);
          }}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping inside modal
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Discharge Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDischargeDateModal(false);
                  setDischargeDate("");
                  setPendingApproveAndFinish(false);
                }}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Please set the discharge date for the last type 57 code in the
              service.
            </Text>
            <TouchableOpacity
              style={styles.modalSearchInput}
              onPress={() => {
                // Use the existing date picker pattern
                setDatePickerStep("day");
                setShowDatePicker(true);
                // Store the current discharge date for restoration if needed
                if (dischargeDate) {
                  const [year, month, day] = dischargeDate
                    .split("-")
                    .map(Number);
                  setSelectedYear(year);
                  setSelectedMonth(month - 1);
                  // Set the calendar date directly
                  setSelectedCalendarDate(new Date(year, month - 1, day));
                }
              }}
            >
              <Text
                style={
                  dischargeDate ? styles.dropdownText : styles.placeholderText
                }
              >
                {dischargeDate || "Select discharge date..."}
              </Text>
            </TouchableOpacity>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowDischargeDateModal(false);
                  setDischargeDate("");
                  setPendingApproveAndFinish(false);
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonConfirm,
                  !dischargeDate && styles.modalButtonDisabled,
                ]}
                onPress={handleConfirmDischargeDate}
                disabled={!dischargeDate}
              >
                <Text style={styles.modalButtonConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20, // Minimal padding when keyboard is not visible
    flexGrow: 1, // Allow content to grow and fill available space
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
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    padding: 4,
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
  submitButtonsContainer: {
    flexDirection: "row",
    gap: 8,
  },
  submitButton: {
    flex: 1,
  },
  saveButton: {
    borderColor: "#2563eb",
    borderWidth: 2,
  },
  approveButton: {
    backgroundColor: "#059669",
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
  // New patient form styles
  newPatientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  newPatientTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
  },
  inputError: {
    borderColor: "#ef4444",
  },
  dateInput: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateInputText: {
    fontSize: 16,
    color: "#374151",
  },
  genderLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
    marginTop: 8,
  },
  dateGenderRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  dateInputContainer: {
    flex: 3,
  },
  genderContainer: {
    flex: 1,
    alignItems: "center",
  },
  genderButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
    justifyContent: "center",
  },
  genderButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  genderCircleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedGenderCircleButton: {
    borderColor: "#2563eb",
    backgroundColor: "#2563eb",
  },
  selectedGenderButton: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  genderButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedGenderButtonText: {
    color: "#1e40af",
    fontWeight: "600",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: {
    backgroundColor: "#6b7280",
  },
  modalButtonCancelText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  modalButtonConfirm: {
    backgroundColor: "#059669",
  },
  modalButtonConfirmText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  modalButtonDisabled: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
    opacity: 0.6,
  },
  stepPickerContainer: {
    marginBottom: 16,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    flex: 1,
    textAlign: "center",
  },
  stepScrollView: {
    maxHeight: 300,
  },
  stepOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  selectedStepOption: {
    backgroundColor: "#dbeafe",
  },
  stepOptionText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    textAlign: "center",
  },
  selectedStepOptionText: {
    color: "#1e40af",
    fontWeight: "600",
  },
  calendarDaysHeader: {
    flexDirection: "row",
    marginBottom: 8,
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  calendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  selectedCalendarDay: {
    backgroundColor: "#2563eb",
  },
  emptyCalendarDay: {
    backgroundColor: "#f9fafb",
  },
  calendarDayText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedCalendarDayText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  selectedDateContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#dbeafe",
    borderRadius: 8,
    alignItems: "center",
  },
  selectedDateText: {
    fontSize: 14,
    color: "#1e40af",
    fontWeight: "600",
  },
  yearPickerScrollView: {
    maxHeight: 300,
  },
  yearPickerOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#ffffff",
  },
  selectedYearPickerOption: {
    backgroundColor: "#dbeafe",
  },
  yearPickerOptionText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    textAlign: "center",
  },
  selectedYearPickerOptionText: {
    color: "#1e40af",
    fontWeight: "600",
  },
  futureCalendarDay: {
    backgroundColor: "#f3f4f6",
    opacity: 0.5,
  },
  futureCalendarDayText: {
    color: "#9ca3af",
  },
  tooOldCalendarDay: {
    backgroundColor: "#f3f4f6",
    opacity: 0.5,
  },
  tooOldCalendarDayText: {
    color: "#9ca3af",
  },
  serviceCalendarScrollView: {
    maxHeight: 400,
  },
  serviceMonthContainer: {
    marginBottom: 20,
  },
  serviceMonthTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
    textAlign: "center",
  },
  modalDescription: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 16,
    textAlign: "center",
  },
});

export default ServiceFormScreen;
