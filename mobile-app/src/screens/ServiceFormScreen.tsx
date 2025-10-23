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
import { ActivityIndicator, Button, Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import BillingCodeConfigurationModal from "../components/BillingCodeConfigurationModal";
import {
  billingCodesAPI,
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
  ServiceCode,
  ServiceFormData,
} from "../types";
import {
  convertLocalDateToTimezoneUTC,
  formatFullDate,
  formatRelativeDate,
  getTodayInTimezone,
  parseFlexibleDate,
} from "../utils/dateUtils";

// Using the imported formatDateToMonthDay function from dateUtils

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
    serviceDate: "", // Will be set when physician is selected
    serviceLocation: null,
    serviceStatus: "OPEN",
    billingCodes: [],
  });

  const [selectedCodes, setSelectedCodes] = useState<ServiceCode[]>([]);
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
  const [billingCodeView, setBillingCodeView] = useState<
    "procedures" | "rounding"
  >("procedures");
  const [expandedProcedureGroups, setExpandedProcedureGroups] = useState<
    Record<number, boolean>
  >({});
  const [expandedRoundingGroups, setExpandedRoundingGroups] = useState<
    Record<number, boolean>
  >({});
  const [editingCode, setEditingCode] = useState<ServiceCode | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    billingNumber: "",
    dateOfBirth: "",
    sex: "",
  });

  // Add state for rounding modal
  const [showRoundingModal, setShowRoundingModal] = useState(false);
  const [roundingDate, setRoundingDate] = useState("");

  // Patient search state
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Billing code suggestions modal state
  const [showBillingCodeSuggestionsModal, setShowBillingCodeSuggestionsModal] =
    useState(false);
  const [patientPreviousCodes, setPatientPreviousCodes] = useState<
    Array<{
      billingCode: BillingCode;
      lastUsedDate: string;
      lastServiceCodePayload: {
        codeId: number;
        serviceStartTime: string | null;
        serviceEndTime: string | null;
        serviceDate: string | null;
        serviceEndDate: string | null;
        bilateralIndicator: string | null;
        numberOfUnits: number | null;
        specialCircumstances: string | null;
      };
    }>
  >([]);
  const [physicianFrequentCodes, setPhysicianFrequentCodes] = useState<
    BillingCode[]
  >([]);

  // Sub-selection flow state (mirrors BillingCodeSearchScreen)
  interface CodeSubSelection {
    codeId: number;
    serviceDate: string | null;
    serviceEndDate: string | null;
    bilateralIndicator: string | null;
    serviceStartTime: string | null;
    serviceEndTime: string | null;
    numberOfUnits: number;
    specialCircumstances: string | null;
    locationOfService: string | null;
  }

  const [billingCodeSelections, setBillingCodeSelections] = useState<
    BillingCode[]
  >([]);
  const [codeSubSelections, setCodeSubSelections] = useState<
    CodeSubSelection[]
  >([]);
  const [showSubSelectionModal, setShowSubSelectionModal] = useState(false);
  const [currentCodeForSubSelection, setCurrentCodeForSubSelection] =
    useState<BillingCode | null>(null);

  // New patient form state
  const [newPatientErrors, setNewPatientErrors] = useState({
    billingNumber: false,
    dateOfBirth: false,
    sex: false,
    billingNumberCheckDigit: false,
    billingNumberDuplicate: false,
  });
  const [duplicatePatient, setDuplicatePatient] = useState<any>(null);
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
  const [hasChanges, setHasChanges] = useState(false);
  const initialFormData = useRef<ServiceFormData | null>(null);
  const initialSelectedCodes = useRef<ServiceCode[]>([]);
  const initialIcdCode = useRef<ICDCode | null>(null);
  const initialReferringPhysician = useRef<ReferringPhysician | null>(null);

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

  // Helper function to get local date in YYYY-MM-DD format
  // Can optionally use a specific timezone
  const getLocalYMD = (date: Date, timezone?: string): string => {
    if (timezone) {
      return getTodayInTimezone(timezone);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Helper function to normalize date to local YYYY-MM-DD format
  const normalizeToLocalYMD = (input: string | Date): string => {
    if (typeof input === "string") {
      if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
        return input.substring(0, 10);
      }
      const d = new Date(input);
      return getLocalYMD(d);
    }
    return getLocalYMD(input);
  };

  // Inline helpers copied from ServicesScreen to determine extra selections
  const isType57CodeInline = (code: BillingCode) =>
    code.billing_record_type === 57;
  const isWorXSectionInline = (code: BillingCode) =>
    code.section?.code === "W" || code.section?.code === "X";
  const isHSectionInline = (code: BillingCode) => code.section?.code === "H";
  const requiresExtraSelectionsInline = (code: BillingCode): boolean => {
    if (!isType57CodeInline(code)) return true; // all non-57 need date at least
    if (code.multiple_unit_indicator === "U") return true;
    if (code.start_time_required === "Y" || code.stop_time_required === "Y")
      return true;
    if (code.title?.includes("Bilateral")) return true;
    if (isWorXSectionInline(code)) return true;
    if (isHSectionInline(code)) return true;
    return false;
  };

  const getSubSelectionForCodeInline = (codeId: number) =>
    codeSubSelections.find((s) => s.codeId === codeId);

  const handleUpdateSubSelectionInline = (
    codeId: number,
    updates: Partial<CodeSubSelection>
  ) => {
    setCodeSubSelections((prev) =>
      prev.map((s) => (s.codeId === codeId ? { ...s, ...updates } : s))
    );
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
    staleTime: 0,
  });

  // Fetch other data
  const { data: physicians, isLoading: physiciansLoading } = useQuery({
    queryKey: ["physicians"],
    queryFn: physiciansAPI.getAll,
  });

  // Get the selected physician's timezone
  const physicianTimezone = React.useMemo(() => {
    if (formData.physicianId && physicians) {
      const selectedPhysician = physicians.find(
        (p: any) => p.id === formData.physicianId
      );
      return selectedPhysician?.timezone || "America/Regina";
    }
    return "America/Regina"; // Default timezone
  }, [formData.physicianId, physicians]);

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

      // Get today's date in the physician's timezone
      const todayInPhysicianTz = getTodayInTimezone(
        physician.timezone || "America/Regina"
      );

      setFormData((prev) => ({
        ...prev,
        physicianId: physician.id,
        serviceLocation: newServiceLocation,
        serviceDate: todayInPhysicianTz,
      }));
    }

    // Store initial state for new services
    if (!isEditing && physicians && !initialFormData.current) {
      initialFormData.current = formData;
      initialSelectedCodes.current = [];
      initialIcdCode.current = null;
      initialReferringPhysician.current = null;
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
        serviceStatus: service.status,
        billingCodes: service.serviceCodes.map((code) => ({
          id: code.id, // Include service code ID to preserve change logs on update
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
          locationOfService: code.locationOfService || "1",
          fee_determinant: code.billingCode.fee_determinant,
          multiple_unit_indicator: code.billingCode.multiple_unit_indicator,
        })),
      });

      // Set selected codes
      setSelectedCodes(service.serviceCodes.map((code) => code));

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

      // Store initial state for editing
      setTimeout(() => {
        initialFormData.current = {
          physicianId: service.physician.id,
          patientId: service.patient.id || "",
          referringPhysicianId: service.referringPhysician?.id || null,
          icdCodeId: service.icdCode?.id || null,
          healthInstitutionId: service.healthInstitution?.id || null,
          summary: service.serviceCodes[0]?.summary || "",
          serviceDate: new Date(service.serviceDate)
            .toISOString()
            .split("T")[0],
          serviceLocation: service.serviceCodes[0]?.serviceLocation || null,
          serviceStatus: service.status,
          billingCodes: service.serviceCodes.map((code) => ({
            id: code.id, // Include service code ID to preserve change logs on update
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
            locationOfService: code.locationOfService || "1",
            fee_determinant: code.billingCode.fee_determinant,
            multiple_unit_indicator: code.billingCode.multiple_unit_indicator,
          })),
        };
        initialSelectedCodes.current = service.serviceCodes.map((code) => code);
        initialIcdCode.current = service.icdCode
          ? {
              id: parseInt(service.icdCode.code),
              version: "10",
              code: service.icdCode.code,
              description: service.icdCode.description,
            }
          : null;
        initialReferringPhysician.current = service.referringPhysician
          ? {
              id: parseInt(service.referringPhysician.code),
              code: service.referringPhysician.code,
              name: service.referringPhysician.name,
              location: "",
              specialty: "",
            }
          : null;
      }, 100);

      // Reset hasChanges after loading initial data
      setHasChanges(false);
    }
  }, [service, isEditing]);

  // Track changes to form data
  useEffect(() => {
    // Wait for initial data to be stored
    if (!initialFormData.current) {
      return;
    }

    // Check if form data has changed
    const formDataChanged =
      JSON.stringify(formData) !== JSON.stringify(initialFormData.current);

    // Check if selected codes have changed
    const codesChanged =
      selectedCodes.length !== initialSelectedCodes.current.length ||
      JSON.stringify(selectedCodes) !==
        JSON.stringify(initialSelectedCodes.current);

    // Check if ICD code has changed
    const icdCodeChanged =
      JSON.stringify(selectedIcdCode) !==
      JSON.stringify(initialIcdCode.current);

    // Check if referring physician has changed
    const referringPhysicianChanged =
      JSON.stringify(selectedReferringPhysician) !==
      JSON.stringify(initialReferringPhysician.current);

    // Set hasChanges if any field has changed
    setHasChanges(
      formDataChanged ||
        codesChanged ||
        icdCodeChanged ||
        referringPhysicianChanged
    );
  }, [formData, selectedCodes, selectedIcdCode, selectedReferringPhysician]);

  // Handle scanned patient data from camera
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      const params = route.params as
        | { scannedPatientData?: ScannedPatientData }
        | undefined;
      if (params?.scannedPatientData && !isEditing) {
        const scannedData = params.scannedPatientData;

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
    onError: (error: any) => {
      console.error("Error creating patient:", error);
      Alert.alert("Error", "Failed to create patient");
    },
  });

  // Create service mutation
  const createServiceMutation = useMutation({
    mutationFn: servicesAPI.create,
    onSuccess: async (data) => {
      const status =
        data.status === "PENDING" ? "approved and finished" : "saved";
      Alert.alert("Success", `Claim ${status} successfully!`);
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      navigation.goBack();
    },
    onError: (error) => {
      console.error("Error creating service:", error);
      Alert.alert("Error", "Failed to create service");
    },
  });

  // Update service mutation
  const updateServiceMutation = useMutation({
    mutationFn: (data: ServiceFormData) => servicesAPI.update(serviceId!, data),
    onSuccess: async (data) => {
      const status =
        data.status === "PENDING" ? "approved and finished" : "saved";
      Alert.alert("Success", `Claim ${status} successfully!`);
      await queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["service", serviceId] });
      navigation.goBack();
    },
    onError: (error) => {
      console.error("Error updating service:", error);
      Alert.alert("Error", "Failed to update service");
    },
  });

  const handleSelectDuplicatePatient = () => {
    if (duplicatePatient) {
      setFormData((prev) => ({ ...prev, patientId: duplicatePatient.id }));
      setIsCreatingPatient(false);
      setDuplicatePatient(null);
      setNewPatientErrors({
        billingNumber: false,
        dateOfBirth: false,
        sex: false,
        billingNumberCheckDigit: false,
        billingNumberDuplicate: false,
      });
      // Update patient search query to show the selected patient
      setPatientSearchQuery(
        `${duplicatePatient.firstName} ${duplicatePatient.lastName} (#${duplicatePatient.billingNumber})`
      );
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

    // Add physicianId to the patient data
    const patientDataWithPhysician = {
      ...newPatient,
      dateOfBirth:
        parseFlexibleDate(newPatient.dateOfBirth) || newPatient.dateOfBirth,
      physicianId: formData.physicianId,
    };

    createPatientMutation.mutate(patientDataWithPhysician);
  };

  // Handler to show billing code suggestions modal
  const handleAddBillingCodeWithSuggestions = async () => {
    try {
      const today = getLocalYMD(new Date(), physicianTimezone);

      // Get IDs of codes already added to this service
      const alreadyAddedIds = new Set(
        selectedCodes.map((sc) => sc.billingCode.id)
      );

      // Build suggestions: previous patient codes (non-57) and physician frequent codes
      const previousMap = new Map<
        number,
        {
          billingCode: BillingCode;
          lastUsedDate: string;
          lastServiceCodePayload: any;
        }
      >();

      // Get previous codes from the selected codes in this form
      // Filter for non-type 57 codes
      selectedCodes.forEach((sc) => {
        const code = sc.billingCode;
        if (!code || code.billing_record_type === 57) return;
        const scDate = sc.serviceDate || formData.serviceDate;
        const dateStr = scDate ? normalizeToLocalYMD(scDate) : today;

        previousMap.set(code.id, {
          billingCode: code,
          lastUsedDate: dateStr,
          lastServiceCodePayload: {
            codeId: code.id,
            serviceStartTime: sc.serviceStartTime,
            serviceEndTime: sc.serviceEndTime,
            serviceDate: today,
            serviceEndDate: null,
            bilateralIndicator: sc.bilateralIndicator,
            numberOfUnits: sc.numberOfUnits ?? 1,
            specialCircumstances: sc.specialCircumstances,
          },
        });
      });

      const previousList = Array.from(previousMap.values())
        .filter((item) => !alreadyAddedIds.has(item.billingCode.id))
        .sort(
          (a, b) =>
            new Date(b.lastUsedDate).getTime() -
            new Date(a.lastUsedDate).getTime()
        );
      setPatientPreviousCodes(previousList);

      // Get physician frequent codes from profile
      const currentPhysician = physicians?.[0];
      const frequent = (currentPhysician?.frequentlyUsedCodes || []).map(
        (f) => ({
          id: f.billingCode.id,
          code: f.billingCode.code,
          title: f.billingCode.title,
          description: f.billingCode.description,
          section: { code: "", title: "" },
          jurisdiction: { id: 1, name: "Saskatchewan" },
          provider: { id: 1, name: "Default Provider" },
          billing_record_type: 50,
          referring_practitioner_required: null,
          fee_determinant: "",
          multiple_unit_indicator: null,
          max_units: null,
          start_time_required: null,
          stop_time_required: null,
          day_range: null,
        })
      ) as unknown as BillingCode[];

      // Filter out codes that are already in previousList or already added to service
      const previousIds = new Set(previousList.map((p) => p.billingCode.id));
      const filteredFrequent = frequent.filter(
        (c) => !previousIds.has(c.id) && !alreadyAddedIds.has(c.id)
      );
      setPhysicianFrequentCodes(filteredFrequent);

      setShowBillingCodeSuggestionsModal(true);
    } catch (e) {
      console.error("Error preparing suggestions:", e);
      Alert.alert(
        "Error",
        "Unable to load billing code suggestions. Please try again later.",
        [{ text: "OK" }]
      );
    }
  };

  const handleAddCodes = (codes: BillingCode[], subSelections?: any[]) => {
    // Filter out codes that are already selected
    const newCodes = codes.filter(
      (code) => !selectedCodes.some((c) => c.billingCode.id === code.id)
    );

    if (newCodes.length === 0) {
      Alert.alert("Info", "All selected codes are already added");
      return;
    }

    // Get the most recent billing code's locationOfService, or use default
    const mostRecentLocationOfService =
      selectedCodes.length > 0
        ? selectedCodes[selectedCodes.length - 1].locationOfService
        : null; // Must be set through modal

    // Create ServiceCode objects from BillingCode objects
    const newServiceCodes: ServiceCode[] = newCodes.map((code) => ({
      id: Date.now() + Math.random(), // Generate temporary ID
      status: "PENDING",
      specialCircumstances: null,
      bilateralIndicator: null,
      serviceStartTime: null,
      serviceEndTime: null,
      serviceDate: formData.serviceDate,
      serviceEndDate: null,
      serviceLocation: formData.serviceLocation,
      locationOfService: mostRecentLocationOfService, // Will be set through modal
      numberOfUnits: 1,
      summary: "",
      createdAt: new Date().toISOString(),
      billingCode: code,
      changeLogs: [], // Add empty changeLogs array
    }));

    // Update formData.billingCodes to match the new ServiceCode structure
    setFormData((prev) => {
      const updatedBillingCodes = [...prev.billingCodes];

      // Process each new ServiceCode
      newServiceCodes.forEach((serviceCode) => {
        const subSelection = subSelections?.find(
          (s) => s.codeId === serviceCode.billingCode.id
        );

        // Calculate service start date for type 57 codes
        let serviceStartDate =
          subSelection?.serviceDate || formData.serviceDate;
        let serviceEndDate = subSelection?.serviceEndDate || null;

        // Debug logging
        console.log("Adding code:", serviceCode.billingCode.code, {
          subSelectionDate: subSelection?.serviceDate,
          formServiceDate: formData.serviceDate,
          finalStartDate: serviceStartDate,
        });

        if (serviceCode.billingCode.billing_record_type === 57) {
          // Check if this code has previous codes defined and if any of them are already selected
          if (
            serviceCode.billingCode.previousCodes &&
            serviceCode.billingCode.previousCodes.length > 0
          ) {
            // Find if any of the previous codes are already in the form
            const selectedPreviousCodes = updatedBillingCodes.filter(
              (selectedCode) =>
                serviceCode.billingCode.previousCodes?.some(
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
                (c) => c.billingCode.id === previousCode.codeId
              );

              if (previousCodeIndex >= 0 && previousSelectedCode) {
                // Parse date without timezone conversion
                const prevDateStr =
                  updatedBillingCodes[previousCodeIndex].serviceDate ||
                  formData.serviceDate;
                const [prevYear, prevMonth, prevDay] = prevDateStr
                  .split("-")
                  .map(Number);
                const previousStartDate = new Date(
                  prevYear,
                  prevMonth - 1,
                  prevDay
                );

                // Set the previous code's end date as previous start date + day range - 1
                if (
                  previousSelectedCode.billingCode.day_range &&
                  previousSelectedCode.billingCode.day_range > 0
                ) {
                  const previousEndDate = new Date(previousStartDate);
                  previousEndDate.setDate(
                    previousEndDate.getDate() +
                      previousSelectedCode.billingCode.day_range -
                      1
                  );

                  // Format as YYYY-MM-DD
                  const endYear = previousEndDate.getFullYear();
                  const endMonth = String(
                    previousEndDate.getMonth() + 1
                  ).padStart(2, "0");
                  const endDay = String(previousEndDate.getDate()).padStart(
                    2,
                    "0"
                  );

                  // Update the previous code's end date
                  updatedBillingCodes[previousCodeIndex] = {
                    ...updatedBillingCodes[previousCodeIndex],
                    serviceEndDate: `${endYear}-${endMonth}-${endDay}`,
                  };
                }

                // Set the new code's start date to previous start date + day range
                if (
                  previousSelectedCode.billingCode.day_range &&
                  previousSelectedCode.billingCode.day_range > 0
                ) {
                  const newStartDate = new Date(previousStartDate);
                  newStartDate.setDate(
                    newStartDate.getDate() +
                      previousSelectedCode.billingCode.day_range
                  );
                  const startYear = newStartDate.getFullYear();
                  const startMonth = String(
                    newStartDate.getMonth() + 1
                  ).padStart(2, "0");
                  const startDay = String(newStartDate.getDate()).padStart(
                    2,
                    "0"
                  );
                  serviceStartDate = `${startYear}-${startMonth}-${startDay}`;
                } else {
                  // If previous code has no day range, start the next day
                  const newStartDate = new Date(previousStartDate);
                  newStartDate.setDate(newStartDate.getDate() + 1);
                  const startYear = newStartDate.getFullYear();
                  const startMonth = String(
                    newStartDate.getMonth() + 1
                  ).padStart(2, "0");
                  const startDay = String(newStartDate.getDate()).padStart(
                    2,
                    "0"
                  );
                  serviceStartDate = `${startYear}-${startMonth}-${startDay}`;
                }
              }
            }
            // If no previous codes are selected, keep the default service start date
          }
          // For type 57 codes, do not set an end date initially
          serviceEndDate = null;
        } else {
          // For non-type 57 codes, calculate service end date based on day range
          if (
            serviceCode.billingCode.day_range &&
            serviceCode.billingCode.day_range > 0
          ) {
            // Parse date without timezone conversion
            const [startYear, startMonth, startDay] = serviceStartDate
              .split("-")
              .map(Number);
            const startDate = new Date(startYear, startMonth - 1, startDay);
            startDate.setDate(
              startDate.getDate() + serviceCode.billingCode.day_range - 1
            ); // -1 because it's inclusive

            // Format as YYYY-MM-DD
            const endYear = startDate.getFullYear();
            const endMonth = String(startDate.getMonth() + 1).padStart(2, "0");
            const endDay = String(startDate.getDate()).padStart(2, "0");
            serviceEndDate = `${endYear}-${endMonth}-${endDay}`;
          }
        }

        // Add the new code to the billing codes
        updatedBillingCodes.push({
          codeId: serviceCode.billingCode.id,
          status: "PENDING",
          billing_record_type: serviceCode.billingCode.billing_record_type,
          serviceStartTime: subSelection?.serviceStartTime || null,
          serviceEndTime: subSelection?.serviceEndTime || null,
          numberOfUnits: subSelection?.numberOfUnits || 1,
          bilateralIndicator: subSelection?.bilateralIndicator || null,
          specialCircumstances: subSelection?.specialCircumstances || null,
          serviceDate: serviceStartDate,
          serviceEndDate: serviceEndDate,
          locationOfService: subSelection?.locationOfService || null,
          fee_determinant: serviceCode.billingCode.fee_determinant,
          multiple_unit_indicator:
            serviceCode.billingCode.multiple_unit_indicator,
        });
      });

      return {
        ...prev,
        billingCodes: updatedBillingCodes,
      };
    });

    // Update selectedCodes with the correct dates from subSelections
    const updatedServiceCodes = newServiceCodes.map((serviceCode) => {
      const subSelection = subSelections?.find(
        (s) => s.codeId === serviceCode.billingCode.id
      );
      return {
        ...serviceCode,
        serviceDate: subSelection?.serviceDate || serviceCode.serviceDate,
        serviceEndDate:
          subSelection?.serviceEndDate || serviceCode.serviceEndDate,
        serviceStartTime:
          subSelection?.serviceStartTime || serviceCode.serviceStartTime,
        serviceEndTime:
          subSelection?.serviceEndTime || serviceCode.serviceEndTime,
        numberOfUnits: subSelection?.numberOfUnits || serviceCode.numberOfUnits,
        bilateralIndicator:
          subSelection?.bilateralIndicator || serviceCode.bilateralIndicator,
        specialCircumstances:
          subSelection?.specialCircumstances ||
          serviceCode.specialCircumstances,
        locationOfService:
          subSelection?.locationOfService || serviceCode.locationOfService,
      };
    });

    setSelectedCodes([...selectedCodes, ...updatedServiceCodes]);
  };

  // Helper function to sync selectedCodes to formData.billingCodes
  const syncCodesToFormData = (codes: ServiceCode[]) => {
    const billingCodes = codes.map((code) => {
      const mappedCode: any = {
        codeId: code.billingCode.id,
        status: code.status,
        billing_record_type: code.billingCode.billing_record_type,
        serviceStartTime: code.serviceStartTime,
        serviceEndTime: code.serviceEndTime,
        numberOfUnits: code.numberOfUnits,
        bilateralIndicator: code.bilateralIndicator,
        specialCircumstances: code.specialCircumstances,
        serviceDate: code.serviceDate,
        serviceEndDate: code.serviceEndDate,
        fee_determinant: code.billingCode.fee_determinant,
        multiple_unit_indicator: code.billingCode.multiple_unit_indicator,
        changeLogs: code.changeLogs || [],
        locationOfService: code.locationOfService,
      };

      // Preserve service code ID if it exists and is a valid database ID
      if (code.id && code.id > 0 && code.id < 1000000000) {
        mappedCode.id = code.id;
      }

      return mappedCode;
    });

    setFormData((prev) => ({
      ...prev,
      billingCodes: billingCodes,
    }));
  };

  const handleRemoveCode = (codeId: number) => {
    setSelectedCodes(selectedCodes.filter((c) => c.billingCode.id !== codeId));
    setFormData((prev) => ({
      ...prev,
      billingCodes: prev.billingCodes.filter((c) => c.codeId !== codeId),
    }));

    // Check if we still need a referring physician after removing this code
    const remainingCodes = selectedCodes.filter(
      (c) => c.billingCode.id !== codeId
    );
    const stillRequiresReferringPhysician = remainingCodes.some(
      (code) => code.billingCode.referring_practitioner_required === "Y"
    );

    // If no longer required, clear the referring physician
    if (!stillRequiresReferringPhysician && selectedReferringPhysician) {
      handleRemoveReferringPhysician();
    }
  };

  const handleRemoveIndividualCode = (serviceCodeId: number) => {
    setSelectedCodes((prev) => {
      const updated = prev.filter((c) => c.id !== serviceCodeId);

      // Sync to formData.billingCodes
      syncCodesToFormData(updated);

      // Check if we still need a referring physician after removing this code
      const stillRequiresReferringPhysician = updated.some(
        (code) => code.billingCode.referring_practitioner_required === "Y"
      );

      // If no longer required, clear the referring physician
      if (!stillRequiresReferringPhysician && selectedReferringPhysician) {
        handleRemoveReferringPhysician();
      }

      return updated;
    });
  };

  const handleEditCode = (code: ServiceCode) => {
    setEditingCode(code);
    setShowEditModal(true);
  };

  const handleSaveEditedCode = (subSelection: any) => {
    if (!editingCode) return;

    // Update the selected code with the new configuration
    setSelectedCodes((prev) => {
      const updated = prev.map((c) =>
        c.id === editingCode.id
          ? {
              ...c,
              serviceDate: subSelection.serviceDate,
              serviceEndDate: subSelection.serviceEndDate,
              bilateralIndicator: subSelection.bilateralIndicator,
              serviceStartTime: subSelection.serviceStartTime,
              serviceEndTime: subSelection.serviceEndTime,
              numberOfUnits: subSelection.numberOfUnits,
              specialCircumstances: subSelection.specialCircumstances,
            }
          : c
      );

      // Sync to formData.billingCodes
      syncCodesToFormData(updated);
      return updated;
    });

    setShowEditModal(false);
    setEditingCode(null);
  };

  const handleAddNewInstanceOfCode = (billingCode: BillingCode) => {
    // Get the most recent billing code's locationOfService, or use default
    const mostRecentLocationOfService =
      selectedCodes.length > 0
        ? selectedCodes[selectedCodes.length - 1].locationOfService
        : null; // Must be set through modal

    // Create a new code instance with a temporary negative ID
    const newId = -Math.floor(Math.random() * 1000000);
    const newCode: ServiceCode = {
      id: newId,
      billingCode: billingCode,
      status: "ACTIVE",
      serviceDate: getTodayInTimezone(physicianTimezone),
      serviceEndDate: null,
      bilateralIndicator: null,
      serviceStartTime: null,
      serviceEndTime: null,
      serviceLocation: null,
      locationOfService: mostRecentLocationOfService || "1", // Remember last location or default to Office
      numberOfUnits: 1,
      specialCircumstances: null,
      summary: "",
      createdAt: new Date().toISOString(),
      changeLogs: [],
    };

    setEditingCode(newCode);
    setShowEditModal(true);
  };

  const handleDeleteChangeLog = (
    serviceCodeId: number,
    changeLogId: number
  ) => {
    Alert.alert(
      "Delete Log Entry",
      "Are you sure you want to delete this log entry? This will reduce the number of units by 1.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setSelectedCodes((prev) => {
              const updated = prev
                .map((code) => {
                  if (code.id === serviceCodeId) {
                    // Remove the change log
                    const updatedChangeLogs = (code.changeLogs || []).filter(
                      (log) => log.id !== changeLogId
                    );

                    // Reduce units by 1
                    const newUnits = updatedChangeLogs.length;

                    // If units go to 0, mark this code for removal
                    if (newUnits <= 0) {
                      return null; // Will be filtered out
                    }

                    // Otherwise, update the code with reduced units and removed log
                    return {
                      ...code,
                      numberOfUnits: newUnits,
                      changeLogs: updatedChangeLogs,
                    };
                  }
                  return code;
                })
                .filter((code): code is ServiceCode => code !== null);

              // Sync to formData.billingCodes
              syncCodesToFormData(updated);

              // Check if we still need a referring physician after this change
              const stillRequiresReferringPhysician = updated.some(
                (code) =>
                  code.billingCode.referring_practitioner_required === "Y"
              );

              // If no longer required, clear the referring physician
              if (
                !stillRequiresReferringPhysician &&
                selectedReferringPhysician
              ) {
                handleRemoveReferringPhysician();
              }

              return updated;
            });
          },
        },
      ]
    );
  };

  const handleSaveNewCodeInstance = (subSelection: any) => {
    if (!editingCode || editingCode.id >= 0) {
      // This is an edit, not a new instance
      handleSaveEditedCode(subSelection);
      return;
    }
    console.log(subSelection);
    // This is a new instance, add it to selectedCodes
    const newCode: ServiceCode = {
      id: editingCode.id, // Keep the temporary negative ID
      billingCode: editingCode.billingCode,
      status: "ACTIVE",
      serviceDate: subSelection.serviceDate,
      serviceEndDate: subSelection.serviceEndDate,
      bilateralIndicator: subSelection.bilateralIndicator,
      serviceStartTime: subSelection.serviceStartTime,
      serviceEndTime: subSelection.serviceEndTime,
      serviceLocation: null,
      locationOfService: subSelection.locationOfService, // Use from subSelection
      numberOfUnits: subSelection.numberOfUnits,
      specialCircumstances: subSelection.specialCircumstances,
      summary: "",
      createdAt: new Date().toISOString(),
      changeLogs: [],
    };

    setSelectedCodes((prev) => {
      const updated = [...prev, newCode];
      // Sync to formData.billingCodes
      syncCodesToFormData(updated);
      return updated;
    });

    setShowEditModal(false);
    setEditingCode(null);
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
    (code) => code.billingCode.referring_practitioner_required === "Y"
  );

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
    return formatFullDate(date);
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return (
      date1.toISOString().split("T")[0] === date2.toISOString().split("T")[0]
    );
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
    return true;
  };

  // Helper to validate and clean date strings
  const isValidDateString = (dateStr: any): dateStr is string => {
    if (!dateStr || typeof dateStr !== "string") return false;
    const trimmed = dateStr.trim();
    if (trimmed === "") return false;
    // Check if it matches YYYY-MM-DD format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(trimmed.split("T")[0])) return false;
    // Verify it's a parseable date
    const [year, month, day] = trimmed.split("T")[0].split("-").map(Number);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return false;
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) return;

    // Convert service date to physician's timezone
    const serviceDateUTC = convertLocalDateToTimezoneUTC(
      formData.serviceDate,
      physicianTimezone
    );

    // Ensure all billing codes have required fields
    // Only include ID for existing service codes (not temporary IDs)
    const validatedFormData = {
      ...formData,
      serviceDate: serviceDateUTC,
      serviceStatus: "OPEN",
      billingCodes: formData.billingCodes.map((code) => {
        const cleanedCode: any = {
          ...code,
          numberOfUnits: code.numberOfUnits || 1, // Ensure numberOfUnits is set
        };

        // Convert billing code dates to physician's timezone
        // Only convert if we have a valid date string
        if (isValidDateString(code.serviceDate)) {
          try {
            cleanedCode.serviceDate = convertLocalDateToTimezoneUTC(
              code.serviceDate.split("T")[0], // Ensure we only use the date part
              physicianTimezone
            );
          } catch (error) {
            console.error(
              "Error converting serviceDate:",
              code.serviceDate,
              error
            );
            cleanedCode.serviceDate = null;
          }
        } else {
          console.log(
            "Invalid or missing serviceDate for code:",
            code.codeId,
            "value:",
            code.serviceDate,
            "type:",
            typeof code.serviceDate
          );
          // For codes without a service date, keep it as null
          cleanedCode.serviceDate = null;
        }
        if (isValidDateString(code.serviceEndDate)) {
          try {
            cleanedCode.serviceEndDate = convertLocalDateToTimezoneUTC(
              code.serviceEndDate.split("T")[0], // Ensure we only use the date part
              physicianTimezone
            );
          } catch (error) {
            console.error(
              "Error converting serviceEndDate:",
              code.serviceEndDate,
              error
            );
            cleanedCode.serviceEndDate = null;
          }
        } else {
          cleanedCode.serviceEndDate = null;
        }

        // Only include ID if it's a valid existing service code ID
        // (not a temporary ID like Date.now() or negative numbers)
        if (code.id && code.id > 0 && code.id < 1000000000) {
          cleanedCode.id = code.id;
        } else {
          delete cleanedCode.id;
        }

        return cleanedCode;
      }),
    };

    if (isEditing) {
      updateServiceMutation.mutate(validatedFormData);
    } else {
      createServiceMutation.mutate(validatedFormData);
    }
  };

  const handleApproveAndFinish = () => {
    if (!validateForm()) return;

    // Proceed with approve and finish
    // The backend will automatically handle setting the discharge date
    // based on the last rounding log for type 57 codes
    performApproveAndFinish();
  };

  const performApproveAndFinish = () => {
    // Convert service date to physician's timezone
    const serviceDateUTC = convertLocalDateToTimezoneUTC(
      formData.serviceDate,
      physicianTimezone
    );

    // Ensure all billing codes have required fields
    // Only include ID for existing service codes (not temporary IDs)
    const validatedFormData = {
      ...formData,
      serviceDate: serviceDateUTC,
      serviceStatus: "PENDING",
      billingCodes: formData.billingCodes.map((code) => {
        const cleanedCode: any = {
          ...code,
          numberOfUnits: code.numberOfUnits || 1, // Ensure numberOfUnits is set
        };

        // Convert billing code dates to physician's timezone
        // Only convert if we have a valid date string
        if (isValidDateString(code.serviceDate)) {
          try {
            cleanedCode.serviceDate = convertLocalDateToTimezoneUTC(
              code.serviceDate.split("T")[0], // Ensure we only use the date part
              physicianTimezone
            );
          } catch (error) {
            console.error(
              "Error converting serviceDate:",
              code.serviceDate,
              error
            );
            cleanedCode.serviceDate = null;
          }
        } else {
          console.log(
            "Invalid or missing serviceDate for code:",
            code.codeId,
            "value:",
            code.serviceDate,
            "type:",
            typeof code.serviceDate
          );
          // For codes without a service date, keep it as null
          cleanedCode.serviceDate = null;
        }
        if (isValidDateString(code.serviceEndDate)) {
          try {
            cleanedCode.serviceEndDate = convertLocalDateToTimezoneUTC(
              code.serviceEndDate.split("T")[0], // Ensure we only use the date part
              physicianTimezone
            );
          } catch (error) {
            console.error(
              "Error converting serviceEndDate:",
              code.serviceEndDate,
              error
            );
            cleanedCode.serviceEndDate = null;
          }
        } else {
          cleanedCode.serviceEndDate = null;
        }

        // Only include ID if it's a valid existing service code ID
        // (not a temporary ID like Date.now() or negative numbers)
        if (code.id && code.id > 0 && code.id < 1000000000) {
          cleanedCode.id = code.id;
        } else {
          delete cleanedCode.id;
        }

        return cleanedCode;
      }),
    };

    if (isEditing) {
      updateServiceMutation.mutate(validatedFormData);
    } else {
      createServiceMutation.mutate(validatedFormData);
    }
  };

  // Handle rounding confirmation
  const handleConfirmRounding = async () => {
    if (!serviceId || !roundingDate) {
      Alert.alert("Error", "Please enter a rounding date.");
      return;
    }
    try {
      const result = await servicesAPI.round(serviceId, roundingDate);
      Alert.alert("Success", result.message);
      setShowRoundingModal(false);
      setRoundingDate("");
      // Refetch service data to update the UI
      queryClient.invalidateQueries({ queryKey: ["service", serviceId] });
    } catch (error) {
      console.error("Error performing rounding:", error);
      Alert.alert("Error", "Failed to perform rounding. Please try again.");
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

  // Component for date input with navigation buttons
  const DateInputWithNavigation = ({
    value,
    onChangeText,
    placeholder,
  }: {
    value: string;
    onChangeText: (text: string) => void;
    placeholder: string;
  }) => {
    const navigateDate = (direction: "prev" | "next") => {
      if (!value) {
        // If no current date, start with today in physician's timezone
        onChangeText(getLocalYMD(new Date(), physicianTimezone));
        return;
      }

      try {
        const [year, month, day] = value.split("-").map((v) => parseInt(v, 10));
        const currentDate = new Date(year, month - 1, day);

        if (direction === "prev") {
          currentDate.setDate(currentDate.getDate() - 1);
        } else {
          currentDate.setDate(currentDate.getDate() + 1);
        }

        onChangeText(getLocalYMD(currentDate));
      } catch (error) {
        // If parsing fails, default to today in physician's timezone
        onChangeText(getLocalYMD(new Date(), physicianTimezone));
      }
    };

    const getDisplayValue = () => {
      if (!value) return "";

      const today = getLocalYMD(new Date(), physicianTimezone);
      const yesterday = getLocalYMD(new Date(Date.now() - 24 * 60 * 60 * 1000));

      if (value === today) return "Today";
      if (value === yesterday) return "Yesterday";

      // Format as MM/DD/YYYY for other dates
      try {
        const [year, month, day] = value.split("-");
        return `${month}/${day}/${year}`;
      } catch {
        return value;
      }
    };

    const handleTextChange = (text: string) => {
      // If user types "Today", set to today's date in physician's timezone
      if (text.toLowerCase() === "today") {
        onChangeText(getLocalYMD(new Date(), physicianTimezone));
        return;
      }

      // If user types "Yesterday", set to yesterday's date
      if (text.toLowerCase() === "yesterday") {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        onChangeText(getLocalYMD(yesterday));
        return;
      }

      // For other text, try to parse as date or pass through
      onChangeText(text);
    };

    return (
      <View style={styles.dateInputWithNavigationContainer}>
        <TouchableOpacity
          style={styles.dateNavButton}
          onPress={() => navigateDate("prev")}
        >
          <Ionicons name="chevron-back" size={20} color="#6b7280" />
        </TouchableOpacity>

        <View style={styles.dateInputCenter}>
          <TextInput
            style={styles.dateInputNavigation}
            placeholder={placeholder}
            value={getDisplayValue()}
            onChangeText={handleTextChange}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.dateNavButton,
            getLocalYMD(new Date(), physicianTimezone) === value
              ? styles.disabledButton
              : null,
          ]}
          onPress={() => navigateDate("next")}
          disabled={getLocalYMD(new Date(), physicianTimezone) === value}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={
              getLocalYMD(new Date(), physicianTimezone) === value
                ? "#9ca3af"
                : "#6b7280"
            }
          />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {service?.patient
            ? `${service.patient.firstName} ${service.patient.lastName}`
            : isEditing
            ? "Edit Claim"
            : "New Claim"}
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

          {/* Summary - Removed */}

          {/* Billing Codes */}
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.sectionTitle}>Billing Codes</Text>

              {/* Toggle between Services and Rounding */}
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    billingCodeView === "procedures" &&
                      styles.toggleButtonActive,
                  ]}
                  onPress={() => setBillingCodeView("procedures")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      billingCodeView === "procedures" &&
                        styles.toggleButtonTextActive,
                    ]}
                  >
                    Procedures (
                    {
                      selectedCodes.filter(
                        (code) => code.billingCode.billing_record_type === 50
                      ).length
                    }
                    )
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    billingCodeView === "rounding" && styles.toggleButtonActive,
                  ]}
                  onPress={() => setBillingCodeView("rounding")}
                >
                  <Text
                    style={[
                      styles.toggleButtonText,
                      billingCodeView === "rounding" &&
                        styles.toggleButtonTextActive,
                    ]}
                  >
                    Rounding
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Display codes based on selected view */}
              {billingCodeView === "procedures" ? (
                <View style={{ marginTop: 16 }}>
                  {(() => {
                    // Filter procedures
                    const procedures = selectedCodes.filter(
                      (code) => code.billingCode.billing_record_type === 50
                    );

                    if (procedures.length === 0) {
                      return (
                        <Text style={styles.emptyText}>
                          No service codes added
                        </Text>
                      );
                    }

                    // Group by billing code
                    const groupedByCode = procedures.reduce((acc, code) => {
                      const codeId = code.billingCode.id;
                      if (!acc[codeId]) {
                        acc[codeId] = {
                          billingCode: code.billingCode,
                          dates: [],
                        };
                      }
                      if (code.serviceDate) {
                        acc[codeId].dates.push({
                          date: code.serviceDate,
                          serviceCodeId: code.id,
                        });
                      }
                      return acc;
                    }, {} as Record<number, { billingCode: any; dates: Array<{ date: string; serviceCodeId: number }> }>);

                    // Helper function to convert day to ordinal format
                    const getOrdinalDay = (day: number): string => {
                      const j = day % 10;
                      const k = day % 100;
                      if (j === 1 && k !== 11) {
                        return day + "st";
                      }
                      if (j === 2 && k !== 12) {
                        return day + "nd";
                      }
                      if (j === 3 && k !== 13) {
                        return day + "rd";
                      }
                      return day + "th";
                    };

                    return Object.values(groupedByCode).map((group) => {
                      const isExpanded =
                        expandedProcedureGroups[group.billingCode.id];

                      // Group dates by year/month/day for summary view
                      const datesByYearMonth = group.dates.reduce(
                        (acc, item) => {
                          // Parse date string manually to avoid timezone issues
                          // Handle both "YYYY-MM-DD" and "YYYY-MM-DDTHH:mm:ss" formats
                          const dateOnly = item.date.split("T")[0];
                          const dateParts = dateOnly.split("-");
                          const year = parseInt(dateParts[0], 10);
                          const monthNum = parseInt(dateParts[1], 10);
                          const day = parseInt(dateParts[2], 10);

                          const monthNames = [
                            "Jan",
                            "Feb",
                            "Mar",
                            "Apr",
                            "May",
                            "Jun",
                            "Jul",
                            "Aug",
                            "Sep",
                            "Oct",
                            "Nov",
                            "Dec",
                          ];
                          const monthName = monthNames[monthNum - 1];
                          const key = `${year}/${monthName}`;

                          if (!acc[key]) {
                            acc[key] = { year, month: monthName, dayCount: {} };
                          }
                          // Count occurrences of each day
                          acc[key].dayCount[day] =
                            (acc[key].dayCount[day] || 0) + 1;
                          return acc;
                        },
                        {} as Record<
                          string,
                          {
                            year: number;
                            month: string;
                            dayCount: Record<number, number>;
                          }
                        >
                      );

                      // Convert day counts to sorted array with formatted strings
                      Object.values(datesByYearMonth).forEach((monthData) => {
                        const sortedDays = Object.keys(monthData.dayCount)
                          .map(Number)
                          .sort((a, b) => a - b);
                        (monthData as any).formattedDays = sortedDays.map(
                          (day) => {
                            const count = monthData.dayCount[day];
                            const ordinalDay = getOrdinalDay(day);
                            return count > 1
                              ? `${count} x ${ordinalDay}`
                              : ordinalDay;
                          }
                        );
                      });

                      const yearMonthEntries = Object.entries(datesByYearMonth);

                      // Get all individual codes for this group
                      const individualCodes = selectedCodes.filter(
                        (code) => code.billingCode.id === group.billingCode.id
                      );

                      return (
                        <View
                          key={group.billingCode.id}
                          style={styles.groupedCodeContainer}
                        >
                          <TouchableOpacity
                            style={styles.groupedCodeHeader}
                            onPress={() => {
                              setExpandedProcedureGroups((prev) => ({
                                ...prev,
                                [group.billingCode.id]:
                                  !prev[group.billingCode.id],
                              }));
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text
                                style={styles.groupedCodeText}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {group.billingCode.code}:{" "}
                                {group.billingCode.title}
                              </Text>
                              {!isExpanded &&
                                yearMonthEntries.map(([key, monthData]) => (
                                  <View key={key} style={styles.groupedDateRow}>
                                    <Text style={styles.groupedDateText}>
                                      {monthData.year} - {monthData.month} (
                                      {(monthData as any).formattedDays.join(
                                        ", "
                                      )}
                                      )
                                    </Text>
                                  </View>
                                ))}
                            </View>
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={20}
                              color="#6b7280"
                            />
                          </TouchableOpacity>

                          {isExpanded && (
                            <View style={styles.expandedCodesContainer}>
                              {individualCodes.map((code) => {
                                // Format date without timezone conversion
                                const formatDateNoTimezone = (
                                  dateStr: string
                                ) => {
                                  if (!dateStr) return "";
                                  // Extract just the date part (YYYY-MM-DD)
                                  const dateOnly = dateStr.split("T")[0];
                                  const [year, month, day] = dateOnly
                                    .split("-")
                                    .map(Number);

                                  const monthNames = [
                                    "Jan",
                                    "Feb",
                                    "Mar",
                                    "Apr",
                                    "May",
                                    "Jun",
                                    "Jul",
                                    "Aug",
                                    "Sep",
                                    "Oct",
                                    "Nov",
                                    "Dec",
                                  ];

                                  return `${String(day).padStart(2, "0")} ${
                                    monthNames[month - 1]
                                  } ${year}`;
                                };

                                return (
                                  <View
                                    key={code.id}
                                    style={styles.individualCodeItem}
                                  >
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.individualCodeDate}>
                                        {formatDateNoTimezone(
                                          code.serviceDate || ""
                                        )}
                                      </Text>
                                      {code.numberOfUnits &&
                                        code.numberOfUnits > 1 && (
                                          <Text
                                            style={styles.individualCodeUnits}
                                          >
                                            Units: {code.numberOfUnits}
                                          </Text>
                                        )}
                                    </View>
                                    <View style={styles.individualCodeActions}>
                                      <TouchableOpacity
                                        onPress={() => handleEditCode(code)}
                                        style={styles.iconButton}
                                      >
                                        <Ionicons
                                          name="create-outline"
                                          size={20}
                                          color="#3b82f6"
                                        />
                                      </TouchableOpacity>
                                      <TouchableOpacity
                                        onPress={() =>
                                          handleRemoveIndividualCode(code.id)
                                        }
                                        style={styles.iconButton}
                                      >
                                        <Ionicons
                                          name="trash-outline"
                                          size={20}
                                          color="#ef4444"
                                        />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                );
                              })}

                              {/* Add New Instance Button */}
                              <TouchableOpacity
                                style={styles.addInstanceButton}
                                onPress={() =>
                                  handleAddNewInstanceOfCode(group.billingCode)
                                }
                              >
                                <Ionicons
                                  name="add-circle-outline"
                                  size={20}
                                  color="#3b82f6"
                                />
                                <Text style={styles.addInstanceButtonText}>
                                  Add Another Instance
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      );
                    });
                  })()}
                </View>
              ) : (
                <View style={{ marginTop: 16 }}>
                  {(() => {
                    const roundingCodes = selectedCodes
                      .filter(
                        (code) => code.billingCode.billing_record_type === 57
                      )
                      .sort((a, b) => {
                        // Sort by service date descending (most recent first)
                        const dateA = a.serviceDate
                          ? new Date(a.serviceDate).getTime()
                          : 0;
                        const dateB = b.serviceDate
                          ? new Date(b.serviceDate).getTime()
                          : 0;
                        return dateB - dateA;
                      });

                    if (roundingCodes.length === 0) {
                      return (
                        <Text style={styles.emptyText}>
                          No rounding codes added
                        </Text>
                      );
                    }

                    // Helper function to convert units to text
                    const getUnitsText = (units: number): string => {
                      const unitsMap: { [key: number]: string } = {
                        1: "once",
                        2: "twice",
                        3: "three times",
                        4: "four times",
                        5: "five times",
                        6: "six times",
                        7: "seven times",
                        8: "eight times",
                        9: "nine times",
                        10: "ten times",
                      };
                      return unitsMap[units] || `${units} times`;
                    };

                    // Helper function to format date or show "Today" without timezone conversion
                    const formatDateOrToday = (dateStr: string): string => {
                      if (!dateStr) return "";

                      // Extract just the date part (YYYY-MM-DD)
                      const dateOnly = dateStr.split("T")[0];
                      const today = new Date().toISOString().split("T")[0];

                      if (dateOnly === today) {
                        return "Today";
                      }

                      // Format date without timezone conversion
                      const [year, month, day] = dateOnly
                        .split("-")
                        .map(Number);
                      const monthNames = [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ];

                      return `${String(day).padStart(2, "0")} ${
                        monthNames[month - 1]
                      } ${year}`;
                    };

                    // Helper function to format datetime
                    const formatDateTime = (dateStr: string): string => {
                      if (!dateStr) return "";
                      const date = new Date(dateStr);
                      const monthNames = [
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ];
                      const day = date.getDate();
                      const month = monthNames[date.getMonth()];
                      const year = date.getFullYear();
                      const hours = date.getHours();
                      const minutes = date.getMinutes();
                      return `${String(day).padStart(
                        2,
                        "0"
                      )} ${month} ${year} ${String(hours).padStart(
                        2,
                        "0"
                      )}:${String(minutes).padStart(2, "0")}`;
                    };

                    return roundingCodes.map((code) => {
                      const isExpanded = expandedRoundingGroups[code.id];

                      // Calculate the display end date
                      let displayEndDate = code.serviceEndDate;

                      if (!displayEndDate) {
                        const today = new Date().toISOString().split("T")[0];

                        // Calculate max possible end date from billing code chain
                        let maxEndDate = null;
                        if (
                          code.billingCode.billingCodeChains &&
                          code.billingCode.billingCodeChains.length > 0
                        ) {
                          // Find the last code in the chain (isLast = true) or use the highest cumulativeDayRange
                          const lastChainCode =
                            code.billingCode.billingCodeChains.find(
                              (c) => c.isLast
                            ) ||
                            code.billingCode.billingCodeChains.reduce(
                              (max, c) =>
                                c.cumulativeDayRange > max.cumulativeDayRange
                                  ? c
                                  : max
                            );

                          if (lastChainCode && code.serviceDate) {
                            const startDate = new Date(code.serviceDate);
                            const endDate = new Date(startDate);
                            endDate.setDate(
                              endDate.getDate() +
                                lastChainCode.cumulativeDayRange -
                                1
                            );
                            maxEndDate = endDate.toISOString().split("T")[0];
                          }
                        } else if (
                          code.billingCode.day_range &&
                          code.serviceDate
                        ) {
                          // Fallback to day_range if no chain available
                          const startDate = new Date(code.serviceDate);
                          const endDate = new Date(startDate);
                          endDate.setDate(
                            endDate.getDate() + code.billingCode.day_range - 1
                          );
                          maxEndDate = endDate.toISOString().split("T")[0];
                        }

                        // Use the minimum of today and maxEndDate
                        if (maxEndDate) {
                          displayEndDate =
                            today < maxEndDate ? today : maxEndDate;
                        } else {
                          displayEndDate = today;
                        }
                      }

                      // Get change logs sorted by date (most recent first)
                      const sortedChangeLogs = (code.changeLogs || []).sort(
                        (a, b) =>
                          new Date(b.changedAt).getTime() -
                          new Date(a.changedAt).getTime()
                      );

                      return (
                        <View key={code.id} style={styles.groupedCodeContainer}>
                          <TouchableOpacity
                            style={styles.groupedCodeHeader}
                            onPress={() => {
                              setExpandedRoundingGroups((prev) => ({
                                ...prev,
                                [code.id]: !prev[code.id],
                              }));
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Text
                                style={styles.groupedCodeText}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                              >
                                {code.billingCode.code}
                                {" - "}
                                {getUnitsText(code.numberOfUnits || 1)}
                              </Text>
                              <Text style={styles.groupedDateText}>
                                {formatDateOrToday(code.serviceDate || "")}{" "}
                                {"->"} {formatDateOrToday(displayEndDate)}
                              </Text>
                              {!isExpanded && sortedChangeLogs.length > 0 && (
                                <Text style={styles.groupedDateText}>
                                  {sortedChangeLogs.length} log
                                  {sortedChangeLogs.length !== 1 ? "s" : ""}
                                </Text>
                              )}
                            </View>
                            <Ionicons
                              name={isExpanded ? "chevron-up" : "chevron-down"}
                              size={20}
                              color="#6b7280"
                            />
                          </TouchableOpacity>

                          {isExpanded && (
                            <View style={styles.expandedCodesContainer}>
                              {sortedChangeLogs.length > 0 ? (
                                sortedChangeLogs.map((log) => (
                                  <View
                                    key={log.id}
                                    style={styles.individualCodeItem}
                                  >
                                    <View style={{ flex: 1 }}>
                                      <Text style={styles.individualCodeDate}>
                                        {log.roundingDate &&
                                          `${formatDateOrToday(
                                            log.roundingDate
                                          )}`}
                                      </Text>
                                      <Text
                                        style={[
                                          styles.individualCodeUnits,
                                          { fontSize: 11 },
                                        ]}
                                      >
                                        Entered On{" "}
                                        {formatDateTime(log.changedAt)}
                                      </Text>
                                    </View>
                                    <View style={styles.individualCodeActions}>
                                      <TouchableOpacity
                                        onPress={() =>
                                          handleDeleteChangeLog(code.id, log.id)
                                        }
                                        style={styles.iconButton}
                                      >
                                        <Ionicons
                                          name="trash-outline"
                                          size={20}
                                          color="#ef4444"
                                        />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                ))
                              ) : (
                                <Text style={styles.emptyText}>
                                  No change logs for this code
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    });
                  })()}
                </View>
              )}

              {billingCodeView === "rounding" ? (
                <TouchableOpacity
                  style={styles.addCodeButton}
                  onPress={() => {
                    // Open rounding modal and default date to today in physician's timezone
                    const today = getLocalYMD(new Date(), physicianTimezone);
                    setRoundingDate(today);
                    setShowRoundingModal(true);
                  }}
                >
                  <Ionicons name="repeat" size={20} color="#2563eb" />
                  <Text style={styles.addCodeButtonText}>Add Rounding</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.addCodeButton}
                  onPress={handleAddBillingCodeWithSuggestions}
                >
                  <Ionicons name="add" size={20} color="#2563eb" />
                  <Text style={styles.addCodeButtonText}>Add Billing Code</Text>
                </TouchableOpacity>
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
                  {formData.serviceDate
                    ? formatFullDate(formData.serviceDate)
                    : "Select Service Date"}
                </Text>
                <Ionicons name="calendar" size={20} color="#6b7280" />
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
                    placeholderTextColor="#6b7280"
                    value={newPatient.firstName}
                    onChangeText={(text) =>
                      setNewPatient((prev) => ({ ...prev, firstName: text }))
                    }
                    onFocus={handleTextInputFocus}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder="Last Name *"
                    placeholderTextColor="#6b7280"
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
                    onFocus={handleTextInputFocus}
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
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>

        {/* Submit Buttons - Fixed to bottom */}
        <View style={styles.fixedButtonsContainer}>
          <Button
            mode="outlined"
            onPress={handleSave}
            loading={
              createServiceMutation.isPending || updateServiceMutation.isPending
            }
            style={[styles.submitButton, styles.saveButton]}
            disabled={
              !hasChanges ||
              createServiceMutation.isPending ||
              updateServiceMutation.isPending
            }
          >
            Save for Later
          </Button>
          <Button
            mode="contained"
            onPress={handleApproveAndFinish}
            loading={
              createServiceMutation.isPending || updateServiceMutation.isPending
            }
            style={[styles.submitButton, styles.approveButton]}
            disabled={
              formData.serviceStatus !== "OPEN" ||
              createServiceMutation.isPending ||
              updateServiceMutation.isPending
            }
          >
            Complete
          </Button>
        </View>
      </KeyboardAvoidingView>

      {/* Rounding Date Modal */}
      <Modal
        visible={showRoundingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowRoundingModal(false);
          setRoundingDate("");
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowRoundingModal(false);
            setRoundingDate("");
          }}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={() => {}} // Prevent closing when tapping inside modal
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Rounding Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRoundingModal(false);
                  setRoundingDate("");
                }}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.subSelectionScrollView}>
              <View style={styles.subSelectionSection}>
                <DateInputWithNavigation
                  value={roundingDate}
                  onChangeText={setRoundingDate}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </ScrollView>
            <View style={styles.modalButtonContainer}>
              <Button
                mode="contained"
                onPress={handleConfirmRounding}
                style={styles.modalButton}
              >
                Confirm
              </Button>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Billing Code Configuration Modal for Editing */}
      <BillingCodeConfigurationModal
        visible={showEditModal}
        billingCode={editingCode?.billingCode || null}
        subSelection={
          editingCode
            ? {
                codeId: editingCode.billingCode.id,
                serviceDate: editingCode.serviceDate
                  ? editingCode.serviceDate.split("T")[0]
                  : null,
                serviceEndDate: editingCode.serviceEndDate
                  ? editingCode.serviceEndDate.split("T")[0]
                  : null,
                bilateralIndicator: editingCode.bilateralIndicator,
                serviceStartTime: editingCode.serviceStartTime,
                serviceEndTime: editingCode.serviceEndTime,
                numberOfUnits: editingCode.numberOfUnits,
                specialCircumstances: editingCode.specialCircumstances,
                locationOfService: editingCode.locationOfService,
              }
            : null
        }
        onClose={() => {
          setShowEditModal(false);
          setEditingCode(null);
        }}
        onSave={handleSaveNewCodeInstance}
        serviceDate={formData.serviceDate}
        physician={physicians?.[0] || null}
      />

      {/* Billing Code Suggestions Modal */}
      <Modal
        visible={showBillingCodeSuggestionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBillingCodeSuggestionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBillingCodeSuggestionsModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Billing Code</Text>
              <TouchableOpacity
                onPress={() => setShowBillingCodeSuggestionsModal(false)}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {patientPreviousCodes.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={styles.suggestionGrid}>
                    {patientPreviousCodes.map((item) => (
                      <TouchableOpacity
                        key={`prev-${item.billingCode.id}`}
                        style={[styles.suggestionItem, styles.suggestionChip]}
                        onPress={async () => {
                          // Initialize selection and force sub-selection modal
                          setBillingCodeSelections([item.billingCode]);
                          setCodeSubSelections([
                            {
                              ...item.lastServiceCodePayload,
                              numberOfUnits:
                                item.lastServiceCodePayload.numberOfUnits ?? 1,
                              locationOfService: "1", // Default to Office
                            },
                          ]);
                          setCurrentCodeForSubSelection(item.billingCode);
                          setShowBillingCodeSuggestionsModal(false);
                          setShowSubSelectionModal(true);
                        }}
                        onLongPress={() =>
                          Alert.alert(
                            item.billingCode.code,
                            `${
                              item.billingCode.title || ""
                            }\nLast used ${formatRelativeDate(
                              item.lastUsedDate
                            )}`
                          )
                        }
                      >
                        <Text
                          style={styles.suggestionTitleDark}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.billingCode.code}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {physicianFrequentCodes.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <View style={styles.suggestionGrid}>
                    {physicianFrequentCodes.map((code) => (
                      <TouchableOpacity
                        key={`freq-${code.id}`}
                        style={[
                          styles.suggestionItemBlue,
                          styles.suggestionChip,
                        ]}
                        onPress={async () => {
                          try {
                            // Fetch full code details
                            const matches = await billingCodesAPI.search(
                              code.code
                            );
                            const full =
                              matches.find((m) => m.id === code.id) ||
                              matches[0] ||
                              code;
                            const today = getLocalYMD(
                              new Date(),
                              physicianTimezone
                            );

                            // Initialize selection and sub-selection
                            setBillingCodeSelections([full]);

                            const isType57 = full.billing_record_type === 57;
                            const defaultServiceDate = !isType57 ? today : null;

                            const newSubSelection = {
                              codeId: full.id,
                              serviceDate: defaultServiceDate,
                              serviceEndDate: null,
                              bilateralIndicator: null,
                              serviceStartTime: null,
                              serviceEndTime: null,
                              numberOfUnits: 1,
                              specialCircumstances: null,
                              locationOfService: "1", // Default to Office
                            };

                            setCodeSubSelections([newSubSelection]);

                            // If the code requires extra selections, open the modal
                            if (requiresExtraSelectionsInline(full)) {
                              setCurrentCodeForSubSelection(full);
                              setShowBillingCodeSuggestionsModal(false);
                              setShowSubSelectionModal(true);
                            } else {
                              // If no extra selections, add immediately
                              handleAddCodes([full], [newSubSelection]);
                              setShowBillingCodeSuggestionsModal(false);
                            }
                          } catch (e) {
                            console.error("Error preloading frequent code:", e);
                            Alert.alert(
                              "Error",
                              "Unable to prepare the code for adding."
                            );
                          }
                        }}
                        onLongPress={() =>
                          Alert.alert(code.code, code.title || "")
                        }
                      >
                        <Text
                          style={styles.suggestionTitleLight}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {code.code}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={{ marginTop: 8 }}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowBillingCodeSuggestionsModal(false);
                    navigation.navigate("BillingCodeSearch", {
                      onSelect: handleAddCodes,
                      existingCodes: selectedCodes.map((c) => c.billingCode),
                      serviceDate: formData.serviceDate,
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Other</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Sub-selection Modal for code customization */}
      <BillingCodeConfigurationModal
        visible={showSubSelectionModal}
        billingCode={currentCodeForSubSelection}
        subSelection={
          currentCodeForSubSelection
            ? getSubSelectionForCodeInline(currentCodeForSubSelection.id) ||
              null
            : null
        }
        onClose={() => setShowSubSelectionModal(false)}
        onSave={(updatedSubSelection) => {
          // Create the updated sub-selection array with the new values
          const updatedSubSelections = codeSubSelections.map((s) =>
            s.codeId === updatedSubSelection.codeId
              ? {
                  ...s,
                  serviceDate: updatedSubSelection.serviceDate,
                  serviceEndDate: updatedSubSelection.serviceEndDate,
                  bilateralIndicator: updatedSubSelection.bilateralIndicator,
                  serviceStartTime: updatedSubSelection.serviceStartTime,
                  serviceEndTime: updatedSubSelection.serviceEndTime,
                  numberOfUnits: updatedSubSelection.numberOfUnits ?? 1,
                  specialCircumstances:
                    updatedSubSelection.specialCircumstances,
                  locationOfService: updatedSubSelection.locationOfService,
                }
              : s
          );

          // Add the code with the updated sub-selection
          if (billingCodeSelections.length > 0) {
            handleAddCodes(billingCodeSelections, updatedSubSelections);
          }

          // Clean up and close
          setShowSubSelectionModal(false);
          setBillingCodeSelections([]);
          setCodeSubSelections([]);
          setCurrentCodeForSubSelection(null);
        }}
        serviceDate={formData.serviceDate}
        physician={physicians?.[0] || null}
      />
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
  duplicatePatientContainer: {
    marginTop: 8,
  },
  duplicatePatientCard: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderWidth: 1,
    borderRadius: 8,
  },
  duplicatePatientTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e40af",
    marginBottom: 4,
  },
  duplicatePatientName: {
    fontSize: 14,
    color: "#1e3a8a",
    marginBottom: 2,
  },
  duplicatePatientDetails: {
    fontSize: 12,
    color: "#3730a3",
    marginBottom: 8,
  },
  selectDuplicateButton: {
    backgroundColor: "#2563eb",
  },
  selectDuplicateButtonText: {
    fontSize: 12,
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
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 4,
    marginTop: 8,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#2563eb",
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  toggleButtonTextActive: {
    color: "#ffffff",
  },
  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 8,
  },
  groupedCodeContainer: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  groupedCodeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  groupedCodeFirstLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupedCodeText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  groupedDateRow: {
    marginTop: 1,
  },
  groupedDateText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
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
  fixedButtonsContainer: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 0 : 16,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
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
  expandedCodesContainer: {
    marginTop: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: "#e5e7eb",
  },
  individualCodeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  individualCodeDate: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  individualCodeUnits: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  individualCodeActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    padding: 4,
  },
  addInstanceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderStyle: "dashed",
    backgroundColor: "#f0f9ff",
  },
  addInstanceButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#3b82f6",
  },
  dateInputWithNavigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  dateNavButton: {
    padding: 24,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    marginHorizontal: 4,
  },
  dateInputCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  dateInputNavigation: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    width: "100%",
    textAlign: "center",
  },
  subSelectionScrollView: {
    padding: 20,
  },
  subSelectionSection: {
    marginBottom: 16,
  },
  subSelectionSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  requiredText: {
    color: "#ef4444",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  readOnlyInput: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  calculatedDateNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    fontStyle: "italic",
  },
  unitsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  unitButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    padding: 12,
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  unitButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },
  unitsInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: "center",
    backgroundColor: "#ffffff",
  },
  maxUnitsText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "normal",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  bilateralContainer: {
    flexDirection: "row",
    gap: 12,
  },
  bilateralButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  selectedBilateralButton: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  bilateralButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  selectedBilateralButtonText: {
    color: "#ffffff",
  },
  suggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionItem: {
    backgroundColor: "#1f2937",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 70,
  },
  suggestionItemBlue: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 70,
  },
  suggestionChip: {
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionTitleDark: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  suggestionTitleLight: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  confirmButton: {
    backgroundColor: "#2563eb",
  },
});

export default ServiceFormScreen;
