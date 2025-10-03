"use client";

import { HybridDateInput } from "@/app/components/forms/HybridDateInput";
import Layout from "@/app/components/layout/Layout";
import { useToast } from "@/app/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatFullDate,
  isValidFlexibleDate,
  parseFlexibleDate,
} from "@/lib/dateUtils";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// Helper function to get today's date in local timezone (not UTC)
const getTodayLocalDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper function to group billing codes by code
const groupBillingCodesByCode = (
  billingCodes: any[],
  selectedCodes: BillingCode[],
  formData?: { serviceDate: string }
) => {
  const grouped: {
    [key: string]: {
      code: BillingCode;
      instances: Array<{ billingCode: any; index: number }>;
    };
  } = {};

  billingCodes.forEach((billingCode, index) => {
    const code = selectedCodes.find((c) => c.id === billingCode.codeId);
    if (code) {
      if (!grouped[code.code]) {
        grouped[code.code] = {
          code,
          instances: [],
        };
      }
      grouped[code.code].instances.push({ billingCode, index });
    }
  });

  // Sort instances by service date descending (most recent first)
  Object.values(grouped).forEach((group) => {
    group.instances.sort((a, b) => {
      const dateA = a.billingCode.serviceDate || formData?.serviceDate || "";
      const dateB = b.billingCode.serviceDate || formData?.serviceDate || "";
      // Descending order: most recent first
      return dateB.localeCompare(dateA);
    });
  });

  return grouped;
};

interface Physician {
  id: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  billingNumber: string;
  jurisdictionId: number;
  physicianBillingTypes: {
    billingTypeId: number;
    active: boolean;
  }[];
  healthInstitution?: {
    city: string;
  } | null;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  billingNumber: string;
  dateOfBirth: string;
  sex: string;
}

interface BillingCode {
  id: number;
  code: string;
  title: string;
  description: string | null;
  low_fee: number;
  high_fee: number;
  service_class: string | null;
  add_on_indicator: string | null;
  multiple_unit_indicator: string | null;
  fee_determinant: string;
  anaesthesia_indicator: string | null;
  submit_at_100_percent: string | null;
  referring_practitioner_required: string | null;
  start_time_required: string | null;
  stop_time_required: string | null;
  technical_fee: number | null;
  max_units: number | null;
  day_range: number | null;
  billing_record_type: number;
  section: {
    code: string;
    title: string;
  };
  billingCodeChains?: Array<{
    codeId: number;
    code: string;
    title: string;
    dayRange: number;
    rootId: number;
    previousCodeId: number | null;
    previousDayRange: number;
    cumulativeDayRange: number;
    prevPlusSelf: number;
    isLast: boolean;
  }>;
}

interface ICDCode {
  id: number;
  version: string;
  code: string;
  description: string;
}

interface ReferringPhysician {
  id: number;
  code: string;
  name: string;
  location: string;
  specialty: string;
}

interface ServiceErrors {
  physician: boolean;
  patient: boolean;
  billingCodes: boolean;
  serviceDate: boolean;
}

interface NewPatientErrors {
  billingNumber: boolean;
  dateOfBirth: boolean;
  sex: boolean;
  billingNumberCheckDigit: boolean;
  billingNumberDuplicate: boolean;
}

export default function ServiceForm({
  type,
  serviceId,
}: {
  type: "new" | "edit";
  serviceId?: string;
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [referringPhysicians, setReferringPhysicians] = useState<
    ReferringPhysician[]
  >([]);
  const [referringPhysicianSearchQuery, setReferringPhysicianSearchQuery] =
    useState("");
  const [referringPhysicianSearchResults, setReferringPhysicianSearchResults] =
    useState<ReferringPhysician[]>([]);
  const [isSearchingReferringPhysician, setIsSearchingReferringPhysician] =
    useState(false);
  const [selectedReferringPhysician, setSelectedReferringPhysician] =
    useState<ReferringPhysician | null>(null);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<BillingCode[]>([]);
  const [icdSearchQuery, setIcdSearchQuery] = useState("");
  const [icdSearchResults, setIcdSearchResults] = useState<ICDCode[]>([]);
  const [isSearchingIcd, setIsSearchingIcd] = useState(false);
  const [selectedIcdCode, setSelectedIcdCode] = useState<ICDCode | null>(null);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    billingNumber: "",
    dateOfBirth: "",
    sex: "",
  });

  const [formData, setFormData] = useState({
    physicianId: physicians.length === 1 ? physicians[0].id : "",
    billingTypeId:
      physicians.length === 1
        ? physicians[0].physicianBillingTypes.find((bt) => bt.active)
            ?.billingTypeId
        : 0,
    patientId: "",
    referringPhysicianId: null as number | null,
    icdCodeId: null as number | null,
    healthInstitutionId: null as number | null,
    summary: "",
    serviceDate: new Date().toISOString().split("T")[0],
    serviceLocation: null as string | null,
    locationOfService: null as string | null,
    status: "OPEN",
    billingCodes: [] as Array<{
      codeId: number;
      status: string;
      billing_record_type: number;
      serviceStartTime: string | null;
      serviceEndTime: string | null;
      numberOfUnits: number | null;
      bilateralIndicator: string | null;
      specialCircumstances: string | null;
      serviceDate: string | null;
      serviceEndDate: string | null;
    }>,
  });
  const [serviceErrors, setServiceErrors] = useState<ServiceErrors>({
    physician: false,
    patient: false,
    billingCodes: false,
    serviceDate: false,
  });

  const [newPatientErrors, setNewPatientErrors] = useState<NewPatientErrors>({
    billingNumber: false,
    dateOfBirth: false,
    sex: false,
    billingNumberCheckDigit: false,
    billingNumberDuplicate: false,
  });

  const [duplicatePatient, setDuplicatePatient] = useState<any>(null);

  // Add state for discharge date modal
  const [showDischargeDateModal, setShowDischargeDateModal] = useState(false);
  const [dischargeDate, setDischargeDate] = useState(getTodayLocalDate());
  const [pendingApproveAndFinish, setPendingApproveAndFinish] = useState(false);

  // Add state for active tab
  const [activeTab, setActiveTab] = useState<"type50" | "type57">("type50");

  // Load existing service data for editing
  useEffect(() => {
    const loadExistingService = async () => {
      if (type === "edit" && serviceId) {
        try {
          const response = await fetch(`/api/services/${serviceId}`);
          if (response.ok) {
            const service = await response.json();
            // Set form data with existing service data
            setFormData({
              physicianId: service.physicianId,
              patientId: service.patientId,
              billingTypeId: service.billingTypeId,
              referringPhysicianId: service.referringPhysicianId,
              icdCodeId: service.icdCodeId,
              healthInstitutionId: service.healthInstitutionId,
              summary: service.summary,
              status: service.serviceStatus,
              serviceDate: new Date(service.serviceDate)
                .toISOString()
                .split("T")[0],
              serviceLocation: service.serviceCodes[0]?.serviceLocation || null,
              locationOfService:
                service.serviceCodes[0]?.locationOfService || null,
              billingCodes: service.serviceCodes.map((sc: any) => ({
                codeId: sc.codeId,
                status: sc.status,
                billing_record_type: sc.billingCode.billing_record_type,
                serviceStartTime: sc.serviceStartTime
                  ? new Date(sc.serviceStartTime).toTimeString().slice(0, 5)
                  : null,
                serviceEndTime: sc.serviceEndTime
                  ? new Date(sc.serviceEndTime).toTimeString().slice(0, 5)
                  : null,
                numberOfUnits: sc.numberOfUnits,
                bilateralIndicator: sc.bilateralIndicator,
                specialCircumstances: sc.specialCircumstances,
                serviceDate: sc.serviceDate
                  ? new Date(sc.serviceDate).toISOString().split("T")[0]
                  : null,
                serviceEndDate: sc.serviceEndDate
                  ? new Date(sc.serviceEndDate).toISOString().split("T")[0]
                  : null,
              })),
            });

            // Set selected codes
            setSelectedCodes(
              service.serviceCodes.map((sc: any) => sc.billingCode)
            );

            // Set selected ICD code if exists
            if (service.icdCode) {
              setSelectedIcdCode(service.icdCode);
            }

            // Set selected referring physician if exists
            if (service.referringPhysician) {
              setSelectedReferringPhysician(service.referringPhysician);
            }
          }
        } catch (error) {
          console.error("Error loading existing service:", error);
        }
      }
    };

    loadExistingService();
  }, [type, serviceId]);

  // Auto-select appropriate tab when codes change
  useEffect(() => {
    if (selectedCodes.length === 0) {
      setActiveTab("type50");
      return;
    }

    const hasType50 = selectedCodes.some(
      (code) => code.billing_record_type === 50
    );
    const hasType57 = selectedCodes.some(
      (code) => code.billing_record_type === 57
    );

    // If current active tab has no codes, switch to the other tab
    if (activeTab === "type50" && !hasType50 && hasType57) {
      setActiveTab("type57");
    } else if (activeTab === "type57" && !hasType57 && hasType50) {
      setActiveTab("type50");
    }
    // If neither tab has codes, default to type50
    else if (!hasType50 && !hasType57) {
      setActiveTab("type50");
    }
  }, [selectedCodes, activeTab]);

  useEffect(() => {
    const fetchPhysicians = async () => {
      try {
        const response = await fetch("/api/physicians");
        if (response.ok) {
          const data = await response.json();
          if (data.length === 1 && type === "new") {
            let newServiceLocation = formData.serviceLocation;

            // Auto-set service location if not already set and physician has health institution
            if (!formData.serviceLocation && data[0].healthInstitution?.city) {
              newServiceLocation = getServiceLocationFromCity(
                data[0].healthInstitution.city
              );
            }

            setFormData({
              ...formData,
              physicianId: data[0].id,
              serviceLocation: newServiceLocation,
            });
          }
          setPhysicians(data);
        }
      } catch (error) {
        console.error("Error fetching physicians:", error);
      }
    };

    const fetchPatients = async () => {
      try {
        const response = await fetch("/api/patients");
        if (response.ok) {
          const data = await response.json();
          setPatients(data);
        }
      } catch (error) {
        console.error("Error fetching patients:", error);
      }
    };

    const fetchReferringPhysicians = async () => {
      try {
        const response = await fetch("/api/referring-physicians");
        if (response.ok) {
          const data = await response.json();
          setReferringPhysicians(data);
        }
      } catch (error) {
        console.error("Error fetching referring physicians:", error);
      }
    };

    fetchPhysicians();
    fetchPatients();
    fetchReferringPhysicians();
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResponse, isLoading: isSearching } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery || debouncedQuery.length < 2) {
        return { results: [] };
      }
      const response = await axios.get(
        `/api/search?query=${encodeURIComponent(
          debouncedQuery
        )}&jurisdictionId=${1}&userId=${session?.user?.id}`
      );
      return response.data;
    },
    enabled: !!debouncedQuery && debouncedQuery.length >= 2,
  });

  const searchResults = searchResponse?.results || [];

  useEffect(() => {
    const searchIcdCodes = async () => {
      if (icdSearchQuery.length < 2) {
        setIcdSearchResults([]);
        return;
      }
      setIsSearchingIcd(true);
      try {
        const response = await fetch(
          `/api/icd-codes?search=${encodeURIComponent(icdSearchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setIcdSearchResults(data);
        }
      } catch (error) {
        console.error("Error searching ICD codes:", error);
      } finally {
        setIsSearchingIcd(false);
      }
    };

    setIcdSearchResults([]);
    const debounceTimer = setTimeout(searchIcdCodes, 300);
    return () => clearTimeout(debounceTimer);
  }, [icdSearchQuery]);

  useEffect(() => {
    const searchReferringPhysicians = async () => {
      if (referringPhysicianSearchQuery.length < 3) {
        setReferringPhysicianSearchResults([]);
        return;
      }
      setIsSearchingReferringPhysician(true);
      try {
        const response = await fetch(
          `/api/referring-physicians?search=${encodeURIComponent(
            referringPhysicianSearchQuery
          )}`
        );
        if (response.ok) {
          const data = await response.json();
          setReferringPhysicianSearchResults(data);
        }
      } catch (error) {
        console.error("Error searching referring physicians:", error);
      } finally {
        setIsSearchingReferringPhysician(false);
      }
    };

    setReferringPhysicianSearchResults([]);
    const debounceTimer = setTimeout(searchReferringPhysicians, 300);
    return () => clearTimeout(debounceTimer);
  }, [referringPhysicianSearchQuery]);

  const handleSelectDuplicatePatient = () => {
    if (duplicatePatient) {
      setFormData({ ...formData, patientId: duplicatePatient.id });
      setIsCreatingPatient(false);
      setDuplicatePatient(null);
      setNewPatientErrors({
        billingNumber: false,
        dateOfBirth: false,
        sex: false,
        billingNumberCheckDigit: false,
        billingNumberDuplicate: false,
      });
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.physicianId) {
        setServiceErrors({ ...serviceErrors, physician: true });
        setNewPatientErrors({ ...newPatientErrors, billingNumber: false });
        return;
      }

      if (newPatient.billingNumber.length != 9) {
        setNewPatientErrors({ ...newPatientErrors, billingNumber: true });
        return;
      }

      if (!checkDigit(newPatient.billingNumber)) {
        setNewPatientErrors({
          ...newPatientErrors,
          billingNumberCheckDigit: true,
        });
        return;
      }

      // Check for duplicate billing number in physician's patient list
      const existingPatient = patients.find(
        (patient) => patient.billingNumber === newPatient.billingNumber
      );
      if (existingPatient) {
        setDuplicatePatient(existingPatient);
        setNewPatientErrors({
          ...newPatientErrors,
          billingNumberDuplicate: true,
        });
        return;
      }

      if (
        !newPatient.dateOfBirth ||
        !isValidFlexibleDate(newPatient.dateOfBirth)
      ) {
        setNewPatientErrors({ ...newPatientErrors, dateOfBirth: true });
        return;
      }

      if (!newPatient.sex) {
        setNewPatientErrors({ ...newPatientErrors, sex: true });
        return;
      }

      const selectedPhysician = physicians.find(
        (p) => p.id === formData.physicianId
      );
      if (!selectedPhysician) {
        throw new Error("Selected physician not found");
      }

      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: newPatient.firstName,
          lastName: newPatient.lastName,
          billingNumber: newPatient.billingNumber,
          date_of_birth: parseFlexibleDate(newPatient.dateOfBirth),
          sex: newPatient.sex,
          physicianId: formData.physicianId,
          jurisdictionId: selectedPhysician.jurisdictionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create patient");
      }

      const createdPatient = await response.json();
      setPatients([...patients, createdPatient]);
      setFormData({ ...formData, patientId: createdPatient.id });
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
    } catch (error) {
      console.error("Error creating patient:", error);
    }
  };

  const checkDigit = (value: string): boolean => {
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

  // Helper function to find the correct start date for a code based on its dependencies
  const findCorrectStartDate = (
    code: BillingCode,
    existingBillingCodes: typeof formData.billingCodes
  ): string => {
    // For type 57 codes, use BillingCodeChain logic if available
    if (
      code.billing_record_type === 57 &&
      code.billingCodeChains &&
      code.billingCodeChains.length > 0
    ) {
      // Get the root chain (lowest cumulative day range)
      const rootChain = code.billingCodeChains[0];

      // Calculate start date: admission date + previous day range
      const startDate = new Date(formData.serviceDate);
      startDate.setDate(startDate.getDate() + rootChain.previousDayRange);

      return startDate.toISOString().split("T")[0];
    }

    // For non-type 57 codes, use the admission date
    return formData.serviceDate;
  };

  const handleAddCode = (code: BillingCode) => {
    // For type 57 codes, prevent duplicates by increasing units instead
    if (
      code.billing_record_type === 57 &&
      selectedCodes.find((c) => c.id === code.id)
    ) {
      // Find the index of the existing code in billingCodes
      const existingIndex = formData.billingCodes.findIndex(
        (bc) => bc.codeId === code.id
      );

      if (existingIndex !== -1) {
        const updatedBillingCodes = [...formData.billingCodes];
        const currentCode = updatedBillingCodes[existingIndex];
        const currentUnits = currentCode.numberOfUnits || 0;
        const maxUnits = code.max_units || Infinity;

        if (currentUnits < maxUnits) {
          // Increase units by 1
          updatedBillingCodes[existingIndex] = {
            ...currentCode,
            numberOfUnits: currentUnits + 1,
          };

          setFormData({
            ...formData,
            billingCodes: updatedBillingCodes,
          });

          toast({
            title: "Units increased",
            description: `Units for ${code.code} increased to ${
              currentUnits + 1
            }`,
          });
        } else {
          toast({
            title: "Maximum units reached",
            description: `${code.code} has already reached the maximum of ${maxUnits} units`,
            variant: "destructive",
          });
        }
      }

      setServiceErrors({ ...serviceErrors, billingCodes: false });
      setSearchQuery("");
      return;
    }

    setSelectedCodes([...selectedCodes, code]);

    // Calculate service start date for type 57 codes
    let serviceStartDate: string;
    let serviceEndDate = null;
    let updatedBillingCodes = [...formData.billingCodes];

    if (code.billing_record_type === 57) {
      // For type 57 codes, use BillingCodeChain logic to calculate dates
      if (code.billingCodeChains && code.billingCodeChains.length > 0) {
        const rootChain = code.billingCodeChains[0];
        // Start Date: admission date + previous day range
        const startDate = new Date(formData.serviceDate);
        startDate.setDate(startDate.getDate() + rootChain.previousDayRange);
        serviceStartDate = startDate.toISOString().split("T")[0];

        // End Date: admission date + cumulative day range - 1
        const endDate = new Date(formData.serviceDate);
        endDate.setDate(endDate.getDate() + rootChain.cumulativeDayRange - 1);
        serviceEndDate = endDate.toISOString().split("T")[0];
      } else {
        // Fallback to admission date if no BillingCodeChain data
        serviceStartDate = formData.serviceDate;
        serviceEndDate = null;
      }
    } else {
      // For non-type 57 codes, use today's date as default
      const today = new Date().toISOString().split("T")[0];
      serviceStartDate = today;

      // Calculate service end date based on day range
      if (code.day_range && code.day_range > 0) {
        const startDate = new Date(serviceStartDate);
        startDate.setDate(startDate.getDate() + code.day_range - 1); // -1 because it's inclusive
        serviceEndDate = startDate.toISOString().split("T")[0];
      }
    }

    // Add the new code to the updated billing codes array
    updatedBillingCodes.push({
      codeId: code.id,
      status: "OPEN",
      billing_record_type: code.billing_record_type,
      serviceStartTime: null,
      serviceEndTime: null,
      numberOfUnits: code.multiple_unit_indicator === "U" ? 1 : null,
      bilateralIndicator: null,
      specialCircumstances: null,
      serviceDate: serviceStartDate,
      serviceEndDate: serviceEndDate,
    });

    // Update form data with both the updated previous code and the new code
    setFormData({
      ...formData,
      billingCodes: updatedBillingCodes,
    });

    setServiceErrors({ ...serviceErrors, billingCodes: false });
    setSearchQuery("");
  };

  const handleUpdateBillingCode = (
    index: number,
    updates: Partial<(typeof formData.billingCodes)[0]>
  ) => {
    const updatedBillingCodes = [...formData.billingCodes];
    const currentCode = updatedBillingCodes[index];
    const selectedCode = selectedCodes.find((c) => c.id === currentCode.codeId);

    // Handle day range logic when service date is updated
    if (updates.serviceDate) {
      if (
        selectedCode?.billing_record_type === 57 &&
        selectedCode.billingCodeChains &&
        selectedCode.billingCodeChains.length > 0
      ) {
        // Use BillingCodeChain logic for type 57 codes
        const rootChain = selectedCode.billingCodeChains[0];
        const startDate = new Date(updates.serviceDate);
        startDate.setDate(
          startDate.getDate() + rootChain.cumulativeDayRange - 1
        ); // -1 because it's inclusive
        updates.serviceEndDate = startDate.toISOString().split("T")[0];
      } else if (selectedCode?.day_range && selectedCode.day_range > 0) {
        // Fallback to regular day range logic
        const startDate = new Date(updates.serviceDate);
        startDate.setDate(startDate.getDate() + selectedCode.day_range - 1); // -1 because it's inclusive
        updates.serviceEndDate = startDate.toISOString().split("T")[0];
      }
    }

    // Handle day range logic when service end date is updated
    if (updates.serviceEndDate) {
      if (
        selectedCode?.billing_record_type === 57 &&
        selectedCode.billingCodeChains &&
        selectedCode.billingCodeChains.length > 0
      ) {
        // Use BillingCodeChain logic for type 57 codes
        const rootChain = selectedCode.billingCodeChains[0];
        const endDate = new Date(updates.serviceEndDate);
        endDate.setDate(endDate.getDate() - rootChain.cumulativeDayRange + 1); // +1 to get back to start date
        updates.serviceDate = endDate.toISOString().split("T")[0];
      } else if (selectedCode?.day_range && selectedCode.day_range > 0) {
        // Fallback to regular day range logic
        const endDate = new Date(updates.serviceEndDate);
        endDate.setDate(endDate.getDate() - selectedCode.day_range + 1); // +1 to get back to start date
        updates.serviceDate = endDate.toISOString().split("T")[0];
      }
    }

    // Validate max units
    if (
      updates.numberOfUnits !== undefined &&
      updates.numberOfUnits !== null &&
      selectedCode?.max_units
    ) {
      if (updates.numberOfUnits > selectedCode.max_units) {
        updates.numberOfUnits = selectedCode.max_units;
      }
    }

    // If serviceDate is being updated, check if it's greater than serviceEndDate
    if (updates.serviceDate && currentCode.serviceEndDate) {
      const newStartDate = new Date(updates.serviceDate);
      const currentEndDate = new Date(currentCode.serviceEndDate);

      // If the new start date is greater than the current end date, update end date to match
      if (newStartDate > currentEndDate) {
        updates.serviceEndDate = updates.serviceDate;
      }
    }

    updatedBillingCodes[index] = { ...currentCode, ...updates };

    // If we're updating a service date, recalculate all related dates
    if (updates.serviceDate) {
      const recalculatedCodes = recalculateAllDates(updatedBillingCodes, index);
      setFormData({ ...formData, billingCodes: recalculatedCodes });
    } else {
      setFormData({ ...formData, billingCodes: updatedBillingCodes });
    }
  };

  // Function to recalculate all billing code dates when any start date changes
  const recalculateAllDates = (
    billingCodes: typeof formData.billingCodes,
    changedIndex: number
  ) => {
    const updatedCodes = [...billingCodes];
    const changedCode = updatedCodes[changedIndex];
    const changedSelectedCode = selectedCodes.find(
      (c) => c.id === changedCode.codeId
    );

    if (!changedSelectedCode) return updatedCodes;

    // Step 1: Update the changed code's dates based on its type
    if (
      changedSelectedCode.billing_record_type === 57 &&
      changedSelectedCode.billingCodeChains &&
      changedSelectedCode.billingCodeChains.length > 0
    ) {
      // For type 57 codes, use BillingCodeChain logic
      const rootChain = changedSelectedCode.billingCodeChains[0];
      const startDate = new Date(
        changedCode.serviceDate || formData.serviceDate
      );

      // Start Date: admission date + previous day range
      const calculatedStartDate = new Date(formData.serviceDate);
      calculatedStartDate.setDate(
        calculatedStartDate.getDate() + rootChain.previousDayRange
      );

      // End Date: admission date + cumulative day range - 1
      const endDate = new Date(formData.serviceDate);
      endDate.setDate(endDate.getDate() + rootChain.cumulativeDayRange - 1);

      updatedCodes[changedIndex] = {
        ...changedCode,
        serviceDate: calculatedStartDate.toISOString().split("T")[0],
        serviceEndDate: endDate.toISOString().split("T")[0],
      };
    } else if (
      changedSelectedCode.day_range &&
      changedSelectedCode.day_range > 0
    ) {
      // For non-type 57 codes, use regular day range logic
      const startDate = new Date(
        changedCode.serviceDate || formData.serviceDate
      );
      startDate.setDate(
        startDate.getDate() + changedSelectedCode.day_range - 1
      );
      updatedCodes[changedIndex] = {
        ...changedCode,
        serviceEndDate: startDate.toISOString().split("T")[0],
      };
    }

    // For type 57 codes, we don't need to recalculate dependent codes since they use BillingCodeChain
    // For non-type 57 codes, we can add logic here if needed in the future

    return updatedCodes;
  };

  // Function to handle main service date changes and update all billing codes
  const handleMainServiceDateChange = (newServiceDate: string) => {
    // Only update type 57 codes when the admission date changes
    // Non-type 57 codes should remain unchanged
    const updatedBillingCodes = formData.billingCodes.map((code, index) => {
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      if (!selectedCode) return code;

      // Only update type 57 codes
      if (selectedCode.billing_record_type !== 57) {
        return code; // Keep non-type 57 codes unchanged
      }

      // For type 57 codes, use BillingCodeChain logic if available
      let newServiceStartDate = newServiceDate;
      let newServiceEndDate = null;

      if (
        selectedCode.billingCodeChains &&
        selectedCode.billingCodeChains.length > 0
      ) {
        const rootChain = selectedCode.billingCodeChains[0];
        // Start Date: admission date + previous day range
        const startDate = new Date(newServiceDate);
        startDate.setDate(startDate.getDate() + rootChain.previousDayRange);
        newServiceStartDate = startDate.toISOString().split("T")[0];

        // End Date: admission date + cumulative day range - 1
        const endDate = new Date(newServiceDate);
        endDate.setDate(endDate.getDate() + rootChain.cumulativeDayRange - 1);
        newServiceEndDate = endDate.toISOString().split("T")[0];
      }

      return {
        ...code,
        serviceDate: newServiceStartDate,
        serviceEndDate: newServiceEndDate,
      };
    });

    setFormData({
      ...formData,
      serviceDate: newServiceDate,
      billingCodes: updatedBillingCodes,
    });
  };

  const handleRemoveCode = (index: number) => {
    const removedCodeId = formData.billingCodes[index]?.codeId;

    // Remove from billingCodes by index
    const updatedBillingCodes = formData.billingCodes.filter(
      (_, i) => i !== index
    );

    // Remove from selectedCodes only if no other instances exist
    const stillExists = updatedBillingCodes.some(
      (bc) => bc.codeId === removedCodeId
    );
    const updatedSelectedCodes = stillExists
      ? selectedCodes
      : selectedCodes.filter((code) => code.id !== removedCodeId);

    setSelectedCodes(updatedSelectedCodes);
    setFormData({
      ...formData,
      billingCodes: updatedBillingCodes,
    });
  };

  const handleSelectIcdCode = (icdCode: ICDCode) => {
    setSelectedIcdCode(icdCode);
    setFormData({
      ...formData,
      icdCodeId: icdCode.id,
    });
    setIcdSearchQuery("");
    setIcdSearchResults([]);
  };

  const handleRemoveIcdCode = () => {
    setSelectedIcdCode(null);
    setFormData({
      ...formData,
      icdCodeId: null,
    });
  };

  const handleSelectReferringPhysician = (physician: ReferringPhysician) => {
    setSelectedReferringPhysician(physician);
    setFormData({ ...formData, referringPhysicianId: physician.id });
    setReferringPhysicianSearchQuery("");
    setReferringPhysicianSearchResults([]);
  };

  const handleRemoveReferringPhysician = () => {
    setSelectedReferringPhysician(null);
    setFormData({ ...formData, referringPhysicianId: null });
  };

  const validateForm = () => {
    const newServiceErrors = {
      physician: !formData.physicianId,
      patient: !formData.patientId,
      billingCodes: formData.billingCodes.length === 0,
      serviceDate: !formData.serviceDate,
    };
    setServiceErrors(newServiceErrors);

    // Check if service location and location of service are selected
    if (!formData.serviceLocation || !formData.locationOfService) {
      return false;
    }

    // Check if any W/X codes are missing special circumstances
    const hasWorXWithoutSpecialCircumstances = formData.billingCodes.some(
      (code) => {
        const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
        return (
          selectedCode &&
          isWorXSection(selectedCode) &&
          !code.specialCircumstances
        );
      }
    );

    // Check if any codes require referring physician but none is selected
    const requiresReferringPhysician = formData.billingCodes.some((code) => {
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      return (
        selectedCode && selectedCode.referring_practitioner_required === "Y"
      );
    });

    const hasReferringPhysicianError =
      requiresReferringPhysician && !formData.referringPhysicianId;

    return (
      !Object.values(newServiceErrors).some(Boolean) &&
      !hasWorXWithoutSpecialCircumstances &&
      !hasReferringPhysicianError
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated" || !session) {
      console.error("No active session. Please log in.");
      router.push("/auth/signin");
      return;
    }

    try {
      // Use the user's selected service date as the primary service date
      const primaryServiceDate = new Date(formData.serviceDate);

      // Helper function to combine date and time
      const combineDateTime = (date: Date, timeStr: string) => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(":").map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate.toISOString();
      };

      if (type === "new") {
        // Create new service with all billing codes set to OPEN status
        const billingTypeId = physicians
          .find((p) => p.id === formData.physicianId)
          ?.physicianBillingTypes.find((bt) => bt.active)?.billingTypeId;

        const serviceData = {
          physicianId: formData.physicianId,
          billingTypeId: physicians[0].physicianBillingTypes.find(
            (bt) => bt.active
          )?.billingTypeId,
          patientId: formData.patientId,
          referringPhysicianId: formData.referringPhysicianId,
          icdCodeId: formData.icdCodeId,
          healthInstitutionId: formData.healthInstitutionId,
          summary: formData.summary,
          serviceDate: primaryServiceDate.toISOString(),
          serviceLocation: formData.serviceLocation,
          locationOfService: formData.locationOfService,
          serviceStatus: "OPEN",
          billingCodes: formData.billingCodes.map((code) => ({
            codeId: code.codeId,
            status: "OPEN", // Set all codes to OPEN
            serviceStartTime: code.serviceStartTime
              ? combineDateTime(
                  new Date(code.serviceDate || formData.serviceDate),
                  code.serviceStartTime
                )
              : null,
            serviceEndTime: code.serviceEndTime
              ? combineDateTime(
                  new Date(code.serviceDate || formData.serviceDate),
                  code.serviceEndTime
                )
              : null,
            numberOfUnits: code.numberOfUnits || null,
            bilateralIndicator: code.bilateralIndicator,
            specialCircumstances: code.specialCircumstances,
            serviceDate: code.serviceDate
              ? new Date(code.serviceDate).toISOString()
              : primaryServiceDate.toISOString(),
            serviceEndDate: code.serviceEndDate
              ? new Date(code.serviceEndDate).toISOString()
              : null,
          })),
        };

        const serviceResponse = await fetch("/api/services", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user?.id}`,
          },
          body: JSON.stringify(serviceData),
        });

        if (!serviceResponse.ok) {
          console.error(serviceResponse);
          throw new Error("Failed to create service");
        }

        const result = await serviceResponse.json();

        toast({
          title: "Service saved",
          description: "Service has been saved with OPEN status",
        });

        // Redirect to edit mode for the newly created service
        router.push(`/services/edit/${result.id}`);
      } else if (type === "edit" && serviceId) {
        // Update existing service with all billing codes set to OPEN status
        const serviceData = {
          id: serviceId,
          physicianId: formData.physicianId,
          billingTypeId: formData.billingTypeId,
          patientId: formData.patientId,
          referringPhysicianId: formData.referringPhysicianId,
          icdCodeId: formData.icdCodeId,
          healthInstitutionId: formData.healthInstitutionId,
          summary: formData.summary,
          serviceDate: primaryServiceDate.toISOString(),
          serviceLocation: formData.serviceLocation,
          locationOfService: formData.locationOfService,
          serviceStatus: "OPEN",
          billingCodes: formData.billingCodes.map((code) => ({
            codeId: code.codeId,
            status: "OPEN", // Set all codes to OPEN
            serviceStartTime: code.serviceStartTime
              ? combineDateTime(
                  new Date(code.serviceDate || formData.serviceDate),
                  code.serviceStartTime
                )
              : null,
            serviceEndTime: code.serviceEndTime
              ? combineDateTime(
                  new Date(code.serviceDate || formData.serviceDate),
                  code.serviceEndTime
                )
              : null,
            numberOfUnits: code.numberOfUnits || null,
            bilateralIndicator: code.bilateralIndicator,
            specialCircumstances: code.specialCircumstances,
            serviceDate: code.serviceDate
              ? new Date(code.serviceDate).toISOString()
              : primaryServiceDate.toISOString(),
            serviceEndDate: code.serviceEndDate
              ? new Date(code.serviceEndDate).toISOString()
              : null,
          })),
        };

        const serviceResponse = await fetch("/api/services", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user?.id}`,
          },
          body: JSON.stringify(serviceData),
        });

        if (!serviceResponse.ok) {
          console.error(serviceResponse);
          throw new Error("Failed to update service");
        }

        toast({
          title: "Service saved",
          description: "Service has been saved with OPEN status",
        });

        // Redirect to services page
        router.push("/services");
      }
    } catch (error) {
      console.error("Error saving service:", error);
      toast({
        title: "Error",
        description: "Failed to save service. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleApproveAndFinish = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated" || !session) {
      console.error("No active session. Please log in.");
      router.push("/auth/signin");
      return;
    }

    // Check if there are type 57 codes that need discharge date
    const type57Codes = formData.billingCodes.filter((code) => {
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      return selectedCode && selectedCode.billing_record_type === 57;
    });

    // For type 57 codes, we'll use the last one added since we're not using previous/next codes anymore
    const lastType57Code = type57Codes[type57Codes.length - 1];

    if (lastType57Code) {
      // Always prompt for discharge date for the last type 57 code
      // This allows the user to override the calculated end date if needed
      setShowDischargeDateModal(true);
      setPendingApproveAndFinish(true);
      return;
    }

    // Proceed with normal approve and finish
    await performApproveAndFinish();
  };

  const handleConfirmDischargeDate = async () => {
    if (!dischargeDate) return;

    // Find the last type 57 code and set its end date
    const type57Codes = formData.billingCodes.filter((code) => {
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      return selectedCode && selectedCode.billing_record_type === 57;
    });

    // For type 57 codes, we'll use the last one added since we're not using previous/next codes anymore
    const lastType57Code = type57Codes[type57Codes.length - 1];

    let updatedBillingCodes = formData.billingCodes;

    if (lastType57Code) {
      updatedBillingCodes = formData.billingCodes.map((code) => {
        if (code.codeId === lastType57Code.codeId) {
          // Find the selected code to get its day range
          const selectedCode = selectedCodes.find((c) => c.id === code.codeId);

          // Calculate the end date based on the code's day range or BillingCodeChain
          let calculatedEndDate = dischargeDate;

          if (
            selectedCode?.billing_record_type === 57 &&
            selectedCode.billingCodeChains &&
            selectedCode.billingCodeChains.length > 0
          ) {
            // Use BillingCodeChain logic for type 57 codes
            const rootChain = selectedCode.billingCodeChains[0];
            const startDate = new Date(formData.serviceDate);
            const dayRangeEndDate = new Date(startDate);
            dayRangeEndDate.setDate(
              startDate.getDate() + rootChain.cumulativeDayRange - 1
            ); // -1 because it's inclusive

            const dischargeDateObj = new Date(dischargeDate);

            // Use the discharge date if it's earlier than or equal to the calculated day range end date
            // This allows the user to set an earlier discharge date than the full day range
            if (dischargeDateObj <= dayRangeEndDate) {
              calculatedEndDate = dischargeDate;
            } else {
              // If discharge date is later than the calculated end date, use the calculated end date
              // This prevents extending beyond the code's natural end date
              calculatedEndDate = dayRangeEndDate.toISOString().split("T")[0];
            }
          } else if (selectedCode?.day_range && selectedCode.day_range > 0) {
            // Fallback to regular day range logic
            const startDate = new Date(
              code.serviceDate || formData.serviceDate
            );
            const dayRangeEndDate = new Date(startDate);
            dayRangeEndDate.setDate(
              startDate.getDate() + selectedCode.day_range - 1
            ); // -1 because it's inclusive

            const dischargeDateObj = new Date(dischargeDate);

            // Use the discharge date if it's earlier than or equal to the calculated day range end date
            // This allows the user to set an earlier discharge date than the full day range
            if (dischargeDateObj <= dayRangeEndDate) {
              calculatedEndDate = dischargeDate;
            } else {
              // If discharge date is later than the calculated end date, use the calculated end date
              // This prevents extending beyond the code's natural end date
              calculatedEndDate = dayRangeEndDate.toISOString().split("T")[0];
            }
          }

          return {
            ...code,
            serviceEndDate: calculatedEndDate,
          };
        }
        return code;
      });

      setFormData({
        ...formData,
        billingCodes: updatedBillingCodes,
      });
    }

    setShowDischargeDateModal(false);
    setDischargeDate(getTodayLocalDate());
    setPendingApproveAndFinish(false);

    // Now proceed with approve and finish, passing the updated billing codes
    await performApproveAndFinish(updatedBillingCodes);
  };

  const performApproveAndFinish = async (
    billingCodesToUse = formData.billingCodes
  ) => {
    if (status === "unauthenticated" || !session) {
      console.error("No active session. Please log in.");
      router.push("/auth/signin");
      return;
    }

    try {
      // Use the user's selected service date as the primary service date
      const primaryServiceDate = new Date(formData.serviceDate);
      // Helper function to combine date and time
      const combineDateTime = (date: Date, timeStr: string) => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(":").map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate.toISOString();
      };

      if (type === "new") {
        // Create new service with billing codes in a single request
        const billingTypeId = physicians
          .find((p) => p.id === formData.physicianId)
          ?.physicianBillingTypes.find((bt) => bt.active)?.billingTypeId;
        const serviceData = {
          physicianId: formData.physicianId,
          billingTypeId: physicians[0].physicianBillingTypes.find(
            (bt) => bt.active
          )?.billingTypeId,
          patientId: formData.patientId,
          referringPhysicianId: formData.referringPhysicianId,
          icdCodeId: formData.icdCodeId,
          healthInstitutionId: formData.healthInstitutionId,
          summary: formData.summary,
          serviceDate: primaryServiceDate.toISOString(),
          serviceLocation: formData.serviceLocation,
          locationOfService: formData.locationOfService,
          serviceStatus: "PENDING",
          billingCodes: billingCodesToUse.map((code) => ({
            codeId: code.codeId,
            status: code.status,
            serviceStartTime: code.serviceStartTime
              ? combineDateTime(
                  new Date(code.serviceDate || formData.serviceDate),
                  code.serviceStartTime
                )
              : null,
            serviceEndTime: code.serviceEndTime
              ? combineDateTime(
                  new Date(code.serviceDate || formData.serviceDate),
                  code.serviceEndTime
                )
              : null,
            numberOfUnits: code.numberOfUnits || null,
            bilateralIndicator: code.bilateralIndicator,
            specialCircumstances: code.specialCircumstances,
            serviceDate: code.serviceDate
              ? new Date(code.serviceDate).toISOString()
              : primaryServiceDate.toISOString(),
            serviceEndDate: code.serviceEndDate
              ? new Date(code.serviceEndDate).toISOString()
              : null,
          })),
        };

        const serviceResponse = await fetch("/api/services", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user?.id}`,
          },
          body: JSON.stringify(serviceData),
        });

        if (!serviceResponse.ok) {
          console.error(serviceResponse);
          throw new Error("Failed to create service");
        }
      } else if (type === "edit" && serviceId) {
        // Update existing service with billing codes in a single request
        const serviceData = {
          id: serviceId,
          physicianId: formData.physicianId,
          billingTypeId: formData.billingTypeId,
          patientId: formData.patientId,
          referringPhysicianId: formData.referringPhysicianId,
          icdCodeId: formData.icdCodeId,
          healthInstitutionId: formData.healthInstitutionId,
          summary: formData.summary,
          serviceDate: primaryServiceDate.toISOString(),
          serviceLocation: formData.serviceLocation,
          locationOfService: formData.locationOfService,
          serviceStatus: "PENDING",
          billingCodes: billingCodesToUse.map((code) => ({
            codeId: code.codeId,
            status: code.status,
            serviceStartTime: code.serviceStartTime
              ? combineDateTime(
                  new Date(code.serviceDate || formData.serviceDate),
                  code.serviceStartTime
                )
              : null,
            serviceEndTime: code.serviceEndTime
              ? combineDateTime(
                  new Date(code.serviceDate || formData.serviceDate),
                  code.serviceEndTime
                )
              : null,
            numberOfUnits: code.numberOfUnits || null,
            bilateralIndicator: code.bilateralIndicator,
            specialCircumstances: code.specialCircumstances,
            serviceDate: code.serviceDate
              ? new Date(code.serviceDate).toISOString()
              : primaryServiceDate.toISOString(),
            serviceEndDate: code.serviceEndDate
              ? new Date(code.serviceEndDate).toISOString()
              : null,
          })),
        };

        const serviceResponse = await fetch("/api/services", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user?.id}`,
          },
          body: JSON.stringify(serviceData),
        });

        if (!serviceResponse.ok) {
          console.error(serviceResponse);
          throw new Error("Failed to update service");
        }
      }

      router.push("/services");
    } catch (error) {
      console.error(
        "Error creating/updating service and service codes:",
        error
      );
    }
  };

  const isWorXSection = (code: BillingCode) => {
    return code.section.code === "W" || code.section.code === "X";
  };

  const isHSection = (code: BillingCode) => {
    return code.section.code === "H";
  };

  const isType57Code = (code: BillingCode) => {
    return code.billing_record_type === 57;
  };

  const getServiceLocationFromCity = (city: string): string | null => {
    const cityLower = city.toLowerCase();
    if (cityLower.includes("saskatoon")) {
      return "S";
    } else if (cityLower.includes("regina")) {
      return "R";
    } else {
      return "X"; // Rural/Northern Premium for other cities
    }
  };

  if (status === "loading") {
    return (
      <Layout>
        <div className="container mx-auto">
          <Card>
            <CardContent className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  return (
    <form className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {physicians.length > 1 && (
              <>
                <label className="block text-sm font-medium">Physician</label>
                <Select
                  value={formData.physicianId}
                  onValueChange={(value) => {
                    const selectedPhysician = physicians.find(
                      (p) => p.id === value
                    );
                    let newServiceLocation = formData.serviceLocation;

                    // Auto-set service location if not already set and physician has health institution
                    if (
                      !formData.serviceLocation &&
                      selectedPhysician?.healthInstitution?.city
                    ) {
                      newServiceLocation = getServiceLocationFromCity(
                        selectedPhysician.healthInstitution.city
                      );
                    }

                    setFormData({
                      ...formData,
                      physicianId: value,
                      serviceLocation: newServiceLocation,
                    });
                  }}
                >
                  <SelectTrigger
                    className={serviceErrors.physician ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select a physician" />
                  </SelectTrigger>
                  <SelectContent>
                    {physicians.map((physician) => (
                      <SelectItem key={physician.id} value={physician.id}>
                        {physician.firstName} {physician.lastName} (
                        {physician.billingNumber})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {serviceErrors.physician && (
              <p className="text-sm text-red-500">Please select a physician</p>
            )}
          </div>

          {/* <div className="space-y-2">
            <label className="block text-sm font-medium">Description</label>
            <Textarea
              placeholder="Enter a detailed description of the claim"
              value={formData.summary}
              onChange={(e) =>
                setFormData({ ...formData, summary: e.target.value })
              }
              rows={4}
            />
          </div> */}

          <div className="space-y-2">
            <label className="block text-sm font-medium">Admission Date</label>
            <div className="flex gap-2 items-center">
              <HybridDateInput
                value={formData.serviceDate}
                onChange={(value) => {
                  handleMainServiceDateChange(value);
                }}
                placeholder="e.g., 22 Feb 2024, 22/02/2024, or use calendar"
                className={serviceErrors.serviceDate ? "border-red-500" : ""}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const currentDate = new Date(formData.serviceDate);
                  currentDate.setDate(currentDate.getDate() + 1);
                  handleMainServiceDateChange(
                    currentDate.toISOString().split("T")[0]
                  );
                }}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const currentDate = new Date(formData.serviceDate);
                  currentDate.setDate(currentDate.getDate() - 1);
                  handleMainServiceDateChange(
                    currentDate.toISOString().split("T")[0]
                  );
                }}
              >
                ↓
              </Button>
            </div>
            {serviceErrors.serviceDate && (
              <p className="text-sm text-red-500">
                Please select a service date
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Service Location <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={
                  formData.serviceLocation === "R" ? "default" : "outline"
                }
                onClick={() =>
                  setFormData({
                    ...formData,
                    serviceLocation:
                      formData.serviceLocation === "R" ? null : "R",
                  })
                }
                className="flex-1"
              >
                <span className="hidden sm:inline">Regina</span>
                <span className="sm:hidden">R</span>
              </Button>
              <Button
                type="button"
                variant={
                  formData.serviceLocation === "S" ? "default" : "outline"
                }
                onClick={() =>
                  setFormData({
                    ...formData,
                    serviceLocation:
                      formData.serviceLocation === "S" ? null : "S",
                  })
                }
                className="flex-1"
              >
                <span className="hidden sm:inline">Saskatoon</span>
                <span className="sm:hidden">S</span>
              </Button>
              <Button
                type="button"
                variant={
                  formData.serviceLocation === "X" ? "default" : "outline"
                }
                onClick={() =>
                  setFormData({
                    ...formData,
                    serviceLocation:
                      formData.serviceLocation === "X" ? null : "X",
                  })
                }
                className="flex-1"
              >
                <span className="hidden sm:inline">Rural/Northern Premium</span>
                <span className="sm:hidden">R/N</span>
              </Button>
            </div>
            {!formData.serviceLocation && (
              <p className="text-sm text-red-500">
                Please select a service location
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">
              Location of Service <span className="text-red-500">*</span>
            </label>
            <Select
              value={formData.locationOfService || ""}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  locationOfService: value || null,
                })
              }
            >
              <SelectTrigger
                className={!formData.locationOfService ? "border-red-500" : ""}
              >
                <SelectValue placeholder="Select location of service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Office</SelectItem>
                <SelectItem value="2">Hospital In-Patient</SelectItem>
                <SelectItem value="3">Hospital Out-Patient</SelectItem>
                <SelectItem value="4">Patient's Home</SelectItem>
                <SelectItem value="5">Other</SelectItem>
                <SelectItem value="7">Premium</SelectItem>
                <SelectItem value="9">Emergency Room</SelectItem>
                <SelectItem value="B">Hospital In-Patient (Premium)</SelectItem>
                <SelectItem value="C">
                  Hospital Out-Patient (Premium)
                </SelectItem>
                <SelectItem value="D">Patient's Home (Premium)</SelectItem>
                <SelectItem value="E">Other (Premium)</SelectItem>
                <SelectItem value="F">After-Hours-Clinic (Premium)</SelectItem>
                <SelectItem value="K">In Hospital (Premium)</SelectItem>
                <SelectItem value="M">Out Patient (Premium)</SelectItem>
                <SelectItem value="P">Home (Premium)</SelectItem>
                <SelectItem value="T">Other (Premium)</SelectItem>
              </SelectContent>
            </Select>
            {!formData.locationOfService && (
              <p className="text-sm text-red-500">
                Please select a location of service
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">ICD Code</label>
            <div className="relative">
              <Input
                placeholder="Search ICD codes..."
                value={icdSearchQuery}
                onChange={(e) => setIcdSearchQuery(e.target.value)}
              />
              {isSearchingIcd && (
                <div className="absolute right-2 top-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                </div>
              )}
              {icdSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {icdSearchResults.map((code) => (
                    <div
                      key={code.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleSelectIcdCode(code)}
                    >
                      <div className="font-medium">
                        {code.code} - {code.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedIcdCode && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div>
                    <span className="font-medium">{selectedIcdCode.code}</span>{" "}
                    - {selectedIcdCode.description}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveIcdCode}
                    className="text-red-500 hover:text-red-700"
                  >
                    <span className="sm:hidden">✕</span>
                    <span className="hidden sm:inline">Remove</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">Billing Codes</label>
            <div className="relative">
              <Input
                placeholder="Search billing codes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={serviceErrors.billingCodes ? "border-red-500" : ""}
              />
              {isSearching && (
                <div className="absolute right-2 top-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                </div>
              )}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {searchResults.map((code: BillingCode) => (
                    <div
                      key={code.id}
                      className="px-3 py-1.5 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleAddCode(code)}
                    >
                      <div className="font-medium">
                        {code.code} ({code.section.title})
                      </div>
                      <div className="text-sm text-gray-600">{code.title}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {serviceErrors.billingCodes && (
              <p className="text-sm text-red-500">
                Please add at least one billing code
              </p>
            )}

            {selectedCodes.length > 0 && (
              <div className="mt-2 space-y-1">
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab("type50")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "type50"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Claims, Consultation, etc.
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("type57")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === "type57"
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Rounding
                  </button>
                </div>

                {/* Type 50 Codes */}
                {activeTab === "type50" && (
                  <div className="space-y-1">
                    {selectedCodes.filter(
                      (code) => code.billing_record_type === 50
                    ).length > 0 ? (
                      <>
                        <h4 className="text-sm font-medium text-gray-700 mt-2 mb-1">
                          Claims, Consultation, etc.
                        </h4>
                        {(() => {
                          const type50Codes = formData.billingCodes.filter(
                            (_, idx) => {
                              const code = selectedCodes.find(
                                (c) =>
                                  c.id === formData.billingCodes[idx].codeId
                              );
                              return code && code.billing_record_type === 50;
                            }
                          );
                          const grouped = groupBillingCodesByCode(
                            type50Codes,
                            selectedCodes.filter(
                              (c) => c.billing_record_type === 50
                            ),
                            formData
                          );

                          return Object.values(grouped).map(
                            ({ code, instances }) => (
                              <div
                                key={code.code}
                                className="p-2 bg-gray-50 rounded-md space-y-1.5 mb-3"
                              >
                                <div className="flex items-center justify-between border-b border-gray-300 pb-1">
                                  <div>
                                    <span className="font-bold text-base">
                                      <span className="sm:hidden">
                                        {code.code.replace(/^0+/, "")}
                                      </span>
                                      <span className="hidden sm:inline">
                                        {code.code}
                                      </span>
                                    </span>{" "}
                                    <span className="text-gray-600 text-sm">
                                      - {code.title}
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {instances.length} instance
                                    {instances.length > 1 ? "s" : ""}
                                  </div>
                                </div>

                                {instances.map(
                                  (
                                    { billingCode, index: billingCodeIndex },
                                    instanceIdx
                                  ) => (
                                    <div
                                      key={billingCodeIndex}
                                      className="pl-2 py-1 bg-white rounded border border-gray-200 flex flex-wrap items-center gap-2 text-xs"
                                    >
                                      <div className="font-medium text-gray-700 min-w-[50px]">
                                        #{instanceIdx + 1}
                                      </div>

                                      {/* Service Date */}
                                      <div className="flex items-center gap-1">
                                        <label className="text-gray-600">
                                          Date:
                                        </label>
                                        <HybridDateInput
                                          value={
                                            formData.billingCodes[
                                              billingCodeIndex
                                            ]?.serviceDate ||
                                            formData.serviceDate
                                          }
                                          onChange={(value) =>
                                            handleUpdateBillingCode(
                                              billingCodeIndex,
                                              {
                                                serviceDate: value,
                                              }
                                            )
                                          }
                                          placeholder="e.g., 22 Feb 2024"
                                          className="w-40 h-7 text-xs"
                                        />
                                      </div>

                                      {/* End Date */}
                                      {code.day_range && code.day_range > 0 && (
                                        <div className="flex items-center gap-1">
                                          <label className="text-gray-600">
                                            End:
                                          </label>
                                          <HybridDateInput
                                            value={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.serviceEndDate || ""
                                            }
                                            onChange={(value) =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  serviceEndDate: value || null,
                                                }
                                              )
                                            }
                                            placeholder="e.g., 22 Feb 2024"
                                            className="w-40 h-7 text-xs"
                                          />
                                        </div>
                                      )}

                                      {/* Units */}
                                      {code.multiple_unit_indicator === "U" && (
                                        <div className="flex items-center gap-1">
                                          <label className="text-gray-600">
                                            Units:
                                          </label>
                                          <Input
                                            type="number"
                                            min="1"
                                            max={code.max_units || undefined}
                                            value={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.numberOfUnits || ""
                                            }
                                            onChange={(e) => {
                                              const value = e.target.value
                                                ? parseInt(e.target.value)
                                                : 1;
                                              const maxUnits =
                                                code.max_units || value;
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  numberOfUnits: Math.min(
                                                    value,
                                                    maxUnits
                                                  ),
                                                }
                                              );
                                            }}
                                            className="w-16 h-7 text-xs text-center"
                                          />
                                        </div>
                                      )}

                                      {/* Start Time */}
                                      {code.start_time_required === "Y" && (
                                        <div className="flex items-center gap-1">
                                          <label className="text-gray-600">
                                            Start:
                                          </label>
                                          <Input
                                            type="time"
                                            value={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.serviceStartTime || ""
                                            }
                                            onChange={(e) =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  serviceStartTime:
                                                    e.target.value || null,
                                                }
                                              )
                                            }
                                            className="w-28 h-7 text-xs"
                                          />
                                        </div>
                                      )}

                                      {/* End Time */}
                                      {code.stop_time_required === "Y" && (
                                        <div className="flex items-center gap-1">
                                          <label className="text-gray-600">
                                            Stop:
                                          </label>
                                          <Input
                                            type="time"
                                            value={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.serviceEndTime || ""
                                            }
                                            onChange={(e) =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  serviceEndTime:
                                                    e.target.value || null,
                                                }
                                              )
                                            }
                                            className="w-28 h-7 text-xs"
                                          />
                                        </div>
                                      )}

                                      {/* Bilateral */}
                                      {code.title.includes("Bilateral") && (
                                        <div className="flex items-center gap-1">
                                          <label className="text-gray-600">
                                            Side:
                                          </label>
                                          <div className="flex gap-1">
                                            <Button
                                              type="button"
                                              variant={
                                                formData.billingCodes[
                                                  billingCodeIndex
                                                ]?.bilateralIndicator === "L"
                                                  ? "default"
                                                  : "outline"
                                              }
                                              onClick={() =>
                                                handleUpdateBillingCode(
                                                  billingCodeIndex,
                                                  {
                                                    bilateralIndicator:
                                                      formData.billingCodes[
                                                        billingCodeIndex
                                                      ]?.bilateralIndicator ===
                                                      "L"
                                                        ? null
                                                        : "L",
                                                  }
                                                )
                                              }
                                              className="h-6 px-2 text-xs"
                                            >
                                              L
                                            </Button>
                                            <Button
                                              type="button"
                                              variant={
                                                formData.billingCodes[
                                                  billingCodeIndex
                                                ]?.bilateralIndicator === "R"
                                                  ? "default"
                                                  : "outline"
                                              }
                                              onClick={() =>
                                                handleUpdateBillingCode(
                                                  billingCodeIndex,
                                                  {
                                                    bilateralIndicator:
                                                      formData.billingCodes[
                                                        billingCodeIndex
                                                      ]?.bilateralIndicator ===
                                                      "R"
                                                        ? null
                                                        : "R",
                                                  }
                                                )
                                              }
                                              className="h-6 px-2 text-xs"
                                            >
                                              R
                                            </Button>
                                            <Button
                                              type="button"
                                              variant={
                                                formData.billingCodes[
                                                  billingCodeIndex
                                                ]?.bilateralIndicator === "B"
                                                  ? "default"
                                                  : "outline"
                                              }
                                              onClick={() =>
                                                handleUpdateBillingCode(
                                                  billingCodeIndex,
                                                  {
                                                    bilateralIndicator:
                                                      formData.billingCodes[
                                                        billingCodeIndex
                                                      ]?.bilateralIndicator ===
                                                      "B"
                                                        ? null
                                                        : "B",
                                                  }
                                                )
                                              }
                                              className="h-6 px-2 text-xs"
                                            >
                                              B
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Tech/Interp */}
                                      {isWorXSection(code) && (
                                        <div className="flex items-center gap-1">
                                          <label className="text-gray-600">
                                            Type:
                                          </label>
                                          <div className="flex gap-1">
                                            <Button
                                              type="button"
                                              variant={
                                                formData.billingCodes[
                                                  billingCodeIndex
                                                ]?.specialCircumstances === "TF"
                                                  ? "default"
                                                  : "outline"
                                              }
                                              onClick={() =>
                                                handleUpdateBillingCode(
                                                  billingCodeIndex,
                                                  {
                                                    specialCircumstances: "TF",
                                                  }
                                                )
                                              }
                                              className="h-6 px-2 text-xs"
                                            >
                                              T
                                            </Button>
                                            <Button
                                              type="button"
                                              variant={
                                                formData.billingCodes[
                                                  billingCodeIndex
                                                ]?.specialCircumstances === "PF"
                                                  ? "default"
                                                  : "outline"
                                              }
                                              onClick={() =>
                                                handleUpdateBillingCode(
                                                  billingCodeIndex,
                                                  {
                                                    specialCircumstances: "PF",
                                                  }
                                                )
                                              }
                                              className="h-6 px-2 text-xs"
                                            >
                                              I
                                            </Button>
                                            <Button
                                              type="button"
                                              variant={
                                                formData.billingCodes[
                                                  billingCodeIndex
                                                ]?.specialCircumstances === "CF"
                                                  ? "default"
                                                  : "outline"
                                              }
                                              onClick={() =>
                                                handleUpdateBillingCode(
                                                  billingCodeIndex,
                                                  {
                                                    specialCircumstances: "CF",
                                                  }
                                                )
                                              }
                                              className="h-6 px-2 text-xs"
                                            >
                                              T&I
                                            </Button>
                                          </div>
                                        </div>
                                      )}

                                      {/* Takeover */}
                                      {isHSection(code) && (
                                        <div className="flex items-center gap-1">
                                          <Button
                                            type="button"
                                            variant={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.specialCircumstances === "TA"
                                                ? "default"
                                                : "outline"
                                            }
                                            onClick={() =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  specialCircumstances:
                                                    formData.billingCodes[
                                                      billingCodeIndex
                                                    ]?.specialCircumstances ===
                                                    "TA"
                                                      ? null
                                                      : "TA",
                                                }
                                              )
                                            }
                                            className="h-6 px-2 text-xs"
                                          >
                                            Takeover
                                          </Button>
                                        </div>
                                      )}

                                      {/* Remove button */}
                                      <div className="ml-auto">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            handleRemoveCode(billingCodeIndex)
                                          }
                                          className="text-red-500 hover:text-red-700 h-6 px-2 text-xs"
                                        >
                                          ✕
                                        </Button>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )
                          );
                        })()}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No claims, consultation, etc. codes added yet.
                      </p>
                    )}
                  </div>
                )}

                {/* Type 57 Codes */}
                {activeTab === "type57" && (
                  <div className="space-y-1">
                    {selectedCodes.filter(
                      (code) => code.billing_record_type === 57
                    ).length > 0 ? (
                      <>
                        <h4 className="text-sm font-medium text-gray-700 mt-2 mb-1">
                          Rounding
                        </h4>
                        {(() => {
                          // Filter and prepare type 57 codes with their indices
                          const type57CodesWithIndices = formData.billingCodes
                            .map((billingCode, billingCodeIndex) => {
                              const code = selectedCodes.find(
                                (c) => c.id === billingCode.codeId
                              );
                              if (!code || code.billing_record_type !== 57)
                                return null;
                              return { billingCode, billingCodeIndex, code };
                            })
                            .filter((item) => item !== null);

                          // Sort by service date descending (most recent first)
                          type57CodesWithIndices.sort((a, b) => {
                            const dateA =
                              a!.billingCode.serviceDate ||
                              formData.serviceDate;
                            const dateB =
                              b!.billingCode.serviceDate ||
                              formData.serviceDate;
                            return dateB.localeCompare(dateA);
                          });

                          return type57CodesWithIndices.map(
                            ({ billingCode, billingCodeIndex, code }) => {
                              if (!code) return null;

                              return (
                                <div
                                  key={billingCodeIndex}
                                  className="p-3 bg-gray-50 rounded-md space-y-3"
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="font-medium">
                                        <span className="sm:hidden">
                                          {code.code.replace(/^0+/, "")}
                                        </span>
                                        <span className="hidden sm:inline">
                                          {code.code}
                                        </span>
                                      </span>{" "}
                                      - {code.title}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveCode(billingCodeIndex)
                                      }
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <span className="sm:hidden">✕</span>
                                      <span className="hidden sm:inline">
                                        Remove
                                      </span>
                                    </Button>
                                  </div>

                                  <div className="flex flex-col sm:flex-row gap-3 items-center sm:items-start justify-center sm:justify-around">
                                    {/* Service Date for all codes */}
                                    <div className="space-y-1 w-full sm:w-auto flex flex-col items-center sm:items-start">
                                      <label className="block text-sm font-medium">
                                        Service Date
                                      </label>
                                      <HybridDateInput
                                        value={
                                          formData.billingCodes[
                                            billingCodeIndex
                                          ]?.serviceDate || formData.serviceDate
                                        }
                                        onChange={(value) =>
                                          handleUpdateBillingCode(
                                            billingCodeIndex,
                                            {
                                              serviceDate: value,
                                            }
                                          )
                                        }
                                        placeholder="e.g., 22 Feb 2024"
                                        className="w-auto min-w-[180px]"
                                      />
                                    </div>

                                    {/* Service End Date for type 57 codes */}
                                    <div className="space-y-1 w-full sm:w-auto flex flex-col items-center sm:items-start">
                                      <label className="block text-sm font-medium">
                                        Service End Date
                                      </label>
                                      <HybridDateInput
                                        value={
                                          formData.billingCodes[
                                            billingCodeIndex
                                          ]?.serviceEndDate || ""
                                        }
                                        onChange={(value) =>
                                          handleUpdateBillingCode(
                                            billingCodeIndex,
                                            {
                                              serviceEndDate: value || null,
                                            }
                                          )
                                        }
                                        placeholder="e.g., 22 Feb 2024"
                                        className="w-auto min-w-[180px]"
                                      />
                                    </div>

                                    {code.multiple_unit_indicator === "U" && (
                                      <div className="space-y-2 w-full sm:w-auto flex flex-col items-center sm:items-start">
                                        <label className="block text-sm font-medium">
                                          # Units
                                          {code.max_units && (
                                            <span className="text-xs text-gray-500 ml-2">
                                              (Max: {code.max_units})
                                            </span>
                                          )}
                                        </label>
                                        <div className="flex items-center gap-2">
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              const currentValue =
                                                formData.billingCodes[
                                                  billingCodeIndex
                                                ]?.numberOfUnits || 0;
                                              if (currentValue > 1) {
                                                handleUpdateBillingCode(
                                                  billingCodeIndex,
                                                  {
                                                    numberOfUnits:
                                                      currentValue - 1,
                                                  }
                                                );
                                              }
                                            }}
                                            disabled={
                                              (formData.billingCodes[
                                                billingCodeIndex
                                              ]?.numberOfUnits || 0) <= 1
                                            }
                                          >
                                            -
                                          </Button>
                                          <Input
                                            type="number"
                                            min="1"
                                            max={code.max_units || undefined}
                                            value={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.numberOfUnits || ""
                                            }
                                            onChange={(e) => {
                                              const value = e.target.value
                                                ? parseInt(e.target.value)
                                                : 1;
                                              const maxUnits =
                                                code.max_units || value;
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  numberOfUnits: Math.min(
                                                    value,
                                                    maxUnits
                                                  ),
                                                }
                                              );
                                            }}
                                            className="w-16 text-center text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                          />
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                              const currentValue =
                                                formData.billingCodes[
                                                  billingCodeIndex
                                                ]?.numberOfUnits || 0;
                                              const maxUnits =
                                                code.max_units ||
                                                currentValue + 1;
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  numberOfUnits: Math.min(
                                                    currentValue + 1,
                                                    maxUnits
                                                  ),
                                                }
                                              );
                                            }}
                                            disabled={
                                              !!(
                                                code.max_units &&
                                                (formData.billingCodes[
                                                  billingCodeIndex
                                                ]?.numberOfUnits || 0) >=
                                                  code.max_units
                                              )
                                            }
                                          >
                                            +
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    {code.day_range && code.day_range > 0 && (
                                      <div className="hidden sm:block space-y-2 w-full sm:w-auto">
                                        <label className="block text-sm font-medium">
                                          Day Range: {code.day_range} days
                                          <span className="text-xs text-blue-600 ml-2">
                                            (Auto-calculated)
                                          </span>
                                        </label>
                                        <div className="text-xs text-gray-500">
                                          Service period:{" "}
                                          {formData.billingCodes[
                                            billingCodeIndex
                                          ]?.serviceDate || "Not set"}{" "}
                                          to{" "}
                                          {formData.billingCodes[
                                            billingCodeIndex
                                          ]?.serviceEndDate || "Not set"}
                                          {formData.billingCodes[
                                            billingCodeIndex
                                          ]?.serviceDate &&
                                            formData.billingCodes[
                                              billingCodeIndex
                                            ]?.serviceEndDate && (
                                              <span className="text-green-600 ml-2">
                                                ✓ {code.day_range} days
                                                inclusive
                                              </span>
                                            )}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {code.start_time_required === "Y" && (
                                      <div className="space-y-2">
                                        <label className="block text-sm font-medium">
                                          Service Start Time
                                        </label>
                                        <Input
                                          type="time"
                                          value={
                                            formData.billingCodes[
                                              billingCodeIndex
                                            ]?.serviceStartTime || ""
                                          }
                                          onChange={(e) =>
                                            handleUpdateBillingCode(
                                              billingCodeIndex,
                                              {
                                                serviceStartTime:
                                                  e.target.value || null,
                                              }
                                            )
                                          }
                                        />
                                      </div>
                                    )}

                                    {code.stop_time_required === "Y" && (
                                      <div className="space-y-2">
                                        <label className="block text-sm font-medium">
                                          Service End Time
                                        </label>
                                        <Input
                                          type="time"
                                          value={
                                            formData.billingCodes[
                                              billingCodeIndex
                                            ]?.serviceEndTime || ""
                                          }
                                          onChange={(e) =>
                                            handleUpdateBillingCode(
                                              billingCodeIndex,
                                              {
                                                serviceEndTime:
                                                  e.target.value || null,
                                              }
                                            )
                                          }
                                        />
                                      </div>
                                    )}

                                    {code.title.includes("Bilateral") && (
                                      <div className="space-y-2">
                                        <label className="block text-sm font-medium text-center sm:text-left">
                                          Bilateral Indicator
                                        </label>
                                        <div className="flex gap-2 justify-center sm:justify-start">
                                          <Button
                                            type="button"
                                            variant={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.bilateralIndicator === "L"
                                                ? "default"
                                                : "outline"
                                            }
                                            onClick={() =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  bilateralIndicator:
                                                    formData.billingCodes[
                                                      billingCodeIndex
                                                    ]?.bilateralIndicator ===
                                                    "L"
                                                      ? null
                                                      : "L",
                                                }
                                              )
                                            }
                                            className="flex-1"
                                          >
                                            Left
                                          </Button>
                                          <Button
                                            type="button"
                                            variant={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.bilateralIndicator === "R"
                                                ? "default"
                                                : "outline"
                                            }
                                            onClick={() =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  bilateralIndicator:
                                                    formData.billingCodes[
                                                      billingCodeIndex
                                                    ]?.bilateralIndicator ===
                                                    "R"
                                                      ? null
                                                      : "R",
                                                }
                                              )
                                            }
                                            className="flex-1"
                                          >
                                            Right
                                          </Button>
                                          <Button
                                            type="button"
                                            variant={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.bilateralIndicator === "B"
                                                ? "default"
                                                : "outline"
                                            }
                                            onClick={() =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  bilateralIndicator:
                                                    formData.billingCodes[
                                                      billingCodeIndex
                                                    ]?.bilateralIndicator ===
                                                    "B"
                                                      ? null
                                                      : "B",
                                                }
                                              )
                                            }
                                            className="flex-1"
                                          >
                                            Both
                                          </Button>
                                        </div>
                                      </div>
                                    )}

                                    {isWorXSection(code) && (
                                      <div className="col-span-2 space-y-2 justify-center sm:justify-start">
                                        <label className="block text-sm font-medium text-center sm:text-left">
                                          Special Circumstances{" "}
                                          <span className="text-red-500">
                                            *
                                          </span>
                                        </label>
                                        <div className="flex gap-2">
                                          <Button
                                            type="button"
                                            variant={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.specialCircumstances === "TF"
                                                ? "default"
                                                : "outline"
                                            }
                                            onClick={() =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  specialCircumstances: "TF",
                                                }
                                              )
                                            }
                                            className="flex-1"
                                          >
                                            <span className="sm:hidden">T</span>
                                            <span className="hidden sm:inline">
                                              Technical
                                            </span>
                                          </Button>
                                          <Button
                                            type="button"
                                            variant={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.specialCircumstances === "PF"
                                                ? "default"
                                                : "outline"
                                            }
                                            onClick={() =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  specialCircumstances: "PF",
                                                }
                                              )
                                            }
                                            className="flex-1"
                                          >
                                            <span className="sm:hidden">I</span>
                                            <span className="hidden sm:inline">
                                              Interpretation
                                            </span>
                                          </Button>
                                          <Button
                                            type="button"
                                            variant={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.specialCircumstances === "CF"
                                                ? "default"
                                                : "outline"
                                            }
                                            onClick={() =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  specialCircumstances: "CF",
                                                }
                                              )
                                            }
                                            className="flex-1"
                                          >
                                            <span className="sm:hidden">
                                              T&I
                                            </span>
                                            <span className="hidden sm:inline">
                                              Both
                                            </span>
                                          </Button>
                                        </div>
                                        {serviceErrors.billingCodes &&
                                          !formData.billingCodes[
                                            billingCodeIndex
                                          ]?.specialCircumstances && (
                                            <p className="text-sm text-red-500">
                                              Please select a special
                                              circumstance
                                            </p>
                                          )}
                                      </div>
                                    )}

                                    {isHSection(code) && (
                                      <div className="col-span-2 space-y-2">
                                        <label className="block text-sm font-medium text-center sm:text-left">
                                          Special Circumstances
                                        </label>
                                        <div className="flex gap-2 justify-center sm:justify-start">
                                          <Button
                                            type="button"
                                            variant={
                                              formData.billingCodes[
                                                billingCodeIndex
                                              ]?.specialCircumstances === "TA"
                                                ? "default"
                                                : "outline"
                                            }
                                            onClick={() =>
                                              handleUpdateBillingCode(
                                                billingCodeIndex,
                                                {
                                                  specialCircumstances:
                                                    formData.billingCodes[
                                                      billingCodeIndex
                                                    ]?.specialCircumstances ===
                                                    "TA"
                                                      ? null
                                                      : "TA",
                                                }
                                              )
                                            }
                                            className="flex-1"
                                          >
                                            Takeover
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                          );
                        })()}
                      </>
                    ) : (
                      <p className="text-sm text-gray-500">
                        No rounding codes added yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {formData.billingCodes.some((code) => {
            const selectedCode = selectedCodes.find(
              (c) => c.id === code.codeId
            );
            return (
              selectedCode &&
              selectedCode.referring_practitioner_required === "Y"
            );
          }) && (
            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Referring Physician
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  placeholder="Search referring physicians..."
                  value={referringPhysicianSearchQuery}
                  onChange={(e) =>
                    setReferringPhysicianSearchQuery(e.target.value)
                  }
                  className={
                    !formData.referringPhysicianId ? "border-red-500" : ""
                  }
                />
                {isSearchingReferringPhysician && (
                  <div className="absolute right-2 top-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  </div>
                )}
                {referringPhysicianSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {referringPhysicianSearchResults.map((physician) => (
                      <div
                        key={physician.id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() =>
                          handleSelectReferringPhysician(physician)
                        }
                      >
                        <div className="font-medium">
                          {physician.name} - {physician.specialty} (
                          {physician.code})
                        </div>
                        <div className="text-sm text-gray-600">
                          {physician.location}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!formData.referringPhysicianId && (
                <p className="text-sm text-red-500">
                  A referring physician is required for one or more selected
                  billing codes
                </p>
              )}

              {selectedReferringPhysician && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                    <div>
                      <span className="font-medium">
                        {selectedReferringPhysician.name}
                      </span>{" "}
                      - {selectedReferringPhysician.specialty} (
                      {selectedReferringPhysician.code})
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveReferringPhysician}
                      className="text-red-500 hover:text-red-700"
                    >
                      <span className="sm:hidden">✕</span>
                      <span className="hidden sm:inline">Remove</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium">Patient</label>
            {!isCreatingPatient ? (
              <>
                <Select
                  value={formData.patientId}
                  onValueChange={(value: string) => {
                    setFormData({ ...formData, patientId: value });
                    setServiceErrors({ ...serviceErrors, patient: false });
                  }}
                >
                  <SelectTrigger
                    className={serviceErrors.patient ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {`${patient.firstName} ${patient.lastName}${
                          patient.middleInitial
                            ? ` ${patient.middleInitial}`
                            : ""
                        }`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {serviceErrors.patient && (
                  <p className="text-sm text-red-500">
                    Please select a patient
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setIsCreatingPatient(true)}
                >
                  Create New Patient
                </Button>
              </>
            ) : (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-medium">Create New Patient</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      First Name
                    </label>
                    <Input
                      value={newPatient.firstName}
                      onChange={(e) =>
                        setNewPatient({
                          ...newPatient,
                          firstName: e.target.value,
                        })
                      }
                      placeholder="First name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Last Name
                    </label>
                    <Input
                      value={newPatient.lastName}
                      onChange={(e) =>
                        setNewPatient({
                          ...newPatient,
                          lastName: e.target.value,
                        })
                      }
                      placeholder="Last name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Health Services Number
                    </label>
                    <Input
                      value={newPatient.billingNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewPatient({
                          ...newPatient,
                          billingNumber: value,
                        });

                        // Clear duplicate error when user starts typing
                        if (newPatientErrors.billingNumberDuplicate) {
                          setNewPatientErrors({
                            ...newPatientErrors,
                            billingNumberDuplicate: false,
                          });
                        }

                        // Validate length and check digit
                        if (value.length === 9) {
                          if (checkDigit(value)) {
                            // Check for duplicate in physician's patient list
                            const existingPatient = patients.find(
                              (patient) => patient.billingNumber === value
                            );
                            setDuplicatePatient(existingPatient || null);
                            setNewPatientErrors({
                              ...newPatientErrors,
                              billingNumber: false,
                              billingNumberCheckDigit: false,
                              billingNumberDuplicate: !!existingPatient,
                            });
                          } else {
                            setNewPatientErrors({
                              ...newPatientErrors,
                              billingNumber: false,
                              billingNumberCheckDigit: true,
                              billingNumberDuplicate: false,
                            });
                          }
                        } else {
                          setNewPatientErrors({
                            ...newPatientErrors,
                            billingNumber:
                              value.length > 0 && value.length !== 9,
                            billingNumberCheckDigit: false,
                            billingNumberDuplicate: false,
                          });
                        }
                      }}
                      placeholder="9-digit HSN (e.g., 123456789)"
                      maxLength={9}
                      className={
                        newPatientErrors.billingNumber ||
                        newPatientErrors.billingNumberCheckDigit ||
                        newPatientErrors.billingNumberDuplicate
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {(newPatientErrors.billingNumber ||
                      newPatientErrors.billingNumberCheckDigit ||
                      newPatientErrors.billingNumberDuplicate) && (
                      <div className="space-y-2">
                        <p className="text-sm text-red-500">
                          {newPatientErrors.billingNumber
                            ? "Billing number must be exactly 9 characters long"
                            : newPatientErrors.billingNumberCheckDigit
                            ? "Not a valid Health Services Number"
                            : "A patient with this billing number already exists in your patient list"}
                        </p>
                        {newPatientErrors.billingNumberDuplicate &&
                          duplicatePatient && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                              <p className="text-sm text-blue-800 font-medium mb-2">
                                Existing Patient Found:
                              </p>
                              <p className="text-sm text-blue-700">
                                {duplicatePatient.firstName}{" "}
                                {duplicatePatient.lastName}
                                {duplicatePatient.middleInitial &&
                                  ` ${duplicatePatient.middleInitial}`}
                              </p>
                              <p className="text-xs text-blue-600">
                                DOB:{" "}
                                {formatFullDate(duplicatePatient.dateOfBirth)} |
                                Sex: {duplicatePatient.sex}
                              </p>
                              <Button
                                type="button"
                                onClick={handleSelectDuplicatePatient}
                                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1"
                              >
                                Use This Patient
                              </Button>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Date of Birth
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g., 22 Feb 1961, Feb 23 1961, 23/02/1961, 1961-02-23"
                      value={newPatient.dateOfBirth}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        setNewPatient({
                          ...newPatient,
                          dateOfBirth: inputValue,
                        });

                        // Clear error when user starts typing
                        if (newPatientErrors.dateOfBirth && inputValue.trim()) {
                          setNewPatientErrors({
                            ...newPatientErrors,
                            dateOfBirth: false,
                          });
                        }
                      }}
                      onBlur={(e) => {
                        const inputValue = e.target.value.trim();
                        if (inputValue) {
                          const parsedDate = parseFlexibleDate(inputValue);
                          if (parsedDate) {
                            setNewPatient({
                              ...newPatient,
                              dateOfBirth: parsedDate,
                            });
                            // Display the formatted date in the input
                            e.target.value = formatFullDate(parsedDate);
                          } else {
                            setNewPatientErrors({
                              ...newPatientErrors,
                              dateOfBirth: true,
                            });
                          }
                        }
                      }}
                      className={
                        newPatientErrors.dateOfBirth ? "border-red-500" : ""
                      }
                      required
                    />
                    {newPatientErrors.dateOfBirth && (
                      <p className="text-sm text-red-500">
                        Please enter a valid date (e.g., 22 Feb 1961, Feb 23
                        1961, 23/02/1961, 1961-02-23)
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Accepts various formats: month names (Feb, February),
                      slashes (23/02/1961), dashes (1961-02-23)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Sex</label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={newPatient.sex === "M" ? "default" : "outline"}
                        onClick={() =>
                          setNewPatient({ ...newPatient, sex: "M" })
                        }
                        className="flex-1"
                      >
                        M
                      </Button>
                      <Button
                        type="button"
                        variant={newPatient.sex === "F" ? "default" : "outline"}
                        onClick={() =>
                          setNewPatient({ ...newPatient, sex: "F" })
                        }
                        className="flex-1"
                      >
                        F
                      </Button>
                    </div>
                    {newPatientErrors.sex && (
                      <p className="text-sm text-red-500">
                        Please select a sex
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreatingPatient(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreatePatient}
                    disabled={
                      !newPatient.firstName ||
                      !newPatient.lastName ||
                      !newPatient.billingNumber ||
                      newPatient.billingNumber.length !== 9 ||
                      !checkDigit(newPatient.billingNumber) ||
                      newPatientErrors.billingNumberDuplicate ||
                      !newPatient.dateOfBirth ||
                      !isValidFlexibleDate(newPatient.dateOfBirth) ||
                      !newPatient.sex
                    }
                  >
                    Create Patient
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Health Institution
                </label>
                <HealthInstitutionSelect
                  value={formData.healthInstitutionId || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, healthInstitutionId: value })
                  }
                />
              </div> */}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleSave}>
              Save
            </Button>
            <Button type="button" onClick={handleApproveAndFinish}>
              Approve & Finish
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Discharge Date Modal */}
      {showDischargeDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Set Discharge Date</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please set the discharge date for the last type 57 code in the
              service. This will override the calculated end date if the
              discharge date is earlier.
            </p>
            <div className="space-y-4">
              {/* Show calculated end date information */}
              {(() => {
                const type57Codes = formData.billingCodes.filter((code) => {
                  const selectedCode = selectedCodes.find(
                    (c) => c.id === code.codeId
                  );
                  return (
                    selectedCode && selectedCode.billing_record_type === 57
                  );
                });

                // For type 57 codes, we'll use the last one added since we're not using previous/next codes anymore
                const lastType57Code = type57Codes[type57Codes.length - 1];

                if (lastType57Code) {
                  const selectedCode = selectedCodes.find(
                    (c) => c.id === lastType57Code.codeId
                  );
                  if (selectedCode?.day_range && selectedCode.day_range > 0) {
                    const startDate = new Date(
                      lastType57Code.serviceDate || formData.serviceDate
                    );
                    const calculatedEndDate = new Date(startDate);
                    calculatedEndDate.setDate(
                      startDate.getDate() + selectedCode.day_range - 1
                    );

                    return (
                      <div className="p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800 mb-2">
                          <strong>Code {selectedCode.code}</strong> has a day
                          range of {selectedCode.day_range} days.
                        </p>
                        <p className="text-xs text-blue-700">
                          Calculated end date:{" "}
                          {calculatedEndDate.toISOString().split("T")[0]}
                          (start date + {selectedCode.day_range - 1} days)
                        </p>
                        <p className="text-xs text-blue-700 mt-1">
                          Setting an earlier discharge date will override this
                          calculation.
                        </p>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Discharge Date
                </label>
                <Input
                  type="date"
                  value={dischargeDate}
                  onChange={(e) => setDischargeDate(e.target.value)}
                  min={formData.serviceDate}
                  max={getTodayLocalDate()}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowDischargeDateModal(false);
                    setDischargeDate(getTodayLocalDate());
                    setPendingApproveAndFinish(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDischargeDate}
                  disabled={!dischargeDate}
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No codes selected message */}
      {selectedCodes.length === 0 && (
        <div className="mt-4 text-center py-8">
          <p className="text-sm text-gray-500">
            No billing codes added yet. Use the search above to add codes.
          </p>
        </div>
      )}
    </form>
  );
}
