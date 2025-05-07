"use client";

import Layout from "@/app/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

export default function CreateBillingClaimPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BillingCode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCodes, setSelectedCodes] = useState<BillingCode[]>([]);
  const [newPatient, setNewPatient] = useState({
    firstName: "",
    lastName: "",
    middleInitial: "",
    billingNumber: "",
  });
  const [formData, setFormData] = useState({
    physicianId: "",
    patientId: "",
    summary: "",
    billingCodes: [] as { codeId: number; status: string }[],
  });

  const [errors, setErrors] = useState({
    physician: false,
    patient: false,
    billingCodes: false,
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

    fetchPhysicians();
    fetchPatients();
  }, []);

  useEffect(() => {
    const searchBillingCodes = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/search?query=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.results);
        }
      } catch (error) {
        console.error("Error searching billing codes:", error);
      } finally {
        setIsSearching(false);
      }
    };
    setSearchResults([]);
    const debounceTimer = setTimeout(searchBillingCodes, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

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
    setSearchResults([]);
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

  const validateForm = () => {
    const newErrors = {
      physician: !formData.physicianId,
      patient: !formData.patientId,
      billingCodes: formData.billingCodes.length === 0,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log(formData);
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
      const response = await fetch("/api/billing-claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.user?.id}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push("/billing-claims");
      } else {
        console.error("Failed to create billing claim:", await response.text());
      }
    } catch (error) {
      console.error("Error creating billing claim:", error);
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
      <div className="container mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create New Billing Claim</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {physicians.length !== 1 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    Physician Profile
                  </label>
                  <Select
                    value={formData.physicianId}
                    onValueChange={(value: string) => {
                      setFormData({ ...formData, physicianId: value });
                      setErrors({ ...errors, physician: false });
                    }}
                  >
                    <SelectTrigger
                      className={errors.physician ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="Select physician" />
                    </SelectTrigger>
                    <SelectContent>
                      {physicians.map((physician) => (
                        <SelectItem key={physician.id} value={physician.id}>
                          {`${physician.firstName} ${physician.lastName}${
                            physician.middleInitial
                              ? ` ${physician.middleInitial}`
                              : ""
                          }`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.physician && (
                    <p className="text-sm text-red-500">
                      Please select a physician
                    </p>
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
                <label className="block text-sm font-medium">Summary</label>
                <Textarea
                  value={formData.summary}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setFormData({ ...formData, summary: e.target.value })
                  }
                  placeholder="Enter claim summary"
                  className="min-h-[200px]"
                />
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

              <div className="flex justify-end">
                <Button type="submit">Create Claim</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
