import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  billingCodesAPI,
  patientsAPI,
  physiciansAPI,
  servicesAPI,
} from "../services/api";
import { BillingCode, Service, ServiceCodeChangeLog } from "../types";
import { formatFullDate, formatRelativeDate } from "../utils/dateUtils";

const ServicesScreen = ({ navigation }: any) => {
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "OPEN" | "PENDING" | "OPEN_PENDING" | "BILLED_TODAY"
  >("OPEN");
  const [sortBy, setSortBy] = useState<
    | "lastNameAsc"
    | "lastNameDesc"
    | "firstNameAsc"
    | "firstNameDesc"
    | "admitDateAsc"
    | "admitDateDesc"
  >("lastNameAsc");
  const [showSearch, setShowSearch] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDischargeModal, setShowDischargeModal] = useState(false);
  const [dischargeDate, setDischargeDate] = useState("");
  const [pendingDischargeService, setPendingDischargeService] =
    useState<Service | null>(null);
  // Rounding modal state
  const [showRoundingModal, setShowRoundingModal] = useState(false);
  const [roundingDate, setRoundingDate] = useState("");
  const [pendingRoundingService, setPendingRoundingService] =
    useState<Service | null>(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [suggestionsForService, setSuggestionsForService] =
    useState<Service | null>(null);
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
  }

  const [selectedCodes, setSelectedCodes] = useState<BillingCode[]>([]);
  const [codeSubSelections, setCodeSubSelections] = useState<
    CodeSubSelection[]
  >([]);
  const [showSubSelectionModal, setShowSubSelectionModal] = useState(false);
  const [currentCodeForSubSelection, setCurrentCodeForSubSelection] =
    useState<BillingCode | null>(null);

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

  // Function to refetch a specific service with all its fields
  const refetchService = async (serviceId: string) => {
    try {
      // Force a refetch to update the UI with the latest data
      refetch();
    } catch (error) {
      console.error("Error refetching service:", error);
    }
  };

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

  // Helper function to check if a service was billed today
  const isBilledToday = (service: Service): boolean => {
    const today = new Date().toISOString().split("T")[0];

    // Check for type 57 billing codes with roundingDate being today
    const hasType57BilledToday = service.serviceCodes.some((serviceCode) => {
      const billingCode = serviceCode.billingCode;
      if (billingCode.billing_record_type === 57) {
        // Check if there's a change log with roundingDate being today
        return (
          serviceCode.changeLogs?.some((log) => {
            if (log.changeType === "ROUND" && log.roundingDate) {
              // Convert the ISO datetime string to date only for comparison
              const roundingDateOnly = new Date(log.roundingDate)
                .toISOString()
                .split("T")[0];
              return roundingDateOnly === today;
            }
            return false;
          }) || false
        );
      }
      return false;
    });

    // Check for non-type 57 codes with service date being today
    const hasNonType57BilledToday = service.serviceCodes.some((serviceCode) => {
      const billingCode = serviceCode.billingCode;
      if (billingCode.billing_record_type !== 57) {
        if (serviceCode.serviceDate) {
          // Convert the service date to date only for comparison
          const serviceDateOnly = new Date(serviceCode.serviceDate)
            .toISOString()
            .split("T")[0];
          return serviceDateOnly === today;
        }
      }
      return false;
    });

    return hasType57BilledToday || hasNonType57BilledToday;
  };

  // Helper function to get non-type57 codes billed for today
  const getNonType57CodesBilledToday = (service: Service): BillingCode[] => {
    const today = new Date().toISOString().split("T")[0];

    return service.serviceCodes
      .filter((serviceCode) => {
        const billingCode = serviceCode.billingCode;
        if (billingCode.billing_record_type !== 57) {
          if (serviceCode.serviceDate) {
            // Convert the service date to date only for comparison
            const serviceDateOnly = new Date(serviceCode.serviceDate)
              .toISOString()
              .split("T")[0];
            return serviceDateOnly === today;
          }
        }
        return false;
      })
      .map((serviceCode) => serviceCode.billingCode);
  };

  // Helper function to sort services
  const sortServices = (services: Service[], sortBy: string): Service[] => {
    const sorted = [...services];

    switch (sortBy) {
      case "lastNameAsc":
        return sorted.sort((a, b) =>
          a.patient.lastName.localeCompare(b.patient.lastName)
        );
      case "lastNameDesc":
        return sorted.sort((a, b) =>
          b.patient.lastName.localeCompare(a.patient.lastName)
        );
      case "firstNameAsc":
        return sorted.sort((a, b) =>
          a.patient.firstName.localeCompare(b.patient.firstName)
        );
      case "firstNameDesc":
        return sorted.sort((a, b) =>
          b.patient.firstName.localeCompare(a.patient.firstName)
        );
      case "admitDateAsc":
        return sorted.sort(
          (a, b) =>
            new Date(a.serviceDate).getTime() -
            new Date(b.serviceDate).getTime()
        );
      case "admitDateDesc":
        return sorted.sort(
          (a, b) =>
            new Date(b.serviceDate).getTime() -
            new Date(a.serviceDate).getTime()
        );
      default:
        return sorted;
    }
  };

  useEffect(() => {
    if (services) {
      let filtered = [...services];

      // Filter out services with claims by default
      filtered = filtered.filter((service) => service.claimId === null);

      // Filter out services without patient data
      filtered = filtered.filter((service) => service.patient != null);

      // Filter by status based on statusFilter
      if (statusFilter === "OPEN_PENDING") {
        filtered = filtered.filter(
          (service) => service.status === "OPEN" || service.status === "PENDING"
        );
      } else if (statusFilter === "BILLED_TODAY") {
        filtered = filtered.filter((service) => isBilledToday(service));
      } else {
        filtered = filtered.filter(
          (service) => service.status === statusFilter
        );
      }

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

      // Apply sorting
      filtered = sortServices(filtered, sortBy);

      setFilteredServices(filtered);
    }
  }, [services, searchQuery, statusFilter, sortBy]);

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
            serviceDate: scannedData.serviceDate || getLocalYMD(new Date()),
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

  // Listen for navigation events to handle scanned data and service updates
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

      // Refetch services when returning from BillingCodeSearch to ensure data is up to date
      refetch();
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

    // Don't allow selection of services that don't match the current status filter
    const isValidStatus =
      statusFilter === "OPEN_PENDING"
        ? service.status === "OPEN" || service.status === "PENDING"
        : statusFilter === "BILLED_TODAY"
        ? isBilledToday(service)
        : service.status === statusFilter;

    if (!isValidStatus) {
      Alert.alert(
        "Error",
        `Cannot select service that doesn't match current filter`
      );
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

  const handleAddServiceCode = async (service: Service) => {
    // Get today's date in YYYY-MM-DD format
    const today = getLocalYMD(new Date());

    // Check for existing codes for today
    const todaysCodes = service.serviceCodes.filter((code) => {
      const codeDate = code.serviceDate
        ? normalizeToLocalYMD(code.serviceDate)
        : null;
      return codeDate === today;
    });

    // Build suggestions: previous patient codes (non-57) and physician frequent codes
    try {
      setSuggestionsForService(service);

      // 1) Previous patient codes (non-57) with last used date and payload of last occurrence
      const previousMap = new Map<
        number,
        {
          billingCode: BillingCode;
          lastUsedDate: string;
          lastServiceCodePayload: any;
        }
      >();

      services?.forEach((s) => {
        if (s.patient?.id !== service.patient?.id) return;
        s.serviceCodes.forEach((sc) => {
          const code = sc.billingCode;
          if (!code || code.billing_record_type === 57) return; // exclude type 57
          const scDate = sc.serviceDate || s.serviceDate;
          const dateStr = scDate ? normalizeToLocalYMD(scDate) : today;
          const existing = previousMap.get(code.id);
          if (
            !existing ||
            new Date(dateStr) > new Date(existing.lastUsedDate)
          ) {
            previousMap.set(code.id, {
              billingCode: code,
              lastUsedDate: dateStr,
              lastServiceCodePayload: {
                codeId: code.id,
                serviceStartTime: sc.serviceStartTime,
                serviceEndTime: sc.serviceEndTime,
                serviceDate: today, // override with today
                serviceEndDate: null,
                bilateralIndicator: sc.bilateralIndicator,
                numberOfUnits: sc.numberOfUnits ?? 1,
                specialCircumstances: sc.specialCircumstances,
              },
            });
          }
        });
      });

      const previousList = Array.from(previousMap.values()).sort(
        (a, b) =>
          new Date(b.lastUsedDate).getTime() -
          new Date(a.lastUsedDate).getTime()
      );
      setPatientPreviousCodes(previousList);

      // 2) Physician frequent codes from profile, exclude any present in previousList
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

      // console.warn(frequent);

      const previousIds = new Set(previousList.map((p) => p.billingCode.id));
      const filteredFrequent = frequent.filter((c) => !previousIds.has(c.id));
      setPhysicianFrequentCodes(filteredFrequent);

      setShowSuggestionsModal(true);
    } catch (e) {
      console.error("Error preparing suggestions:", e);
      // fallback to search screen
      navigation.navigate("BillingCodeSearch", {
        onSelect: async (
          selectedCodes: BillingCode[],
          subSelections?: any[]
        ) => {
          try {
            const duplicateCodes = selectedCodes.filter((selectedCode) =>
              todaysCodes.some(
                (existingCode) =>
                  existingCode.billingCode.id === selectedCode.id
              )
            );

            if (duplicateCodes.length > 0) {
              const duplicateNames = duplicateCodes
                .map((code) => code.code)
                .join(", ");
              Alert.alert(
                "Duplicate Codes Detected",
                `The following codes have already been added today: ${duplicateNames}. Do you want to continue?`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Continue",
                    onPress: () =>
                      addCodesToService(service, selectedCodes, subSelections),
                  },
                ]
              );
            } else {
              await addCodesToService(service, selectedCodes, subSelections);
            }
          } catch (error) {
            console.error("Error adding service codes:", error);
            Alert.alert(
              "Error",
              "Failed to add service codes. Please try again."
            );
          }
        },
        existingCodes: todaysCodes.map((code) => code.billingCode),
        serviceDate: today,
      });
    }
  };

  const addCodesToService = async (
    service: Service,
    selectedCodes: BillingCode[],
    subSelections?: any[]
  ) => {
    try {
      const today = getLocalYMD(new Date());

      // Enforce service date for all non-type 57 codes
      const missingDates = selectedCodes.filter((code) => {
        if (code.billing_record_type === 57) return false;
        const sub = subSelections?.find((s) => s.codeId === code.id);
        return !sub?.serviceDate;
      });

      if (missingDates.length > 0) {
        const codeNames = missingDates.map((c) => c.code).join(", ");
        Alert.alert(
          "Service Date Required",
          `The following codes require a service date: ${codeNames}. Please configure all codes before adding.`
        );
        return;
      }

      const billingCodesData = selectedCodes.map((code) => {
        const subSelection = subSelections?.find((s) => s.codeId === code.id);
        return {
          codeId: code.id,
          serviceStartTime: subSelection?.serviceStartTime || null,
          serviceEndTime: subSelection?.serviceEndTime || null,
          serviceDate: subSelection?.serviceDate || null,
          serviceEndDate: subSelection?.serviceEndDate || null,
          bilateralIndicator: subSelection?.bilateralIndicator || null,
          numberOfUnits: subSelection?.numberOfUnits || 1,
          specialCircumstances: subSelection?.specialCircumstances || null,
          // serviceLocation and locationOfService will be determined by the backend according to the rules
        };
      });

      await servicesAPI.addServiceCodes(service.id, billingCodesData);

      Alert.alert("Success", "Service codes added successfully!");
      // Refetch all services to ensure the UI is updated with the latest data
      await refetch();
    } catch (error) {
      console.error("Error adding service codes:", error);
      Alert.alert("Error", "Failed to add service codes. Please try again.");
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
        Alert.alert("Success", "Submission created successfully!");
        setSelectedServices([]);
        refetch();
      } else {
        Alert.alert("Error", "Failed to create submission");
      }
    } catch (error) {
      console.error("Error creating claim:", error);
      Alert.alert("Error", "Failed to create submission");
    }
  };

  const handleDischarge = async (service: Service) => {
    // Check if service has type 57 codes
    const type57Codes = service.serviceCodes.filter(
      (code) => code.billingCode.billing_record_type === 57
    );

    // if (type57Codes.length === 0) {
    //   Alert.alert(
    //     "No Type 57 Codes",
    //     "This service does not contain any type 57 codes that require discharge."
    //   );
    //   return;
    // }

    // Set today's date as default discharge date
    const today = getLocalYMD(new Date());
    setDischargeDate(today);
    setPendingDischargeService(service);
    setShowDischargeModal(true);
  };

  const handleConfirmDischarge = async () => {
    if (!pendingDischargeService || !dischargeDate) {
      Alert.alert("Error", "Missing discharge information");
      return;
    }

    try {
      await servicesAPI.discharge(pendingDischargeService.id, dischargeDate);
      Alert.alert("Success", "Service discharged successfully!");
      setShowDischargeModal(false);
      setDischargeDate("");
      setPendingDischargeService(null);
      // Refetch the specific service to get updated data
      await refetchService(pendingDischargeService.id);
    } catch (error) {
      console.error("Error discharging service:", error);
      Alert.alert("Error", "Failed to discharge service. Please try again.");
    }
  };
  // Function to check if service has been rounded
  const hasRounding = (service: Service): boolean => {
    return service.serviceCodes.some((serviceCode) =>
      serviceCode.changeLogs.some(
        (log) => log.changeType === "ROUND" && log.roundingDate
      )
    );
  };

  // Function to get the most recent rounding information
  const getRoundingInfo = (service: Service): string | null => {
    let mostRecentRounding: ServiceCodeChangeLog | null = null;

    for (const serviceCode of service.serviceCodes) {
      for (const log of serviceCode.changeLogs) {
        if (log.changeType === "ROUND" && log.roundingDate) {
          if (
            !mostRecentRounding ||
            new Date(log.roundingDate) >
              new Date(mostRecentRounding.roundingDate!)
          ) {
            mostRecentRounding = log;
          }
        }
      }
    }

    if (!mostRecentRounding || !mostRecentRounding.roundingDate) return null;

    // Treat rounding date as local date to avoid timezone issues
    const roundingDateStr = normalizeToLocalYMD(
      mostRecentRounding.roundingDate
    );
    const nowDateStr = getLocalYMD(new Date());
    if (roundingDateStr === nowDateStr) {
      // Today
      return "Rounded Today";
    } else {
      // Calculate days difference for other cases
      // Parse the rounding date string as local date to avoid timezone issues
      const [year, month, day] = roundingDateStr.split("-").map(Number);
      const roundingDate = new Date(year, month - 1, day);
      const now = new Date();

      const diffTime = Math.abs(now.getTime() - roundingDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 7) {
        // Within last 6 days, show day name
        const dayNames = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        return `Rounded on ${dayNames[roundingDate.getDay()]}`;
      } else {
        // 7 or more days, show date
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
        return `Rounded on ${
          monthNames[roundingDate.getMonth()]
        } ${roundingDate.getDate()}`;
      }
    }
  };

  // Function to determine if rounding has happened today (device's local timezone)
  const isRoundedToday = (service: Service): boolean => {
    let mostRecentRounding: ServiceCodeChangeLog | null = null;

    for (const serviceCode of service.serviceCodes) {
      for (const log of serviceCode.changeLogs) {
        if (log.changeType === "ROUND" && log.roundingDate) {
          if (
            !mostRecentRounding ||
            new Date(log.roundingDate) >
              new Date(mostRecentRounding.roundingDate!)
          ) {
            mostRecentRounding = log;
          }
        }
      }
    }

    if (!mostRecentRounding || !mostRecentRounding.roundingDate) return false;

    // Treat rounding date as local date to avoid timezone issues
    const roundingDateStr = normalizeToLocalYMD(
      mostRecentRounding.roundingDate
    );
    const nowDateStr = getLocalYMD(new Date());

    return roundingDateStr === nowDateStr;
  };

  // Helpers to ignore timezone and treat stored dates as local dates
  const getLocalYMD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Inline helpers copied from BillingCodeSearchScreen to determine extra selections
  const isType57CodeInline = (code: BillingCode) =>
    code.billing_record_type === 57;
  const isWorXSectionInline = (code: BillingCode) =>
    code.section.code === "W" || code.section.code === "X";
  const isHSectionInline = (code: BillingCode) => code.section.code === "H";
  const requiresExtraSelectionsInline = (code: BillingCode): boolean => {
    if (!isType57CodeInline(code)) return true; // all non-57 need date at least
    if (code.multiple_unit_indicator === "U") return true;
    if (code.start_time_required === "Y" || code.stop_time_required === "Y")
      return true;
    if (code.title.includes("Bilateral")) return true;
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

  // Use the imported formatRelativeDate function from dateUtils
  // The local function is now replaced by the utility function

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
        // If no current date, start with today
        onChangeText(getLocalYMD(new Date()));
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
        // If parsing fails, default to today
        onChangeText(getLocalYMD(new Date()));
      }
    };

    const getDisplayValue = () => {
      if (!value) return "";

      const today = getLocalYMD(new Date());
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
      // If user types "Today", set to today's date
      if (text.toLowerCase() === "today") {
        onChangeText(getLocalYMD(new Date()));
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
            style={styles.dateInput}
            placeholder={placeholder}
            value={getDisplayValue()}
            onChangeText={handleTextChange}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.dateNavButton,
            getLocalYMD(new Date()) === value ? styles.disabledButton : null,
          ]}
          onPress={() => navigateDate("next")}
          disabled={getLocalYMD(new Date()) === value}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={getLocalYMD(new Date()) === value ? "#9ca3af" : "#6b7280"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderService = (service: Service) => {
    const isSelected = selectedServices.includes(service.id);
    const hasClaim = service.claimId !== null;
    const hasPendingStatus = service.status === "PENDING";
    const hasBeenRounded = hasRounding(service);
    const roundingInfo = getRoundingInfo(service);

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

    // Use the imported formatFullDate function from dateUtils
    // The local formatServiceDate function is now replaced by the utility function

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
                  {formatFullDate(service.serviceDate)}
                </Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      (hasPendingStatus || isRoundedToday(service)) &&
                        styles.actionButtonDisabled,
                    ]}
                    onPress={() => {
                      if (hasPendingStatus || isRoundedToday(service)) return;
                      // Open rounding modal and default date to today
                      const today = getLocalYMD(new Date());
                      setRoundingDate(today);
                      setPendingRoundingService(service);
                      setShowRoundingModal(true);
                    }}
                  >
                    <Ionicons
                      name="repeat"
                      size={20}
                      color={
                        hasPendingStatus || isRoundedToday(service)
                          ? "#9ca3af"
                          : "#2563eb"
                      }
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      hasPendingStatus && styles.actionButtonDisabled,
                    ]}
                    onPress={() => {
                      if (hasPendingStatus) return;
                      handleAddServiceCode(service);
                    }}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={hasPendingStatus ? "#9ca3af" : "#059669"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      hasPendingStatus && styles.actionButtonDisabled,
                    ]}
                    onPress={() => {
                      if (hasPendingStatus) return;
                      handleDischarge(service);
                    }}
                  >
                    <Ionicons
                      name="exit-outline"
                      size={20}
                      color={hasPendingStatus ? "#9ca3af" : "#dc2626"}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {service.icdCode && (
              <View style={styles.icdCode}>
                <Text style={styles.icdText}>
                  {service.icdCode.description}
                </Text>
              </View>
            )}
            {(roundingInfo ||
              getNonType57CodesBilledToday(service).length > 0) && (
              <View style={styles.roundingInfoContainer}>
                <View style={styles.roundingAndCodesRow}>
                  {roundingInfo ? (
                    <Text style={styles.roundingInfo}>{roundingInfo}</Text>
                  ) : (
                    <View style={styles.emptyRoundingInfo} />
                  )}
                  {(() => {
                    const nonType57CodesToday =
                      getNonType57CodesBilledToday(service);
                    if (nonType57CodesToday.length > 0) {
                      return (
                        <View style={styles.nonType57CodesList}>
                          {nonType57CodesToday.map((code, index) => (
                            <View
                              key={code.id}
                              style={styles.nonType57CodeChip}
                            >
                              <Text style={styles.nonType57CodeText}>
                                {code.code}
                              </Text>
                            </View>
                          ))}
                        </View>
                      );
                    }
                    return <View style={styles.emptyCodesList} />;
                  })()}
                </View>
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
          <Text style={styles.headerTitle}>Claims</Text>
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

      {/* Collapsible Filter Section */}
      <View style={styles.filterSection}>
        <View style={styles.filterSectionHeader}>
          <TouchableOpacity
            style={styles.filterSectionTitleContainer}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={styles.filterSectionTitle}>Search, Sort & Filter</Text>
            <Ionicons
              name={showFilters ? "chevron-up" : "chevron-down"}
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>
          {!showFilters &&
            (searchQuery ||
              statusFilter !== "OPEN" ||
              sortBy !== "lastNameAsc") && (
              <TouchableOpacity
                style={styles.clearFiltersButtonSmall}
                onPress={() => {
                  setSearchQuery("");
                  setStatusFilter("OPEN");
                  setSortBy("lastNameAsc");
                }}
              >
                <Ionicons name="close-circle" size={20} color="#ef4444" />
              </TouchableOpacity>
            )}
        </View>

        {showFilters && (
          <View style={styles.filterContent}>
            {/* Search Section */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Search</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by patient name, billing number, or ICD description..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Sort Section */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Sort By</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.sortOptions}
              >
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortBy === "lastNameAsc" && styles.sortButtonActive,
                  ]}
                  onPress={() => setSortBy("lastNameAsc")}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      sortBy === "lastNameAsc" && styles.sortButtonTextActive,
                    ]}
                  >
                    Last Name (A-Z)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortBy === "lastNameDesc" && styles.sortButtonActive,
                  ]}
                  onPress={() => setSortBy("lastNameDesc")}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      sortBy === "lastNameDesc" && styles.sortButtonTextActive,
                    ]}
                  >
                    Last Name (Z-A)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortBy === "firstNameAsc" && styles.sortButtonActive,
                  ]}
                  onPress={() => setSortBy("firstNameAsc")}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      sortBy === "firstNameAsc" && styles.sortButtonTextActive,
                    ]}
                  >
                    First Name (A-Z)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortBy === "firstNameDesc" && styles.sortButtonActive,
                  ]}
                  onPress={() => setSortBy("firstNameDesc")}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      sortBy === "firstNameDesc" && styles.sortButtonTextActive,
                    ]}
                  >
                    First Name (Z-A)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortBy === "admitDateAsc" && styles.sortButtonActive,
                  ]}
                  onPress={() => setSortBy("admitDateAsc")}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      sortBy === "admitDateAsc" && styles.sortButtonTextActive,
                    ]}
                  >
                    Admit Date (Oldest)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.sortButton,
                    sortBy === "admitDateDesc" && styles.sortButtonActive,
                  ]}
                  onPress={() => setSortBy("admitDateDesc")}
                >
                  <Text
                    style={[
                      styles.sortButtonText,
                      sortBy === "admitDateDesc" && styles.sortButtonTextActive,
                    ]}
                  >
                    Admit Date (Newest)
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Filter Section */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterGroupTitle}>Status Filter</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterOptions}
              >
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    statusFilter === "OPEN" && styles.filterButtonActive,
                  ]}
                  onPress={() => setStatusFilter("OPEN")}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      statusFilter === "OPEN" && styles.filterButtonTextActive,
                    ]}
                  >
                    Open
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    statusFilter === "PENDING" && styles.filterButtonActive,
                  ]}
                  onPress={() => setStatusFilter("PENDING")}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      statusFilter === "PENDING" &&
                        styles.filterButtonTextActive,
                    ]}
                  >
                    Pending
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    statusFilter === "OPEN_PENDING" &&
                      styles.filterButtonActive,
                  ]}
                  onPress={() => setStatusFilter("OPEN_PENDING")}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      statusFilter === "OPEN_PENDING" &&
                        styles.filterButtonTextActive,
                    ]}
                  >
                    Open/Pending
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterButton,
                    statusFilter === "BILLED_TODAY" &&
                      styles.filterButtonActive,
                  ]}
                  onPress={() => setStatusFilter("BILLED_TODAY")}
                >
                  <Text
                    style={[
                      styles.filterButtonText,
                      statusFilter === "BILLED_TODAY" &&
                        styles.filterButtonTextActive,
                    ]}
                  >
                    Billed Today
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Clear Filters Button */}
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setSearchQuery("");
                setStatusFilter("OPEN");
                setSortBy("lastNameAsc");
              }}
            >
              <Text style={styles.clearFiltersButtonText}>
                Clear All Filters
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {selectedServices.length > 0 && (
        <View style={styles.actionBar}>
          <Text style={styles.selectedCount}>
            {selectedServices.length} claim(s) selected
          </Text>
          <Button
            mode="contained"
            onPress={handleCreateClaim}
            style={styles.createClaimButton}
          >
            Create Submission
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
            <Text style={styles.loadingText}>Loading claims...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading claims</Text>
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
            <Text style={styles.emptyText}>No claims found.</Text>
          </View>
        )}
      </ScrollView>

      {/* Discharge Date Modal */}
      <Modal
        visible={showDischargeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDischargeModal(false);
          setDischargeDate("");
          setPendingDischargeService(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDischargeModal(false);
            setDischargeDate("");
            setPendingDischargeService(null);
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
                  setShowDischargeModal(false);
                  setDischargeDate("");
                  setPendingDischargeService(null);
                }}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalDescription}>
              Please set the discharge date for the last type 57 code in the
              service.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              value={dischargeDate}
              onChangeText={setDischargeDate}
              keyboardType="default"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDischargeModal(false);
                  setDischargeDate("");
                  setPendingDischargeService(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmDischarge}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Rounding Date Modal */}
      <Modal
        visible={showRoundingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowRoundingModal(false);
          setRoundingDate("");
          setPendingRoundingService(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowRoundingModal(false);
            setRoundingDate("");
            setPendingRoundingService(null);
          }}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Rounding Date</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowRoundingModal(false);
                  setRoundingDate("");
                  setPendingRoundingService(null);
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
                onPress={async () => {
                  if (!pendingRoundingService || !roundingDate) {
                    Alert.alert("Error", "Please enter a service date.");
                    return;
                  }
                  try {
                    const result = await servicesAPI.round(
                      pendingRoundingService.id,
                      roundingDate
                    );
                    Alert.alert("Success", result.message);
                    setShowRoundingModal(false);
                    setRoundingDate("");
                    setPendingRoundingService(null);
                    await refetchService(pendingRoundingService.id);
                  } catch (error) {
                    console.error("Error performing rounding:", error);
                    Alert.alert(
                      "Error",
                      "Failed to perform rounding. Please try again."
                    );
                  }
                }}
                style={styles.modalButton}
              >
                Confirm
              </Button>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Sub-selection Modal (same flow as BillingCodeSearchScreen) */}
      {currentCodeForSubSelection && (
        <Modal
          visible={showSubSelectionModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowSubSelectionModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  Configure {currentCodeForSubSelection.code}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowSubSelectionModal(false)}
                >
                  <Ionicons name="close" size={24} color="#6b7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.subSelectionScrollView}>
                {/* Service Date - Required for all codes except Type 57 */}
                {!isType57CodeInline(currentCodeForSubSelection) && (
                  <View style={styles.subSelectionSection}>
                    <Text style={styles.subSelectionSectionTitle}>
                      Service Date <Text style={styles.requiredText}>*</Text>
                    </Text>
                    <DateInputWithNavigation
                      value={
                        getSubSelectionForCodeInline(
                          currentCodeForSubSelection.id
                        )?.serviceDate || ""
                      }
                      onChangeText={(text) =>
                        handleUpdateSubSelectionInline(
                          currentCodeForSubSelection.id,
                          { serviceDate: text }
                        )
                      }
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                )}

                {/* Service Start/End Date - Only for Type 57 codes */}
                {isType57CodeInline(currentCodeForSubSelection) && (
                  <View style={styles.subSelectionSection}>
                    <Text style={styles.subSelectionSectionTitle}>
                      Service Dates
                    </Text>
                    <View style={styles.dateRow}>
                      <View style={styles.dateInputContainer}>
                        <Text style={styles.dateLabel}>Start Date</Text>
                        <TextInput
                          style={[styles.dateInput, styles.readOnlyInput]}
                          placeholder="YYYY-MM-DD"
                          value={
                            getSubSelectionForCodeInline(
                              currentCodeForSubSelection.id
                            )?.serviceDate || ""
                          }
                          editable={false}
                        />
                      </View>
                      <View style={styles.dateInputContainer}>
                        <Text style={styles.dateLabel}>End Date</Text>
                        <TextInput
                          style={[styles.dateInput, styles.readOnlyInput]}
                          placeholder="YYYY-MM-DD"
                          value={
                            getSubSelectionForCodeInline(
                              currentCodeForSubSelection.id
                            )?.serviceEndDate || ""
                          }
                          editable={false}
                        />
                      </View>
                    </View>
                    <Text style={styles.calculatedDateNote}>
                      Dates are automatically calculated based on service date
                      and previous codes
                    </Text>
                  </View>
                )}

                {/* Units - Only for codes with multiple_unit_indicator === "U" */}
                {currentCodeForSubSelection.multiple_unit_indicator === "U" && (
                  <View style={styles.subSelectionSection}>
                    <Text style={styles.subSelectionSectionTitle}>
                      Number of Units
                      {currentCodeForSubSelection.max_units && (
                        <Text style={styles.maxUnitsText}>
                          {" "}
                          (Max: {currentCodeForSubSelection.max_units})
                        </Text>
                      )}
                    </Text>
                    <View style={styles.unitsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.unitButton,
                          (getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.numberOfUnits || 1) <= 1
                            ? styles.disabledButton
                            : null,
                        ]}
                        onPress={() => {
                          const sub = getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          );
                          if (!sub) return;
                          if (sub.numberOfUnits > 1) {
                            handleUpdateSubSelectionInline(
                              currentCodeForSubSelection.id,
                              { numberOfUnits: sub.numberOfUnits - 1 }
                            );
                          }
                        }}
                        disabled={
                          (getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.numberOfUnits || 1) <= 1
                        }
                      >
                        <Text style={styles.unitButtonText}>-</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.unitsInput}
                        value={String(
                          getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.numberOfUnits || 1
                        )}
                        onChangeText={(text) => {
                          const value = parseInt(text) || 1;
                          const maxUnits =
                            currentCodeForSubSelection.max_units || value;
                          handleUpdateSubSelectionInline(
                            currentCodeForSubSelection.id,
                            { numberOfUnits: Math.min(value, maxUnits) }
                          );
                        }}
                        keyboardType="numeric"
                      />
                      <TouchableOpacity
                        style={[
                          styles.unitButton,
                          currentCodeForSubSelection.max_units &&
                          (getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.numberOfUnits || 1) >=
                            (currentCodeForSubSelection.max_units || 0)
                            ? styles.disabledButton
                            : null,
                        ]}
                        onPress={() => {
                          const sub = getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          );
                          if (!sub) return;
                          const maxUnits =
                            currentCodeForSubSelection.max_units ||
                            sub.numberOfUnits + 1;
                          handleUpdateSubSelectionInline(
                            currentCodeForSubSelection.id,
                            {
                              numberOfUnits: Math.min(
                                sub.numberOfUnits + 1,
                                maxUnits
                              ),
                            }
                          );
                        }}
                        disabled={
                          !!(
                            currentCodeForSubSelection.max_units &&
                            (getSubSelectionForCodeInline(
                              currentCodeForSubSelection.id
                            )?.numberOfUnits || 1) >=
                              (currentCodeForSubSelection.max_units || 0)
                          )
                        }
                      >
                        <Text style={styles.unitButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Service Start/End Time */}
                {(currentCodeForSubSelection.start_time_required === "Y" ||
                  currentCodeForSubSelection.stop_time_required === "Y") && (
                  <View style={styles.subSelectionSection}>
                    <Text style={styles.subSelectionSectionTitle}>
                      Service Times
                    </Text>
                    <View style={styles.timeRow}>
                      {currentCodeForSubSelection.start_time_required ===
                        "Y" && (
                        <View style={styles.timeInputContainer}>
                          <Text style={styles.timeLabel}>Start Time</Text>
                          <TextInput
                            style={styles.timeInput}
                            placeholder="HH:MM"
                            value={
                              getSubSelectionForCodeInline(
                                currentCodeForSubSelection.id
                              )?.serviceStartTime || ""
                            }
                            onChangeText={(text) =>
                              handleUpdateSubSelectionInline(
                                currentCodeForSubSelection.id,
                                { serviceStartTime: text }
                              )
                            }
                          />
                        </View>
                      )}
                      {currentCodeForSubSelection.stop_time_required ===
                        "Y" && (
                        <View style={styles.timeInputContainer}>
                          <Text style={styles.timeLabel}>End Time</Text>
                          <TextInput
                            style={styles.timeInput}
                            placeholder="HH:MM"
                            value={
                              getSubSelectionForCodeInline(
                                currentCodeForSubSelection.id
                              )?.serviceEndTime || ""
                            }
                            onChangeText={(text) =>
                              handleUpdateSubSelectionInline(
                                currentCodeForSubSelection.id,
                                { serviceEndTime: text }
                              )
                            }
                          />
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Bilateral Indicator - Only for codes with "Bilateral" in title */}
                {currentCodeForSubSelection.title.includes("Bilateral") && (
                  <View style={styles.subSelectionSection}>
                    <Text style={styles.subSelectionSectionTitle}>
                      Bilateral Indicator
                    </Text>
                    <View style={styles.bilateralContainer}>
                      <TouchableOpacity
                        style={[
                          styles.bilateralButton,
                          getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.bilateralIndicator === "L" &&
                            styles.selectedBilateralButton,
                        ]}
                        onPress={() =>
                          handleUpdateSubSelectionInline(
                            currentCodeForSubSelection.id,
                            {
                              bilateralIndicator:
                                getSubSelectionForCodeInline(
                                  currentCodeForSubSelection.id
                                )?.bilateralIndicator === "L"
                                  ? null
                                  : "L",
                            }
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.bilateralButtonText,
                            getSubSelectionForCodeInline(
                              currentCodeForSubSelection.id
                            )?.bilateralIndicator === "L" &&
                              styles.selectedBilateralButtonText,
                          ]}
                        >
                          Left
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.bilateralButton,
                          getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.bilateralIndicator === "R" &&
                            styles.selectedBilateralButton,
                        ]}
                        onPress={() =>
                          handleUpdateSubSelectionInline(
                            currentCodeForSubSelection.id,
                            {
                              bilateralIndicator:
                                getSubSelectionForCodeInline(
                                  currentCodeForSubSelection.id
                                )?.bilateralIndicator === "R"
                                  ? null
                                  : "R",
                            }
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.bilateralButtonText,
                            getSubSelectionForCodeInline(
                              currentCodeForSubSelection.id
                            )?.bilateralIndicator === "R" &&
                              styles.selectedBilateralButtonText,
                          ]}
                        >
                          Right
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.bilateralButton,
                          getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.bilateralIndicator === "B" &&
                            styles.selectedBilateralButton,
                        ]}
                        onPress={() =>
                          handleUpdateSubSelectionInline(
                            currentCodeForSubSelection.id,
                            {
                              bilateralIndicator:
                                getSubSelectionForCodeInline(
                                  currentCodeForSubSelection.id
                                )?.bilateralIndicator === "B"
                                  ? null
                                  : "B",
                            }
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.bilateralButtonText,
                            getSubSelectionForCodeInline(
                              currentCodeForSubSelection.id
                            )?.bilateralIndicator === "B" &&
                              styles.selectedBilateralButtonText,
                          ]}
                        >
                          Both
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Special Circumstances - W/X Section */}
                {isWorXSectionInline(currentCodeForSubSelection) && (
                  <View style={styles.subSelectionSection}>
                    <Text style={styles.subSelectionSectionTitle}>
                      Special Circumstances{" "}
                      <Text style={styles.requiredText}>*</Text>
                    </Text>
                    <View style={styles.specialCircumstancesContainer}>
                      <TouchableOpacity
                        style={[
                          styles.specialCircumstancesButton,
                          getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.specialCircumstances === "TF" &&
                            styles.selectedSpecialCircumstancesButton,
                        ]}
                        onPress={() =>
                          handleUpdateSubSelectionInline(
                            currentCodeForSubSelection.id,
                            { specialCircumstances: "TF" }
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.specialCircumstancesButtonText,
                            getSubSelectionForCodeInline(
                              currentCodeForSubSelection.id
                            )?.specialCircumstances === "TF" &&
                              styles.selectedSpecialCircumstancesButtonText,
                          ]}
                        >
                          Technical
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.specialCircumstancesButton,
                          getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.specialCircumstances === "PF" &&
                            styles.selectedSpecialCircumstancesButton,
                        ]}
                        onPress={() =>
                          handleUpdateSubSelectionInline(
                            currentCodeForSubSelection.id,
                            { specialCircumstances: "PF" }
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.specialCircumstancesButtonText,
                            getSubSelectionForCodeInline(
                              currentCodeForSubSelection.id
                            )?.specialCircumstances === "PF" &&
                              styles.selectedSpecialCircumstancesButtonText,
                          ]}
                        >
                          Interpretation
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.specialCircumstancesButton,
                          getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.specialCircumstances === "CF" &&
                            styles.selectedSpecialCircumstancesButton,
                        ]}
                        onPress={() =>
                          handleUpdateSubSelectionInline(
                            currentCodeForSubSelection.id,
                            { specialCircumstances: "CF" }
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.specialCircumstancesButtonText,
                            getSubSelectionForCodeInline(
                              currentCodeForSubSelection.id
                            )?.specialCircumstances === "CF" &&
                              styles.selectedSpecialCircumstancesButtonText,
                          ]}
                        >
                          Both
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Special Circumstances - H Section */}
                {isHSectionInline(currentCodeForSubSelection) && (
                  <View style={styles.subSelectionSection}>
                    <Text style={styles.subSelectionSectionTitle}>
                      Special Circumstances
                    </Text>
                    <View style={styles.specialCircumstancesContainer}>
                      <TouchableOpacity
                        style={[
                          styles.specialCircumstancesButton,
                          getSubSelectionForCodeInline(
                            currentCodeForSubSelection.id
                          )?.specialCircumstances === "TA" &&
                            styles.selectedSpecialCircumstancesButton,
                        ]}
                        onPress={() =>
                          handleUpdateSubSelectionInline(
                            currentCodeForSubSelection.id,
                            {
                              specialCircumstances:
                                getSubSelectionForCodeInline(
                                  currentCodeForSubSelection.id
                                )?.specialCircumstances === "TA"
                                  ? null
                                  : "TA",
                            }
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.specialCircumstancesButtonText,
                            getSubSelectionForCodeInline(
                              currentCodeForSubSelection.id
                            )?.specialCircumstances === "TA" &&
                              styles.selectedSpecialCircumstancesButtonText,
                          ]}
                        >
                          Takeover
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.modalButtonContainer}>
                <Button
                  mode="contained"
                  onPress={async () => {
                    if (!suggestionsForService || !currentCodeForSubSelection)
                      return;
                    try {
                      const subs = codeSubSelections;
                      await addCodesToService(
                        suggestionsForService,
                        selectedCodes,
                        subs
                      );
                      setShowSubSelectionModal(false);
                      setShowSuggestionsModal(false);
                    } catch (e) {
                      console.error("Error adding service code:", e);
                      Alert.alert("Error", "Failed to add service code.");
                    }
                  }}
                  style={styles.modalButton}
                >
                  Done
                </Button>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Suggestions Modal for adding codes */}
      <Modal
        visible={showSuggestionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuggestionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSuggestionsModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Service Code</Text>
              <TouchableOpacity onPress={() => setShowSuggestionsModal(false)}>
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
                          if (!suggestionsForService) return;
                          // Initialize selection and force sub-selection modal so user confirms/sets dates
                          setSelectedCodes([item.billingCode]);
                          setCodeSubSelections([
                            {
                              ...item.lastServiceCodePayload,
                              numberOfUnits:
                                item.lastServiceCodePayload.numberOfUnits ?? 1,
                            },
                          ]);
                          setCurrentCodeForSubSelection(item.billingCode);
                          setShowSubSelectionModal(true);
                        }}
                        onLongPress={() =>
                          Alert.alert(
                            item.billingCode.code,
                            `${
                              item.billingCode.title || ""
                            }\nLast billed ${formatRelativeDate(
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
                          if (!suggestionsForService) return;
                          try {
                            // Fetch full code details to ensure flags are present (use search to avoid 405 on /billing-codes/:id)
                            const matches = await billingCodesAPI.search(
                              code.code
                            );
                            const full =
                              matches.find((m) => m.id === code.id) ||
                              matches[0] ||
                              code;
                            const today = getLocalYMD(new Date());

                            // Initialize selection and sub-selection according to BillingCodeSearchScreen
                            setSelectedCodes([full]);

                            const isType57 = full.billing_record_type === 57;
                            const defaultServiceDate = !isType57 ? today : null;

                            setCodeSubSelections([
                              {
                                codeId: full.id,
                                serviceDate: defaultServiceDate,
                                serviceEndDate: null,
                                bilateralIndicator: null,
                                serviceStartTime: null,
                                serviceEndTime: null,
                                numberOfUnits: 1,
                                specialCircumstances: null,
                              },
                            ]);

                            // If the code requires extra selections, open the modal
                            if (requiresExtraSelectionsInline(full)) {
                              setCurrentCodeForSubSelection(full);
                              setShowSubSelectionModal(true);
                            } else {
                              // If no extra selections, save immediately
                              await addCodesToService(
                                suggestionsForService,
                                [full],
                                codeSubSelections
                              );
                              setShowSuggestionsModal(false);
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
                    setShowSuggestionsModal(false);
                    const today = getLocalYMD(new Date());
                    if (suggestionsForService) {
                      const todaysCodes =
                        suggestionsForService.serviceCodes.filter((code) => {
                          const codeDate = code.serviceDate
                            ? normalizeToLocalYMD(code.serviceDate)
                            : null;
                          return codeDate === today;
                        });
                      navigation.navigate("BillingCodeSearch", {
                        onSelect: async (
                          selectedCodes: BillingCode[],
                          subSelections?: any[]
                        ) => {
                          try {
                            await addCodesToService(
                              suggestionsForService,
                              selectedCodes,
                              subSelections
                            );
                          } catch (error) {
                            console.error("Error adding service codes:", error);
                            Alert.alert(
                              "Error",
                              "Failed to add service codes. Please try again."
                            );
                          }
                        },
                        existingCodes: todaysCodes.map(
                          (code) => code.billingCode
                        ),
                        serviceDate: today,
                      });
                    }
                  }}
                >
                  <Text style={styles.cancelButtonText}>Other</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    marginTop: 12,
  },
  searchHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  searchToggle: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  searchToggleText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
    marginLeft: 6,
  },
  filterContainer: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterToggle: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  filterButtonTextActive: {
    color: "#2563eb",
    fontWeight: "600",
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
  roundingInfoContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  roundingAndCodesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  roundingInfo: {
    fontSize: 12,
    color: "#059669",
    fontStyle: "italic",
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
  pendingChip: {
    backgroundColor: "#dbeafe",
  },
  todayBadge: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  todayChip: {
    backgroundColor: "#dcfce7",
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
  actionButtonDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#d1d5db",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    margin: 20,
    width: "90%",
    maxWidth: 400,
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
    color: "#1e293b",
  },
  modalDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#f3f4f6",
  },
  confirmButton: {
    backgroundColor: "#dc2626",
  },
  cancelButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Sub-selection modal styles
  subSelectionScrollView: {
    padding: 20,
  },
  subSelectionSection: {
    marginBottom: 16,
  },
  subSelectionSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  requiredText: {
    color: "#ef4444",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#ffffff",
  },
  readOnlyInput: {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
  },
  calculatedDateNote: {
    fontSize: 12,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 8,
  },
  dateNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  unitsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  unitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    opacity: 0.5,
  },
  unitButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#374151",
  },
  maxUnitsText: {
    fontSize: 12,
    color: "#6b7280",
  },
  unitsInput: {
    width: 60,
    height: 40,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 8,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
    backgroundColor: "#ffffff",
  },
  timeRow: {
    flexDirection: "row",
    gap: 12,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
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
    gap: 8,
  },
  bilateralButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  selectedBilateralButton: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  bilateralButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedBilateralButtonText: {
    color: "#1e40af",
    fontWeight: "600",
  },
  specialCircumstancesContainer: {
    flexDirection: "row",
    gap: 8,
  },
  specialCircumstancesButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  selectedSpecialCircumstancesButton: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  specialCircumstancesButtonText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  selectedSpecialCircumstancesButtonText: {
    color: "#1e40af",
    fontWeight: "600",
  },
  modalButtonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  suggestionItem: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  suggestionItemBlue: {
    backgroundColor: "#93c5fd", // lighter blue
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  suggestionTitleDark: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
  suggestionSubtitleDark: {
    color: "#6b7280",
    fontSize: 12,
    marginTop: 2,
  },
  suggestionTitleLight: {
    color: "#1f2937",
    fontSize: 16,
    fontWeight: "600",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  pageButton: {
    backgroundColor: "#bfdbfe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pageButtonDisabled: {
    backgroundColor: "#e5e7eb",
  },
  pageButtonText: {
    color: "#1f2937",
    fontSize: 14,
    fontWeight: "600",
  },
  pageIndicator: {
    color: "#6b7280",
    fontSize: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    color: "#6b7280", // gray-500
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: "center",
  },
  dateInputWithNavigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  dateNavButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    marginHorizontal: 4,
  },
  dateInputCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  // New collapsible filter section styles
  filterSection: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  filterSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  filterSectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  filterContent: {
    padding: 16,
    paddingTop: 0,
  },
  filterGroup: {
    marginBottom: 20,
  },
  filterGroupTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  sortOptions: {
    flexDirection: "row",
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sortButtonActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#2563eb",
  },
  sortButtonText: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },
  sortButtonTextActive: {
    color: "#1e40af",
    fontWeight: "600",
  },
  filterOptions: {
    flexDirection: "row",
  },
  clearFiltersButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  clearFiltersButtonText: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  clearFiltersButtonSmall: {
    padding: 4,
    marginLeft: 8,
  },
  // Styles for non-type57 codes billed today display
  nonType57CodesList: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "flex-end",
    maxWidth: 180, // Constrain width to stay within card boundaries
  },
  nonType57CodeChip: {
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 2,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#0891b2",
  },
  nonType57CodeText: {
    fontSize: 12,
    color: "#0e7490",
    fontWeight: "500",
    textAlign: "center",
  },
  emptyRoundingInfo: {
    flex: 1,
  },
  emptyCodesList: {
    width: 0,
  },
});

export default ServicesScreen;
