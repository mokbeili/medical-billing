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
  referringPhysiciansAPI,
  servicesAPI,
} from "../services/api";
import { BillingCode, ReferringPhysician } from "../types";
import {
  splitBillingCodeByTimeAndLocation,
  type LocationOfService,
} from "../utils/billingCodeUtils";
import {
  convertLocalDateToTimezoneUTC,
  formatFullDate,
} from "../utils/dateUtils";
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
  locationOfService: string | null;
}

interface ServiceCreationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  scannedData: ScannedPatientData | null;
  physicianId: string;
  billingTypeId: number | null;
}

type Step =
  | "patient"
  | "patientSearch"
  | "patientCreation"
  | "billingCodes"
  | "referringPhysician"
  | "serviceDate"
  | "serviceLocation"
  | "icdCode"
  | "summary";

// Utility function to format birthdate in MMM-DD-YYYY format
const formatBirthdate = (dateOfBirth: string | null | undefined): string => {
  if (!dateOfBirth) return "";

  try {
    let date: Date;

    // Handle YYYY-MM-DD format as local date to avoid timezone issues
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      const [year, month, day] = dateOfBirth.split("-").map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      date = new Date(dateOfBirth);
    }

    if (isNaN(date.getTime())) return "";

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

    const month = monthNames[date.getMonth()];
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();

    return `${month}-${day}-${year}`;
  } catch (error) {
    console.error("Error formatting birthdate:", error);
    return "";
  }
};

// Utility function to get patient age and gender description
const getPatientDescription = (patient: any): string => {
  if (!patient) return "Unknown patient";

  let age: number | null = null;

  if (patient.dateOfBirth) {
    try {
      let birthDate: Date;

      // Handle YYYY-MM-DD format as local date to avoid timezone issues
      if (/^\d{4}-\d{2}-\d{2}$/.test(patient.dateOfBirth)) {
        const [year, month, day] = patient.dateOfBirth.split("-").map(Number);
        birthDate = new Date(year, month - 1, day); // month is 0-indexed
      } else {
        birthDate = new Date(patient.dateOfBirth);
      }

      if (!isNaN(birthDate.getTime())) {
        age = new Date().getFullYear() - birthDate.getFullYear();
      }
    } catch (error) {
      console.error("Error calculating age:", error);
    }
  }

  const sex = patient.sex || "unknown";
  const sexText = sex === "M" ? "male" : sex === "F" ? "female" : "unknown";

  if (age) {
    return `${age} year old ${sexText}`;
  }
  return `${sexText}`;
};

const ServiceCreationModal: React.FC<ServiceCreationModalProps> = ({
  visible,
  onClose,
  onSuccess,
  scannedData,
  physicianId,
  billingTypeId,
}) => {
  // Clear all state function
  const clearAllState = () => {
    setCurrentStep(getInitialStep());
    setSelectedPatient(null);
    setSelectedBillingCodes([]);
    setCodeSubSelections([]);
    setSelectedICDCode(null);
    setIcdSearchQuery("");
    setServiceDate(format(new Date(), "yyyy-MM-dd"));
    setServiceLocation("X"); // Default to Rural/Northern
    setIsPatientConfirmed(false);
    setShowBillingCodeDetails(null);
    setShowBillingCodeConfigModal(false);
    setCurrentCodeForConfig(null);
    setSelectedReferringPhysician(null);
    setReferringPhysicianSearchQuery("");

    // Clear patient search and creation state
    setPatientSearchQuery("");
    setFilteredPatients([]);
    setShowPatientDropdown(false);
    setIsCreatingPatient(false);
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

    // Clear date picker state
    setShowDatePicker(false);
    setSelectedCalendarDate(null);
    setCurrentCalendarMonth(new Date());
    setSelectedDecade(0);
    setSelectedYear(0);
    setSelectedMonth(0);
    setDatePickerStep("decade");
  };

  // Clear AsyncStorage when modal is closed
  const handleClose = async () => {
    try {
      await AsyncStorage.removeItem("scannedPatientData");
    } catch (error) {
      console.error("Error clearing scanned patient data on close:", error);
    }
    clearAllState(); // Clear all state when modal is closed
    onClose();
  };

  // Determine initial step based on whether we have scanned data
  const getInitialStep = (): Step => {
    if (scannedData) {
      return "patient";
    }
    return "patientSearch";
  };

  const [currentStep, setCurrentStep] = useState<Step>(getInitialStep());
  const [patientData, setPatientData] = useState<ScannedPatientData | null>(
    scannedData
  );
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [serviceDate, setServiceDate] = useState<string>(
    scannedData?.serviceDate || format(new Date(), "yyyy-MM-dd")
  );
  const [serviceLocation, setServiceLocation] = useState<string>("X"); // Default to Rural/Northern
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

  // Patient search and creation state
  const [patientSearchQuery, setPatientSearchQuery] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<any[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    billingNumber: "",
    dateOfBirth: "",
    sex: "",
  });
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

  // Referring physician state
  const [referringPhysicianSearchQuery, setReferringPhysicianSearchQuery] =
    useState("");
  const [
    debouncedReferringPhysicianQuery,
    setDebouncedReferringPhysicianQuery,
  ] = useState("");
  const [referringPhysicianSearchResults, setReferringPhysicianSearchResults] =
    useState<ReferringPhysician[]>([]);
  const [isSearchingReferringPhysician, setIsSearchingReferringPhysician] =
    useState(false);
  const [selectedReferringPhysician, setSelectedReferringPhysician] =
    useState<ReferringPhysician | null>(null);

  // Service location options (based on ServiceFormScreen)
  const serviceLocationOptions = [
    { value: "R", label: "Regina" },
    { value: "S", label: "Saskatoon" },
    { value: "X", label: "Rural/Northern" },
  ];

  // Fetch health institutions
  const { data: healthInstitutions = [] } = useQuery<HealthInstitution[]>({
    queryKey: ["healthInstitutions"],
    queryFn: healthInstitutionsAPI.getAll,
  });

  // Fetch patients for search functionality
  const { data: patients, isLoading: patientsLoading } = useQuery<any[]>({
    queryKey: ["patients"],
    queryFn: patientsAPI.getAll,
    enabled: visible && currentStep === "patientSearch",
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

  // Get the physician's timezone
  const physicianTimezone = React.useMemo(() => {
    return physician?.timezone || "America/Regina"; // Default to Regina timezone
  }, [physician]);

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

  // Debounce referring physician search query
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedReferringPhysicianQuery(referringPhysicianSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [referringPhysicianSearchQuery]);

  // Search referring physicians effect
  React.useEffect(() => {
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

  // Check if patient exists (only for scanned data)
  const { data: existingPatient, isLoading: checkingPatient } = useQuery({
    queryKey: ["patient", patientData?.billingNumber, physicianId],
    queryFn: async () => {
      try {
        const patients = await patientsAPI.getAll();
        const foundPatient = patients.find(
          (p: any) => p.billingNumber === patientData?.billingNumber
        );
        return foundPatient || null; // Always return a value, null if not found
      } catch (error) {
        console.error("Error fetching patients:", error);
        return null; // Return null on error instead of throwing
      }
    },
    enabled:
      visible &&
      !!patientData?.billingNumber &&
      patientData.billingNumber.length > 0 &&
      physicianId.length > 0,
  });

  // Get the current patient (either from scanned data or selected patient)
  const currentPatient =
    selectedPatient ||
    (scannedData
      ? {
          id: "scanned", // Temporary ID for scanned data
          firstName: scannedData.firstName,
          lastName: scannedData.lastName,
          billingNumber: scannedData.billingNumber,
          dateOfBirth: scannedData.dateOfBirth,
          sex: scannedData.gender,
        }
      : existingPatient);

  // Filter patients based on search query
  React.useEffect(() => {
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

  // Calendar utility functions
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const generateCalendarDays = (date: Date) => {
    const daysInMonth = getDaysInMonth(date);
    const firstDay = getFirstDayOfMonth(date);
    const days = [];
    const today = new Date();

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(date.getFullYear(), date.getMonth(), day);
      const isFuture = dayDate > today;

      days.push({
        date: dayDate,
        day: day,
        isFuture: isFuture,
      });
    }

    return days;
  };

  const isSameDate = (date1: Date, date2: Date) => {
    return (
      date1.toISOString().split("T")[0] === date2.toISOString().split("T")[0]
    );
  };

  const formatDate = (date: Date) => {
    return formatFullDate(date);
  };

  const handleCalendarDateSelect = (date: Date) => {
    setSelectedCalendarDate(date);
  };

  const handleCalendarConfirm = () => {
    if (selectedCalendarDate) {
      // Format date as YYYY-MM-DD for storage
      const year = selectedCalendarDate.getFullYear();
      const month = String(selectedCalendarDate.getMonth() + 1).padStart(
        2,
        "0"
      );
      const day = String(selectedCalendarDate.getDate()).padStart(2, "0");
      const formattedDate = `${year}-${month}-${day}`;

      setNewPatient((prev) => ({ ...prev, dateOfBirth: formattedDate }));
      if (newPatientErrors.dateOfBirth) {
        setNewPatientErrors((prev) => ({ ...prev, dateOfBirth: false }));
      }
    }
    setShowDatePicker(false);
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

  const handleBackToDecade = () => {
    setDatePickerStep("decade");
  };

  const handleBackToYear = () => {
    setDatePickerStep("year");
  };

  const handleBackToMonth = () => {
    setDatePickerStep("month");
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

    // If we're selecting a year that's the current year, only show months up to current month
    if (selectedYear === currentYear) {
      return allMonths.filter((month) => month.value <= currentMonth);
    }

    return allMonths;
  };

  // Create new patient mutation
  const createNewPatientMutation = useMutation({
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
      setSelectedPatient(newPatient);
      setPatientSearchQuery(
        `${newPatient.firstName} ${newPatient.lastName} (#${newPatient.billingNumber})`
      );
      setIsCreatingPatient(false);
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
    },
    onError: (error: any) => {
      console.error("Error creating patient:", error);
      Alert.alert("Error", "Failed to create patient");
    },
  });

  const handleCreateNewPatient = () => {
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
    createNewPatientMutation.mutate({
      ...newPatient,
      physicianId,
    });
  };

  // Check if any selected billing codes require a referring practitioner
  const requiresReferringPhysician = selectedBillingCodes.some(
    (code) => code.referring_practitioner_required === "Y"
  );

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
      case "patientSearch":
        // This step is now handled inline - just proceed to billing codes if patient is selected
        if (currentPatient) {
          setCurrentStep("billingCodes");
        }
        break;
      case "patientCreation":
        // This step is handled inline
        break;
      case "billingCodes":
        // Check if referring physician is required
        if (requiresReferringPhysician) {
          setCurrentStep("referringPhysician");
        } else if (selectedBillingCodes.length > 0) {
          setCurrentStep("serviceDate");
        } else {
          setCurrentStep("icdCode");
        }
        break;
      case "referringPhysician":
        // After selecting referring physician, go to service date
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
        if (scannedData) {
          setCurrentStep("patient");
        } else {
          setCurrentStep("patientSearch");
        }
        break;
      case "referringPhysician":
        setCurrentStep("billingCodes");
        break;
      case "serviceDate":
        // If referring physician was required, go back to it
        if (requiresReferringPhysician) {
          setCurrentStep("referringPhysician");
        } else {
          setCurrentStep("billingCodes");
        }
        break;
      case "serviceLocation":
        setCurrentStep("serviceDate");
        break;
      case "icdCode":
        // Go back to serviceLocation
        setCurrentStep("serviceLocation");
        break;
      case "summary":
        setCurrentStep("icdCode");
        break;
    }
  };

  const handleCreatePatient = async () => {
    if (!patientData) {
      Alert.alert("Error", "No patient data available");
      return;
    }

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
      // Convert service date to physician's timezone
      const serviceDateUTC = convertLocalDateToTimezoneUTC(
        serviceDate,
        physicianTimezone
      );

      // Convert physician locations to LocationOfService format
      const locationsOfService: LocationOfService[] =
        physician?.physicianLocationsOfService?.map((plos) => ({
          id: plos.locationOfService.id,
          code: plos.locationOfService.code,
          name: plos.locationOfService.name,
          startTime: plos.locationOfService.startTime || null,
          endTime: plos.locationOfService.endTime || null,
          holidayStartTime: plos.locationOfService.holidayStartTime || null,
          holidayEndTime: plos.locationOfService.holidayEndTime || null,
        })) || [];

      // Prepare billing codes data using configured sub-selections and apply splitting logic
      const billingCodesData = selectedBillingCodes.flatMap((code) => {
        const subSelection = getSubSelectionForCode(code.id);

        // Convert billing code dates to physician's timezone
        const codeServiceDate = subSelection?.serviceDate || serviceDate;
        const codeServiceDateUTC = convertLocalDateToTimezoneUTC(
          codeServiceDate,
          physicianTimezone
        );
        const codeServiceEndDateUTC = subSelection?.serviceEndDate
          ? convertLocalDateToTimezoneUTC(
              subSelection.serviceEndDate,
              physicianTimezone
            )
          : null;

        // Check if this code should be split
        const shouldSplit =
          code.multiple_unit_indicator === "U" &&
          code.billing_unit_type?.includes("MINUTES") &&
          subSelection?.serviceStartTime &&
          subSelection?.serviceEndTime &&
          locationsOfService.length > 0;

        if (shouldSplit) {
          // Apply splitting logic
          const splitCodes = splitBillingCodeByTimeAndLocation(
            {
              codeId: code.id,
              code: code.code,
              title: code.title,
              multiple_unit_indicator: code.multiple_unit_indicator,
              billing_unit_type: code.billing_unit_type,
              serviceStartTime: subSelection!.serviceStartTime,
              serviceEndTime: subSelection!.serviceEndTime,
              serviceDate: codeServiceDate,
              numberOfUnits: subSelection?.numberOfUnits,
              bilateralIndicator: subSelection?.bilateralIndicator,
              specialCircumstances: subSelection?.specialCircumstances,
              locationOfService: subSelection?.locationOfService,
            },
            locationsOfService,
            physicianTimezone,
            [] // Empty holidays array for now
          );

          // Convert each split code to the API format
          return splitCodes.map((splitCode) => {
            const splitCodeServiceDateUTC = splitCode.serviceDate
              ? convertLocalDateToTimezoneUTC(
                  splitCode.serviceDate,
                  physicianTimezone
                )
              : codeServiceDateUTC;

            const result = {
              codeId: code.id,
              status: "ACTIVE",
              billing_record_type: code.billing_record_type || 1,
              serviceStartTime: splitCode.serviceStartTime,
              serviceEndTime: splitCode.serviceEndTime,
              numberOfUnits: splitCode.numberOfUnits,
              bilateralIndicator: splitCode.bilateralIndicator || null,
              specialCircumstances: splitCode.specialCircumstances || null,
              serviceDate: splitCodeServiceDateUTC,
              serviceEndDate: codeServiceEndDateUTC,
              locationOfService: splitCode.locationOfService || "2",
              fee_determinant: code.fee_determinant || "A",
              multiple_unit_indicator: code.multiple_unit_indicator || null,
            };

            return result;
          });
        } else {
          // Return single code without splitting
          return [
            {
              codeId: code.id,
              status: "ACTIVE",
              billing_record_type: code.billing_record_type || 1,
              serviceStartTime: subSelection?.serviceStartTime || null,
              serviceEndTime: subSelection?.serviceEndTime || null,
              numberOfUnits: subSelection?.numberOfUnits || 1,
              bilateralIndicator: subSelection?.bilateralIndicator || null,
              specialCircumstances: subSelection?.specialCircumstances || null,
              serviceDate: codeServiceDateUTC,
              serviceEndDate: codeServiceEndDateUTC,
              locationOfService: subSelection?.locationOfService || "2",
              fee_determinant: code.fee_determinant || "A",
              multiple_unit_indicator: code.multiple_unit_indicator || null,
            },
          ];
        }
      });

      const serviceData = {
        physicianId,
        billingTypeId,
        patientId:
          currentPatient?.id === "scanned"
            ? null
            : currentPatient?.id || createPatientMutation.data?.id,
        referringPhysicianId: selectedReferringPhysician?.id || null,
        serviceDate: serviceDateUTC,
        serviceLocation:
          selectedBillingCodes.length > 0 ? serviceLocation : null,
        icdCodeId: selectedICDCode?.id,
        summary: `Service created ${
          scannedData ? "from camera scan" : "manually"
        } - ${currentPatient?.firstName || patientData?.firstName} ${
          currentPatient?.lastName || patientData?.lastName
        }`,
        serviceStatus: "OPEN",
        billingCodes: billingCodesData,
      };

      // If we have scanned data and the patient doesn't exist, create the patient first
      if (scannedData && currentPatient?.id === "scanned" && !existingPatient) {
        const newPatient = await createPatientMutation.mutateAsync(scannedData);
        serviceData.patientId = newPatient.id;
      }

      await createServiceMutation.mutateAsync(serviceData);

      // Clear scanned patient data from AsyncStorage to prevent re-triggering
      try {
        await AsyncStorage.removeItem("scannedPatientData");
      } catch (error) {
        console.error("Error clearing scanned patient data:", error);
      }

      // Clear all state after successful service creation
      clearAllState();

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
    if (
      code.start_time_required === "Y" ||
      code.stop_time_required === "Y" ||
      (code.multiple_unit_indicator === "U" &&
        code.billing_unit_type?.includes("MINUTES"))
    ) {
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
        locationOfService: null,
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
      case "patientSearch":
        return true; // Always allow proceeding to show patient selector
      case "patientCreation":
        return false; // This step is handled by PatientSelector
      case "billingCodes":
        return currentPatient !== null; // Need a patient selected
      case "referringPhysician":
        return selectedReferringPhysician !== null; // Need a referring physician selected
      case "serviceDate":
        return serviceDate.length > 0;
      case "serviceLocation":
        return serviceLocation.length > 0;
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
          <Text style={styles.fieldValue}>{patientData?.billingNumber}</Text>

          <Text style={styles.fieldLabel}>Name:</Text>
          <Text style={styles.fieldValue}>
            {patientData?.firstName} {patientData?.lastName}
          </Text>

          <Text style={styles.fieldLabel}>Date of Birth:</Text>
          <Text style={styles.fieldValue}>{patientData?.dateOfBirth}</Text>

          <Text style={styles.fieldLabel}>Gender:</Text>
          <Text style={styles.fieldValue}>{patientData?.gender}</Text>
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
            Searching for billing number: {patientData?.billingNumber}
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

  const renderPatientSearchStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Select Patient</Text>
      <Text style={styles.stepSubtitle}>
        Choose a patient from your existing patients or create a new one.
      </Text>

      {/* Patient Search Input */}
      <Card style={styles.card}>
        <Card.Content>
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

          {/* Patient Search Results */}
          {showPatientDropdown && patientSearchQuery.length > 0 && (
            <View style={styles.patientSearchResults}>
              {patientsLoading ? (
                <ActivityIndicator size="small" color="#2563eb" />
              ) : (
                <ScrollView
                  style={styles.patientSearchScroll}
                  nestedScrollEnabled
                >
                  {filteredPatients.length > 0 ? (
                    filteredPatients.map((patient) => (
                      <TouchableOpacity
                        key={patient.id}
                        style={styles.patientOption}
                        onPress={() => {
                          setSelectedPatient(patient);
                          setPatientSearchQuery(
                            `${patient.firstName} ${patient.lastName} (#${patient.billingNumber})`
                          );
                          setShowPatientDropdown(false);
                        }}
                      >
                        <Text style={styles.patientOptionText}>
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
                </ScrollView>
              )}
            </View>
          )}

          {/* Create New Patient Button */}
          <TouchableOpacity
            style={styles.createNewPatientButton}
            onPress={() => setIsCreatingPatient(true)}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
            <Text style={styles.createNewPatientButtonText}>
              Create New Patient
            </Text>
          </TouchableOpacity>

          {/* Selected Patient Display */}
          {currentPatient && (
            <View style={styles.selectedPatientContainer}>
              <Text style={styles.selectedPatientTitle}>Selected Patient:</Text>
              <Text style={styles.selectedPatientText}>
                {currentPatient.firstName} {currentPatient.lastName} (#
                {currentPatient.billingNumber})
              </Text>
              <Text style={styles.selectedPatientDetails}>
                {getPatientDescription(currentPatient)}
              </Text>
              {currentPatient.dateOfBirth && (
                <Text style={styles.selectedPatientBirthdate}>
                  DOB: {formatBirthdate(currentPatient.dateOfBirth)}
                </Text>
              )}
            </View>
          )}
        </Card.Content>
      </Card>

      {/* New Patient Creation Form */}
      {isCreatingPatient && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.createPatientTitle}>Create New Patient</Text>

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
                  onPress={() => {
                    setDatePickerStep("decade");
                    setShowDatePicker(true);
                    if (newPatient.dateOfBirth) {
                      const [year, month, day] = newPatient.dateOfBirth
                        .split("-")
                        .map(Number);
                      setSelectedYear(year);
                      setSelectedMonth(month - 1);
                      setSelectedDecade(Math.floor(year / 10) * 10);
                      setSelectedCalendarDate(new Date(year, month - 1, day));
                    }
                  }}
                >
                  <Text
                    style={
                      newPatient.dateOfBirth
                        ? styles.dateInputText
                        : styles.placeholderText
                    }
                  >
                    {newPatient.dateOfBirth
                      ? formatFullDate(newPatient.dateOfBirth)
                      : "Date of Birth *"}
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
                      color={newPatient.sex === "M" ? "#ffffff" : "#6b7280"}
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
                      color={newPatient.sex === "F" ? "#ffffff" : "#6b7280"}
                    />
                  </TouchableOpacity>
                </View>
                {newPatientErrors.sex && (
                  <Text style={styles.errorText}>Please select a gender</Text>
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
                const numericText = text.replace(/[^0-9]/g, "").slice(0, 9);
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
              <Text style={styles.errorText}>Billing number is required</Text>
            )}
            {newPatientErrors.billingNumberCheckDigit && (
              <Text style={styles.errorText}>
                Billing number check digit is invalid
              </Text>
            )}
            {newPatientErrors.billingNumberDuplicate && (
              <View style={styles.duplicatePatientContainer}>
                <Text style={styles.errorText}>
                  A patient with this billing number already exists in your
                  patient list
                </Text>
                {duplicatePatient && (
                  <View style={styles.duplicatePatientCard}>
                    <Text style={styles.duplicatePatientTitle}>
                      Existing Patient Found:
                    </Text>
                    <Text style={styles.duplicatePatientName}>
                      {duplicatePatient.firstName} {duplicatePatient.lastName}
                      {duplicatePatient.middleInitial &&
                        ` ${duplicatePatient.middleInitial}`}
                    </Text>
                    <Text style={styles.duplicatePatientDetails}>
                      DOB: {formatFullDate(duplicatePatient.dateOfBirth)} | Sex:{" "}
                      {duplicatePatient.sex}
                    </Text>
                    <TouchableOpacity
                      style={styles.selectDuplicateButton}
                      onPress={() => {
                        setSelectedPatient(duplicatePatient);
                        setPatientSearchQuery(
                          `${duplicatePatient.firstName} ${duplicatePatient.lastName} (#${duplicatePatient.billingNumber})`
                        );
                        setIsCreatingPatient(false);
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
                      }}
                    >
                      <Text style={styles.selectDuplicateButtonText}>
                        Use This Patient
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            <View style={styles.createPatientButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.createPatientButton,
                  !isNewPatientFormValid() && styles.disabledButton,
                ]}
                onPress={handleCreateNewPatient}
                disabled={
                  !isNewPatientFormValid() || createNewPatientMutation.isPending
                }
              >
                {createNewPatientMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createPatientButtonText}>
                    Create Patient
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.backToSearchButton}
                onPress={() => setIsCreatingPatient(false)}
              >
                <Text style={styles.backToSearchButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
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
                      locationOfService: null,
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

  const renderReferringPhysicianStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Referring Physician (Required)</Text>
      <Text style={styles.stepSubtitle}>
        Search and select a referring physician for this service
      </Text>

      <Card style={styles.card}>
        <Card.Content>
          <TextInput
            label="Search Referring Physician"
            value={referringPhysicianSearchQuery}
            onChangeText={setReferringPhysicianSearchQuery}
            mode="outlined"
            style={styles.input}
            placeholder="Search by name, specialty, or code..."
          />
        </Card.Content>
      </Card>

      {selectedReferringPhysician ? (
        <Card style={styles.card}>
          <Card.Content>
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
              <TouchableOpacity
                onPress={() => setSelectedReferringPhysician(null)}
              >
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>
      ) : isSearchingReferringPhysician ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#2563eb" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : referringPhysicianSearchResults.length > 0 ? (
        <ScrollView style={styles.resultsContainer}>
          {referringPhysicianSearchResults.map((physician) => (
            <TouchableOpacity
              key={physician.id}
              style={styles.resultItem}
              onPress={() => {
                setSelectedReferringPhysician(physician);
                setReferringPhysicianSearchQuery("");
              }}
            >
              <Text style={styles.resultItemText}>
                {physician.name} - {physician.specialty} ({physician.code})
              </Text>
              <Text style={styles.resultItemSubtext}>{physician.location}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : referringPhysicianSearchQuery.trim() ? (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.noResultsText}>
              No referring physicians found. Try a different search term.
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.infoText}>
              Start typing to search for referring physicians
            </Text>
          </Card.Content>
        </Card>
      )}
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
            {currentPatient?.firstName || patientData?.firstName}{" "}
            {currentPatient?.lastName || patientData?.lastName}
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

          {selectedReferringPhysician && (
            <>
              <Text style={styles.fieldLabel}>Referring Physician:</Text>
              <Text style={styles.fieldValue}>
                {selectedReferringPhysician.name} -{" "}
                {selectedReferringPhysician.specialty} (
                {selectedReferringPhysician.code})
              </Text>
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
      case "patientSearch":
        return renderPatientSearchStep();
      case "patientCreation":
        return null; // Handled by PatientSelector modal
      case "billingCodes":
        return renderBillingCodesStep();
      case "referringPhysician":
        return renderReferringPhysicianStep();
      case "serviceDate":
        return renderServiceDateStep();
      case "serviceLocation":
        return renderServiceLocationStep();
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
        physician={physician}
      />

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
                      generateMonths().find((m) => m.value === selectedMonth)
                        ?.label
                    } ${selectedYear})`}
                </Text>
                {datePickerStep !== "decade" && <View style={{ width: 20 }} />}
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
                              isSameDate(dayData.date, selectedCalendarDate) &&
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
                        Selected: {selectedCalendarDate.toLocaleDateString()}
                      </Text>
                    </View>
                  )}

                  {/* Confirm Button */}
                  {selectedCalendarDate && (
                    <TouchableOpacity
                      style={styles.confirmButton}
                      onPress={handleCalendarConfirm}
                    >
                      <Text style={styles.confirmButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  // Patient search step styles
  selectedPatientContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "#e8f5e8",
    borderRadius: 12,
  },
  selectedPatientTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2e7d32",
    marginBottom: 8,
  },
  selectedPatientText: {
    fontSize: 16,
    color: "#333",
  },
  selectedPatientDetails: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  selectedPatientBirthdate: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  // Inline patient search styles
  patientSearchResults: {
    maxHeight: 200,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginTop: 8,
  },
  patientSearchScroll: {
    maxHeight: 200,
  },
  patientOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  patientOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  createNewPatientButton: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  createNewPatientButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  createPatientTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  createPatientButtonContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  backToSearchButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#6b7280",
    alignItems: "center",
    justifyContent: "center",
  },
  backToSearchButtonText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
  selectDuplicateButton: {
    backgroundColor: "#f59e0b",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  selectDuplicateButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  noResultsText: {
    textAlign: "center",
    color: "#6b7280",
    fontSize: 16,
    padding: 20,
  },
  dateGenderRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
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
  inputError: {
    borderColor: "#ef4444",
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
  // Date picker styles (from ServiceFormScreen)
  stepPickerContainer: {
    maxHeight: 500,
  },
  stepHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  stepScrollView: {
    maxHeight: 300,
  },
  stepOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
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
    textAlign: "center",
  },
  selectedStepOptionText: {
    color: "#2563eb",
    fontWeight: "600",
  },
  calendarDaysHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  calendarDayHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
    width: 40,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    padding: 8,
  },
  calendarDay: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },
  selectedCalendarDay: {
    backgroundColor: "#2563eb",
  },
  emptyCalendarDay: {
    backgroundColor: "transparent",
  },
  futureCalendarDay: {
    backgroundColor: "#f3f4f6",
  },
  calendarDayText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  selectedCalendarDayText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  futureCalendarDayText: {
    color: "#9ca3af",
  },
  selectedDateContainer: {
    padding: 16,
    backgroundColor: "#f0f9ff",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    alignItems: "center",
  },
  selectedDateText: {
    fontSize: 16,
    color: "#0369a1",
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: "#059669",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
    margin: 16,
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Additional modal styles for date picker
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
  // Referring physician step styles
  selectedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#2196f3",
  },
  selectedItemContent: {
    flex: 1,
  },
  selectedItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  selectedItemSubtext: {
    fontSize: 14,
    color: "#666",
  },
  resultsContainer: {
    maxHeight: 400,
  },
  resultItem: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  resultItemText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  resultItemSubtext: {
    fontSize: 14,
    color: "#666",
  },
});

export default ServiceCreationModal;
