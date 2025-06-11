"use client";

import Layout from "@/app/components/layout/Layout";
import { HealthInstitutionSelect } from "@/components/health-institution-select";
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
import { Textarea } from "@/components/ui/textarea";
import { useSearchThrottle } from "@/lib/hooks/useSearchThrottle";
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
  section: {
    code: string;
    title: string;
  };
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

export default function CreateServiceCodePage() {
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
    physicianId: "",
    patientId: "",
    referringPhysicianId: null as number | null,
    icdCodeId: null as number | null,
    healthInstitutionId: null as number | null,
    summary: "",
    serviceDate: "",
    serviceStartTime: "",
    serviceEndTime: "",
    billingCodes: [] as { codeId: number; status: string }[],
    numberOfUnits: 1,
    serviceLocation: "",
    specialCircumstances: null as string | null,
    bilateralIndicator: null as string | null,
    claimType: null as string | null,
  });

  const [errors, setErrors] = useState({
    physician: false,
    patient: false,
    billingCodes: false,
    serviceDate: false,
    billingNumber: false,
    dateOfBirth: false,
    sex: false,
  });

  useEffect(() => {
    const fetchPhysicians = async () => {
      try {
        const response = await fetch("/api/physicians");
        if (response.ok) {
          const data = await response.json();
          if (data.length === 1) {
            setFormData({
              ...formData,
              physicianId: data[0].id,
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

  const searchBillingCodes = async (query: string) => {
    const response = await fetch(
      `/api/search?query=${encodeURIComponent(
        query
      )}&jurisdictionId=${1}&userId=${session?.user?.id}`
    );
    if (response.ok) {
      const data = await response.json();
      return data.results as BillingCode[];
    }
    return [];
  };

  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    results: searchResults,
    isSearching,
  } = useSearchThrottle<BillingCode>(searchBillingCodes, {
    minLength: 2,
    debounceMs: 300,
    throttleMs: 1000,
  });

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
        setErrors({ ...errors, physician: true, billingNumber: false });
        return;
      }

      if (newPatient.billingNumber.length !== 8) {
        setErrors({ ...errors, billingNumber: true });
        return;
      }

      if (!newPatient.dateOfBirth) {
        setErrors({ ...errors, dateOfBirth: true });
        return;
      }

      if (!newPatient.sex) {
        setErrors({ ...errors, sex: true });
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
      // You might want to show an error message to the user here
    }
  };

  const handleAddCode = (code: BillingCode) => {
    if (!selectedCodes.find((c) => c.id === code.id)) {
      setSelectedCodes([...selectedCodes, code]);
      setFormData({
        ...formData,
        billingCodes: [
          ...formData.billingCodes,
          { codeId: code.id, status: "PENDING" },
        ],
      });
    }
    setErrors({ ...errors, billingCodes: false });
    setSearchQuery("");
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
    const newErrors = {
      physician: !formData.physicianId,
      patient: !formData.patientId,
      billingCodes: formData.billingCodes.length === 0,
      serviceDate: !formData.serviceDate,
      billingNumber: false,
      dateOfBirth: !newPatient.dateOfBirth,
      sex: !newPatient.sex,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
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
      // Create base date from service date
      const baseDate = new Date(formData.serviceDate);

      // Helper function to combine date and time
      const combineDateTime = (date: Date, timeStr: string) => {
        if (!timeStr) return null;
        const [hours, minutes] = timeStr.split(":").map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate.toISOString();
      };

      const requestData = {
        ...formData,
        serviceDate: baseDate.toISOString(),
        serviceStartTime: combineDateTime(baseDate, formData.serviceStartTime),
        serviceEndTime: combineDateTime(baseDate, formData.serviceEndTime),
      };

      console.log(requestData);
      const response = await fetch("/api/service-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user?.id}`,
        },
        body: JSON.stringify(requestData),
      });

      console.log(response);

      if (response.ok) {
        router.push("/service-records");
      } else {
        console.error("Failed to create service codes:", await response.text());
      }
    } catch (error) {
      console.error("Error creating service codes:", error);
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
    <Layout>
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Create Service Records</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {physicians.length > 1 && (
                  <>
                    <label className="block text-sm font-medium">
                      Physician
                    </label>
                    <Select
                      value={formData.physicianId}
                      onValueChange={(value) =>
                        setFormData({ ...formData, physicianId: value })
                      }
                    >
                      <SelectTrigger
                        className={errors.physician ? "border-red-500" : ""}
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
                {errors.physician && (
                  <p className="text-sm text-red-500">
                    Please select a physician
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Patient</label>
                {!isCreatingPatient ? (
                  <>
                    <Select
                      value={formData.patientId}
                      onValueChange={(value: string) => {
                        setFormData({ ...formData, patientId: value });
                        setErrors({ ...errors, patient: false });
                      }}
                    >
                      <SelectTrigger
                        className={errors.patient ? "border-red-500" : ""}
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
                    {errors.patient && (
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
                          Billing Number
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
                          maxLength={8}
                          className={
                            errors.billingNumber ? "border-red-500" : ""
                          }
                        />
                        {errors.billingNumber && (
                          <p className="text-sm text-red-500">
                            Billing number must be exactly 8 characters long
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
                          className={errors.dateOfBirth ? "border-red-500" : ""}
                          required
                        />
                        {errors.dateOfBirth && (
                          <p className="text-sm text-red-500">
                            Date of birth is required
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="block text-sm font-medium">Sex</label>
                        <Select
                          value={newPatient.sex}
                          onValueChange={(value) =>
                            setNewPatient({
                              ...newPatient,
                              sex: value,
                            })
                          }
                        >
                          <SelectTrigger
                            className={errors.sex ? "border-red-500" : ""}
                          >
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Male</SelectItem>
                            <SelectItem value="F">Female</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.sex && (
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
                          newPatient.billingNumber.length !== 8 ||
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

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Referring Physician
                </label>
                <div className="relative">
                  <Input
                    placeholder="Search referring physicians..."
                    value={referringPhysicianSearchQuery}
                    onChange={(e) =>
                      setReferringPhysicianSearchQuery(e.target.value)
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
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Description</label>
                <Textarea
                  placeholder="Enter a detailed description of the claim"
                  value={formData.summary}
                  onChange={(e) =>
                    setFormData({ ...formData, summary: e.target.value })
                  }
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Service Date
                </label>
                <Input
                  type="date"
                  value={formData.serviceDate}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceDate: e.target.value })
                  }
                  className={errors.serviceDate ? "border-red-500" : ""}
                />
                {errors.serviceDate && (
                  <p className="text-sm text-red-500">
                    Please select a service date
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Service Start Time
                </label>
                <Input
                  type="time"
                  value={formData.serviceStartTime}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      serviceStartTime: e.target.value,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Service End Time
                </label>
                <Input
                  type="time"
                  value={formData.serviceEndTime}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceEndTime: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Number of Units
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.numberOfUnits}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      numberOfUnits: parseInt(e.target.value) || 1,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Service Location
                </label>
                <Select
                  value={formData.serviceLocation || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      serviceLocation: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select service location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="R">Regina</SelectItem>
                    <SelectItem value="S">Saskatoon</SelectItem>
                    <SelectItem value="X">
                      Rural and Northern Premium
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Special Circumstances
                </label>
                <Select
                  value={formData.specialCircumstances || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      specialCircumstances: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select special circumstances" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="TF">TF</SelectItem>
                    <SelectItem value="PF">PF</SelectItem>
                    <SelectItem value="CF">CF</SelectItem>
                    <SelectItem value="TA">TA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Bilateral Indicator
                </label>
                <Select
                  value={formData.bilateralIndicator || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      bilateralIndicator: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bilateral indicator" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="L">Left</SelectItem>
                    <SelectItem value="R">Right</SelectItem>
                    <SelectItem value="B">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Claim Type</label>
                <Select
                  value={formData.claimType || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      claimType: value === "none" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select claim type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="P">P</SelectItem>
                    <SelectItem value="W">W</SelectItem>
                    <SelectItem value="D">D</SelectItem>
                  </SelectContent>
                </Select>
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
                        <span className="font-medium">
                          {selectedIcdCode.code}
                        </span>{" "}
                        - {selectedIcdCode.description}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveIcdCode}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Billing Codes
                </label>
                <div className="relative">
                  <Input
                    placeholder="Search billing codes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={errors.billingCodes ? "border-red-500" : ""}
                  />
                  {isSearching && (
                    <div className="absolute right-2 top-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                    </div>
                  )}
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {searchResults.map((code) => (
                        <div
                          key={code.id}
                          className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleAddCode(code)}
                        >
                          <div className="font-medium">
                            {code.code} ({code.section.title})
                          </div>
                          <div className="text-sm text-gray-600">
                            {code.title}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {errors.billingCodes && (
                  <p className="text-sm text-red-500">
                    Please add at least one billing code
                  </p>
                )}

                {selectedCodes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {selectedCodes.map((code) => (
                      <div
                        key={code.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                      >
                        <div>
                          <span className="font-medium">{code.code}</span> -{" "}
                          {code.title}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveCode(code.id)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Health Institution
                </label>
                <HealthInstitutionSelect
                  value={formData.healthInstitutionId || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, healthInstitutionId: value })
                  }
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit">Create Service Codes</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </Layout>
  );
}
