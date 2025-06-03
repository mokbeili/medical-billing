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
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  billingNumber: string;
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
    middleInitial: "",
    billingNumber: "",
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
  });

  const [errors, setErrors] = useState({
    physician: false,
    patient: false,
    billingCodes: false,
    serviceDate: false,
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
        setErrors({ ...errors, physician: true });
        return;
      }

      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: newPatient.firstName,
          lastName: newPatient.lastName,
          middleInitial: newPatient.middleInitial || null,
          billingNumber: newPatient.billingNumber,
          physicianId: formData.physicianId,
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
        middleInitial: "",
        billingNumber: "",
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
      const response = await fetch("/api/service-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user?.id}`,
        },
        body: JSON.stringify({
          ...formData,
          serviceDate: new Date(formData.serviceDate).toISOString(),
          serviceStartTime: formData.serviceStartTime
            ? new Date(formData.serviceStartTime).toISOString()
            : null,
          serviceEndTime: formData.serviceEndTime
            ? new Date(formData.serviceEndTime).toISOString()
            : null,
        }),
      });

      console.log(response);

      if (response.ok) {
        router.push("/billing-claims");
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
        <h1 className="text-2xl font-bold mb-6">Create New Service Codes</h1>
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
                          Middle Initial
                        </label>
                        <Input
                          value={newPatient.middleInitial}
                          onChange={(e) =>
                            setNewPatient({
                              ...newPatient,
                              middleInitial: e.target.value,
                            })
                          }
                          placeholder="M.I."
                          maxLength={1}
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
                          placeholder="Billing number"
                        />
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
                          !newPatient.billingNumber
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
