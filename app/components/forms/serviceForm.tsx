"use client";

import Layout from "@/app/components/layout/Layout";
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
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Physician {
  id: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  billingNumber: string;
  jurisdictionId: number;
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
  previousCodes?: Array<{
    previous_code: {
      id: number;
      code: string;
      title: string;
      section: {
        code: string;
        title: string;
      };
    };
  }>;
  nextCodes?: Array<{
    next_code: {
      id: number;
      code: string;
      title: string;
      section: {
        code: string;
        title: string;
      };
    };
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

interface HealthInstitution {
  id: number;
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface Service {
  id: string;
  physicianId: string;
  patientId: string;
  referringPhysicianId: number | null;
  icdCodeId: number | null;
  healthInstitutionId: number | null;
  summary: string;
  serviceDate: string;
  specialCircumstances: {
    codeId: number;
    value: string;
  } | null;
}

interface ServiceCode {
  serviceId: string;
  codeId: number;
  status: string;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
  numberOfUnits: number | null;
  bilateralIndicator: string | null;
  specialCircumstances: string | null;
  serviceDate: string | null;
  serviceEndDate: string | null;
  serviceLocation: string | null;
  locationOfService: string | null;
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
    patientId: "",
    referringPhysicianId: null as number | null,
    icdCodeId: null as number | null,
    healthInstitutionId: null as number | null,
    summary: "",
    serviceDate: new Date().toISOString().split("T")[0],
    serviceLocation: null as string | null,
    locationOfService: null as string | null,
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
  });

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
              referringPhysicianId: service.referringPhysicianId,
              icdCodeId: service.icdCodeId,
              healthInstitutionId: service.healthInstitutionId,
              summary: service.summary,
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

      if (!newPatient.dateOfBirth) {
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
          date_of_birth: newPatient.dateOfBirth,
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

  const handleAddCode = (code: BillingCode) => {
    if (!selectedCodes.find((c) => c.id === code.id)) {
      setSelectedCodes([...selectedCodes, code]);

      // Get the previous code's values for defaults
      const previousCode =
        formData.billingCodes[formData.billingCodes.length - 1];

      // Calculate service start date for type 57 codes
      let serviceStartDate = formData.serviceDate;

      if (code.billing_record_type === 57) {
        // Check if this code has previous codes defined and if any of them are already selected
        if (code.previousCodes && code.previousCodes.length > 0) {
          const existingFormCodes = formData.billingCodes;
          // Find if any of the previous codes are already in the form
          const selectedPreviousCodes = existingFormCodes.filter(
            (selectedCode) =>
              code.previousCodes?.some(
                (prevCode) => prevCode.previous_code.id === selectedCode.codeId
              )
          );

          if (selectedPreviousCodes.length > 0) {
            // Find the most recent end date from the selected previous codes
            const previousEndDates = selectedPreviousCodes
              .map((prevCode) => {
                const prevCodeIndex = formData.billingCodes.findIndex(
                  (bc) => bc.codeId === prevCode.codeId
                );
                return prevCodeIndex >= 0
                  ? formData.billingCodes[prevCodeIndex].serviceEndDate
                  : null;
              })
              .filter((date) => date !== null);

            if (previousEndDates.length > 0) {
              // Get the latest end date and add 1 day
              const latestEndDate = new Date(
                Math.max(
                  ...previousEndDates.map((date) => new Date(date!).getTime())
                )
              );
              latestEndDate.setDate(latestEndDate.getDate() + 1);
              serviceStartDate = latestEndDate.toISOString().split("T")[0];
            }
          }
          // If no previous codes are selected, keep the default service start date
        }
        // If no previous codes defined, use the service start date (already set)
      }

      // Calculate service end date based on day range
      let serviceEndDate = null;
      console.log(code);
      if (code.day_range && code.day_range > 0) {
        const startDate = new Date(serviceStartDate);
        startDate.setDate(startDate.getDate() + code.day_range - 1); // -1 because it's inclusive
        serviceEndDate = startDate.toISOString().split("T")[0];
      }

      setFormData({
        ...formData,
        billingCodes: [
          ...formData.billingCodes,
          {
            codeId: code.id,
            status: "PENDING",
            billing_record_type: code.billing_record_type,
            serviceStartTime: null,
            serviceEndTime: null,
            numberOfUnits: code.multiple_unit_indicator === "U" ? 1 : null,
            bilateralIndicator: null,
            specialCircumstances: null,
            serviceDate: serviceStartDate,
            serviceEndDate: serviceEndDate,
          },
        ],
      });
    }
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
    if (
      updates.serviceDate &&
      selectedCode?.day_range &&
      selectedCode.day_range > 0
    ) {
      const startDate = new Date(updates.serviceDate);
      startDate.setDate(startDate.getDate() + selectedCode.day_range - 1); // -1 because it's inclusive
      updates.serviceEndDate = startDate.toISOString().split("T")[0];
    }

    // Handle day range logic when service end date is updated
    if (
      updates.serviceEndDate &&
      selectedCode?.day_range &&
      selectedCode.day_range > 0
    ) {
      const endDate = new Date(updates.serviceEndDate);
      endDate.setDate(endDate.getDate() - selectedCode.day_range + 1); // +1 to get back to start date
      updates.serviceDate = endDate.toISOString().split("T")[0];
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

    // Step 1: Update the changed code's end date if it has a day range
    if (changedSelectedCode.day_range && changedSelectedCode.day_range > 0) {
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

    // Step 2: Find all codes that depend on the changed code (next codes)
    const dependentCodes = updatedCodes.filter((code, index) => {
      if (index === changedIndex) return false;
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      return selectedCode?.previousCodes?.some(
        (prevCode) => prevCode.previous_code.id === changedSelectedCode.id
      );
    });

    // Step 3: Update dependent codes' start dates
    dependentCodes.forEach((dependentCode) => {
      const dependentIndex = updatedCodes.findIndex(
        (c) => c.codeId === dependentCode.codeId
      );
      const dependentSelectedCode = selectedCodes.find(
        (c) => c.id === dependentCode.codeId
      );

      if (!dependentSelectedCode) return;

      // Calculate new start date based on the changed code's end date
      const changedEndDate = updatedCodes[changedIndex].serviceEndDate;
      if (changedEndDate) {
        const newStartDate = new Date(changedEndDate);
        newStartDate.setDate(newStartDate.getDate() + 1); // Start the next day

        let newServiceDate = newStartDate.toISOString().split("T")[0];
        let newServiceEndDate = null;

        // Calculate end date if this code has a day range
        if (
          dependentSelectedCode.day_range &&
          dependentSelectedCode.day_range > 0
        ) {
          const endDate = new Date(newStartDate);
          endDate.setDate(
            endDate.getDate() + dependentSelectedCode.day_range - 1
          );
          newServiceEndDate = endDate.toISOString().split("T")[0];
        }

        updatedCodes[dependentIndex] = {
          ...dependentCode,
          serviceDate: newServiceDate,
          serviceEndDate: newServiceEndDate,
        };

        // Recursively update codes that depend on this dependent code
        const nextDependentCodes = updatedCodes.filter((code, index) => {
          if (index === dependentIndex) return false;
          const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
          return selectedCode?.previousCodes?.some(
            (prevCode) => prevCode.previous_code.id === dependentSelectedCode.id
          );
        });

        nextDependentCodes.forEach((nextCode) => {
          const nextIndex = updatedCodes.findIndex(
            (c) => c.codeId === nextCode.codeId
          );
          const nextSelectedCode = selectedCodes.find(
            (c) => c.id === nextCode.codeId
          );

          if (!nextSelectedCode) return;

          const dependentEndDate = updatedCodes[dependentIndex].serviceEndDate;
          const dependentStartDate = updatedCodes[dependentIndex].serviceDate;
          const nextStartDate = new Date(
            dependentEndDate || dependentStartDate || formData.serviceDate
          );
          nextStartDate.setDate(nextStartDate.getDate() + 1);

          let nextServiceDate = nextStartDate.toISOString().split("T")[0];
          let nextServiceEndDate = null;

          if (nextSelectedCode.day_range && nextSelectedCode.day_range > 0) {
            const endDate = new Date(nextStartDate);
            endDate.setDate(endDate.getDate() + nextSelectedCode.day_range - 1);
            nextServiceEndDate = endDate.toISOString().split("T")[0];
          }

          updatedCodes[nextIndex] = {
            ...nextCode,
            serviceDate: nextServiceDate,
            serviceEndDate: nextServiceEndDate,
          };
        });
      }
    });

    return updatedCodes;
  };

  // Function to handle main service date changes and update all billing codes
  const handleMainServiceDateChange = (newServiceDate: string) => {
    const updatedBillingCodes = formData.billingCodes.map((code, index) => {
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      if (!selectedCode) return code;

      // For type 57 codes, we need to check if they have previous codes
      if (
        selectedCode.billing_record_type === 57 &&
        selectedCode.previousCodes &&
        selectedCode.previousCodes.length > 0
      ) {
        // Check if any previous codes are already selected
        const selectedPreviousCodes = formData.billingCodes.filter(
          (billingCode) =>
            selectedCode.previousCodes?.some(
              (prevCode) => prevCode.previous_code.id === billingCode.codeId
            )
        );

        if (selectedPreviousCodes.length > 0) {
          // This code depends on previous codes, so don't change its date
          return code;
        }
      }

      // For codes without dependencies or the first code in a chain, update the start date
      let newServiceStartDate = newServiceDate;
      let newServiceEndDate = null;

      // Calculate end date if this code has a day range
      if (selectedCode.day_range && selectedCode.day_range > 0) {
        const startDate = new Date(newServiceStartDate);
        startDate.setDate(startDate.getDate() + selectedCode.day_range - 1);
        newServiceEndDate = startDate.toISOString().split("T")[0];
      }

      return {
        ...code,
        serviceDate: newServiceStartDate,
        serviceEndDate: newServiceEndDate,
      };
    });

    // Now recalculate all dependent codes
    let finalBillingCodes = [...updatedBillingCodes];
    updatedBillingCodes.forEach((code, index) => {
      const selectedCode = selectedCodes.find((c) => c.id === code.codeId);
      if (selectedCode && selectedCode.billing_record_type === 57) {
        finalBillingCodes = recalculateAllDates(finalBillingCodes, index);
      }
    });

    setFormData({
      ...formData,
      serviceDate: newServiceDate,
      billingCodes: finalBillingCodes,
    });
  };

  const handleRemoveCode = (codeId: number) => {
    setSelectedCodes(selectedCodes.filter((code) => code.id !== codeId));
    setFormData({
      ...formData,
      billingCodes: formData.billingCodes.filter(
        (code) => code.codeId !== codeId
      ),
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (status === "loading") {
      console.log("Session is loading, please wait...");
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
        // Create new service
        const serviceData = {
          physicianId: formData.physicianId,
          patientId: formData.patientId,
          referringPhysicianId: formData.referringPhysicianId,
          icdCodeId: formData.icdCodeId,
          healthInstitutionId: formData.healthInstitutionId,
          summary: formData.summary,
          serviceDate: primaryServiceDate.toISOString(),
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

        const createdService = await serviceResponse.json();

        // Create service codes
        const serviceCodesData: any[] = [];

        formData.billingCodes.forEach((code) => {
          serviceCodesData.push({
            serviceId: createdService.id,
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
            serviceLocation: formData.serviceLocation,
            locationOfService: formData.locationOfService,
          });
        });

        const serviceCodesResponse = await fetch("/api/service-codes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user?.id}`,
          },
          body: JSON.stringify(serviceCodesData),
        });

        if (!serviceCodesResponse.ok) {
          throw new Error("Failed to create service codes");
        }
      } else if (type === "edit" && serviceId) {
        // Update existing service
        const serviceData = {
          id: serviceId,
          physicianId: formData.physicianId,
          patientId: formData.patientId,
          referringPhysicianId: formData.referringPhysicianId,
          icdCodeId: formData.icdCodeId,
          healthInstitutionId: formData.healthInstitutionId,
          summary: formData.summary,
          serviceDate: primaryServiceDate.toISOString(),
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

        // Get existing service codes to delete them
        const existingServiceResponse = await fetch(
          `/api/services/${serviceId}`
        );
        if (existingServiceResponse.ok) {
          const existingService = await existingServiceResponse.json();
          const existingServiceCodeIds = existingService.serviceCodes.map(
            (sc: any) => sc.id
          );

          // Delete existing service codes
          if (existingServiceCodeIds.length > 0) {
            const deleteResponse = await fetch(
              `/api/service-codes?ids=${existingServiceCodeIds.join(",")}`,
              {
                method: "DELETE",
                headers: {
                  Authorization: `Bearer ${session.user?.id}`,
                },
              }
            );

            if (!deleteResponse.ok) {
              throw new Error("Failed to delete existing service codes");
            }
          }
        }

        // Create new service codes
        const serviceCodesData: any[] = [];

        formData.billingCodes.forEach((code) => {
          const selectedCode = selectedCodes.find((c) => c.id === code.codeId);

          serviceCodesData.push({
            serviceId: parseInt(serviceId),
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
            serviceLocation: formData.serviceLocation,
            locationOfService: formData.locationOfService,
          });
        });

        const serviceCodesResponse = await fetch("/api/service-codes", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.user?.id}`,
          },
          body: JSON.stringify(serviceCodesData),
        });

        if (!serviceCodesResponse.ok) {
          throw new Error("Failed to create service codes");
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
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="block text-sm font-medium">
              Service / Admission Date
            </label>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={formData.serviceDate}
                onChange={(e) => {
                  handleMainServiceDateChange(e.target.value);
                }}
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

          <div className="space-y-2">
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
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
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
              <div className="mt-4 space-y-1">
                {selectedCodes.map((code, index) => (
                  <div
                    key={code.id}
                    className="p-4 bg-gray-50 rounded-md space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">
                          <span className="sm:hidden">
                            {code.code.replace(/^0+/, "")}
                          </span>
                          <span className="hidden sm:inline">{code.code}</span>
                        </span>{" "}
                        - {code.title}
                        {isType57Code(code) &&
                          code.previousCodes &&
                          code.previousCodes.length > 0 && (
                            <span className="text-xs text-blue-600 ml-2">
                              (Uses previous codes)
                            </span>
                          )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCode(code.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <span className="sm:hidden">✕</span>
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start justify-center sm:justify-around">
                      {isType57Code(code) && (
                        <>
                          <div className="space-y-2 w-full sm:w-auto flex flex-col items-center sm:items-start">
                            <label className="block text-sm font-medium">
                              Service Start Date
                            </label>
                            <Input
                              type="date"
                              defaultValue={formData.serviceDate}
                              value={
                                formData.billingCodes[index].serviceDate ||
                                formData.serviceDate
                              }
                              onChange={(e) =>
                                handleUpdateBillingCode(index, {
                                  serviceDate: e.target.value,
                                })
                              }
                              className="w-auto min-w-[140px]"
                            />
                          </div>
                          <div className="space-y-2 w-full sm:w-auto flex flex-col items-center sm:items-start">
                            <label className="block text-sm font-medium">
                              Service End Date
                            </label>
                            <Input
                              type="date"
                              value={
                                formData.billingCodes[index].serviceEndDate ||
                                ""
                              }
                              onChange={(e) =>
                                handleUpdateBillingCode(index, {
                                  serviceEndDate: e.target.value || null,
                                })
                              }
                              className="w-auto min-w-[140px]"
                            />
                          </div>
                        </>
                      )}

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
                                  formData.billingCodes[index].numberOfUnits ||
                                  0;
                                if (currentValue > 1) {
                                  handleUpdateBillingCode(index, {
                                    numberOfUnits: currentValue - 1,
                                  });
                                }
                              }}
                              disabled={
                                (formData.billingCodes[index].numberOfUnits ||
                                  0) <= 1
                              }
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min="1"
                              max={code.max_units || undefined}
                              value={
                                formData.billingCodes[index].numberOfUnits || ""
                              }
                              onChange={(e) => {
                                const value = e.target.value
                                  ? parseInt(e.target.value)
                                  : 1;
                                const maxUnits = code.max_units || value;
                                handleUpdateBillingCode(index, {
                                  numberOfUnits: Math.min(value, maxUnits),
                                });
                              }}
                              className="w-16 text-center text-lg font-semibold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const currentValue =
                                  formData.billingCodes[index].numberOfUnits ||
                                  0;
                                const maxUnits =
                                  code.max_units || currentValue + 1;
                                handleUpdateBillingCode(index, {
                                  numberOfUnits: Math.min(
                                    currentValue + 1,
                                    maxUnits
                                  ),
                                });
                              }}
                              disabled={
                                !!(
                                  code.max_units &&
                                  (formData.billingCodes[index].numberOfUnits ||
                                    0) >= code.max_units
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
                            {formData.billingCodes[index].serviceDate ||
                              "Not set"}{" "}
                            to{" "}
                            {formData.billingCodes[index].serviceEndDate ||
                              "Not set"}
                            {formData.billingCodes[index].serviceDate &&
                              formData.billingCodes[index].serviceEndDate && (
                                <span className="text-green-600 ml-2">
                                  ✓ {code.day_range} days inclusive
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
                              formData.billingCodes[index].serviceStartTime ||
                              ""
                            }
                            onChange={(e) =>
                              handleUpdateBillingCode(index, {
                                serviceStartTime: e.target.value || null,
                              })
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
                              formData.billingCodes[index].serviceEndTime || ""
                            }
                            onChange={(e) =>
                              handleUpdateBillingCode(index, {
                                serviceEndTime: e.target.value || null,
                              })
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
                                formData.billingCodes[index]
                                  .bilateralIndicator === "L"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleUpdateBillingCode(index, {
                                  bilateralIndicator:
                                    formData.billingCodes[index]
                                      .bilateralIndicator === "L"
                                      ? null
                                      : "L",
                                })
                              }
                              className="flex-1"
                            >
                              Left
                            </Button>
                            <Button
                              type="button"
                              variant={
                                formData.billingCodes[index]
                                  .bilateralIndicator === "R"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleUpdateBillingCode(index, {
                                  bilateralIndicator:
                                    formData.billingCodes[index]
                                      .bilateralIndicator === "R"
                                      ? null
                                      : "R",
                                })
                              }
                              className="flex-1"
                            >
                              Right
                            </Button>
                            <Button
                              type="button"
                              variant={
                                formData.billingCodes[index]
                                  .bilateralIndicator === "B"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleUpdateBillingCode(index, {
                                  bilateralIndicator:
                                    formData.billingCodes[index]
                                      .bilateralIndicator === "B"
                                      ? null
                                      : "B",
                                })
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
                            <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={
                                formData.billingCodes[index]
                                  .specialCircumstances === "TF"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleUpdateBillingCode(index, {
                                  specialCircumstances: "TF",
                                })
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
                                formData.billingCodes[index]
                                  .specialCircumstances === "PF"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleUpdateBillingCode(index, {
                                  specialCircumstances: "PF",
                                })
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
                                formData.billingCodes[index]
                                  .specialCircumstances === "CF"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleUpdateBillingCode(index, {
                                  specialCircumstances: "CF",
                                })
                              }
                              className="flex-1"
                            >
                              <span className="sm:hidden">T&I</span>
                              <span className="hidden sm:inline">Both</span>
                            </Button>
                          </div>
                          {serviceErrors.billingCodes &&
                            !formData.billingCodes[index]
                              .specialCircumstances && (
                              <p className="text-sm text-red-500">
                                Please select a special circumstance
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
                                formData.billingCodes[index]
                                  .specialCircumstances === "TA"
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                handleUpdateBillingCode(index, {
                                  specialCircumstances:
                                    formData.billingCodes[index]
                                      .specialCircumstances === "TA"
                                      ? null
                                      : "TA",
                                })
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
                ))}
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
                      onChange={(e) =>
                        setNewPatient({
                          ...newPatient,
                          billingNumber: e.target.value,
                        })
                      }
                      placeholder="hsn (8 characters)"
                      maxLength={9}
                      className={
                        newPatientErrors.billingNumber ||
                        newPatientErrors.billingNumberCheckDigit
                          ? "border-red-500"
                          : ""
                      }
                    />
                    {(newPatientErrors.billingNumber ||
                      newPatientErrors.billingNumberCheckDigit) && (
                      <p className="text-sm text-red-500">
                        {newPatientErrors.billingNumber
                          ? "Billing number must be exactly 9 characters long"
                          : "Billing number is invalid"}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Date of Birth
                    </label>
                    <Input
                      type="date"
                      value={newPatient.dateOfBirth}
                      onChange={(e) =>
                        setNewPatient({
                          ...newPatient,
                          dateOfBirth: e.target.value,
                        })
                      }
                      className={
                        newPatientErrors.dateOfBirth ? "border-red-500" : ""
                      }
                      required
                    />
                    {newPatientErrors.dateOfBirth && (
                      <p className="text-sm text-red-500">
                        Date of birth is required
                      </p>
                    )}
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
                      !newPatient.dateOfBirth ||
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

          <div className="flex justify-end">
            <Button type="submit">
              {type === "edit" ? "Update" : "Submit"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
