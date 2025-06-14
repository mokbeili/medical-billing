"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClaimStatus } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Layout from "../components/layout/Layout";

interface Service {
  id: string;
  patient: {
    firstName: string;
    lastName: string;
    middleInitial: string | null;
    billingNumber: string;
    physician: {
      id: string;
      firstName: string;
      lastName: string;
      billingNumber: string;
    };
  };
  icdCode: {
    code: string;
    description: string;
  } | null;
  referringPhysician: {
    code: string;
    name: string;
  } | null;
  healthInstitution: {
    name: string;
  } | null;
  serviceCodes: {
    id: number;
    status: ClaimStatus;
    serviceDate: string;
    serviceStartTime: string | null;
    serviceEndTime: string | null;
    summary: string;
    createdAt: string;
    billingCode: {
      code: string;
      title: string;
      description: string | null;
      section: {
        code: string;
        title: string;
        jurisdiction_id: string;
      };
    };
    claim: {
      id: string;
      friendlyId: string;
    } | null;
  }[];
}

export default function ServiceRecordsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [selectedServiceCodes, setSelectedServiceCodes] = useState<number[]>(
    []
  );
  const [filters, setFilters] = useState({
    patientName: "",
    billingNumber: "",
    status: "",
    serviceDate: "",
    code: "",
    section: "",
  });
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await fetch("/api/services");
        if (response.ok) {
          const data = await response.json();
          setServices(data);
          setFilteredServices(data);
        }
      } catch (error) {
        console.error("Error fetching services:", error);
      }
    };

    if (status === "authenticated") {
      fetchServices();
    }
  }, [status]);

  useEffect(() => {
    let filtered = [...services];

    if (filters.status && filters.status !== "ALL") {
      filtered = filtered.filter((service) =>
        service.serviceCodes.some((code) => code.status === filters.status)
      );
    }

    if (filters.patientName) {
      const searchTerm = filters.patientName.toLowerCase();
      filtered = filtered.filter(
        (service) =>
          service.patient.firstName.toLowerCase().includes(searchTerm) ||
          service.patient.lastName.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.billingNumber) {
      const searchTerm = filters.billingNumber.toLowerCase();
      filtered = filtered.filter((service) =>
        service.patient.billingNumber.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.serviceDate) {
      const searchTerm = filters.serviceDate.toLowerCase();
      filtered = filtered.filter((service) =>
        service.serviceCodes.some(
          (code) =>
            new Date(code.serviceDate).toISOString().slice(0, 16) === searchTerm
        )
      );
    }

    if (filters.code) {
      const searchTerm = filters.code.toLowerCase();
      filtered = filtered.filter((service) =>
        service.serviceCodes.some((code) =>
          code.billingCode.code.toLowerCase().includes(searchTerm)
        )
      );
    }

    if (filters.section) {
      const searchTerm = filters.section.toLowerCase();
      filtered = filtered.filter((service) =>
        service.serviceCodes.some(
          (code) =>
            code.billingCode.section.code.toLowerCase().includes(searchTerm) ||
            code.billingCode.section.title.toLowerCase().includes(searchTerm)
        )
      );
    }

    setFilteredServices(filtered);
  }, [services, filters]);

  const handleServiceCodeSelect = (serviceCodeId: number) => {
    const service = services.find((s) =>
      s.serviceCodes.some((c) => c.id === serviceCodeId)
    );
    if (!service) return;

    if (selectedServiceCodes.includes(serviceCodeId)) {
      setSelectedServiceCodes(
        selectedServiceCodes.filter((id) => id !== serviceCodeId)
      );
    } else {
      // Check if this is the first selection
      if (selectedServiceCodes.length === 0) {
        setSelectedServiceCodes([serviceCodeId]);
      } else {
        // Get the first selected service code to compare physician and jurisdiction
        const firstSelected = services.find((s) =>
          s.serviceCodes.some((c) => c.id === selectedServiceCodes[0])
        );
        if (!firstSelected) return;

        // Check if the physician and jurisdiction match
        const firstServiceCode = firstSelected.serviceCodes.find(
          (c) => c.id === selectedServiceCodes[0]
        );
        const currentServiceCode = service.serviceCodes.find(
          (c) => c.id === serviceCodeId
        );

        if (
          firstServiceCode &&
          currentServiceCode &&
          firstSelected.patient.physician?.id ===
            service.patient.physician?.id &&
          firstServiceCode.billingCode.section.jurisdiction_id ===
            currentServiceCode.billingCode.section.jurisdiction_id
        ) {
          setSelectedServiceCodes([...selectedServiceCodes, serviceCodeId]);
        }
      }
    }
  };

  const handleCreateClaim = async () => {
    if (selectedServiceCodes.length === 0) return;

    try {
      const response = await fetch("/api/billing-claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceCodeIds: selectedServiceCodes,
        }),
      });

      if (response.ok) {
        const claim = await response.json();
        // Refresh the service codes list
        const updatedResponse = await fetch("/api/services");
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setServices(data);
          setFilteredServices(data);
        }
        setSelectedServiceCodes([]);
      }
    } catch (error) {
      console.error("Error creating claim:", error);
    }
  };

  if (status === "loading") {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Services</h1>
          <div className="space-x-4">
            {selectedServiceCodes.length > 0 && (
              <Button onClick={handleCreateClaim}>
                Create Claim ({selectedServiceCodes.length})
              </Button>
            )}
            <Link href="/services/new">
              <Button>New Service</Button>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters({ ...filters, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="GENERATED">Generated</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Patient Name</label>
              <Input
                placeholder="Search by patient name"
                value={filters.patientName}
                onChange={(e) =>
                  setFilters({ ...filters, patientName: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Billing Number
              </label>
              <Input
                placeholder="Search by billing number"
                value={filters.billingNumber}
                onChange={(e) =>
                  setFilters({ ...filters, billingNumber: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">
                Service Date and Time
              </label>
              <Input
                type="datetime-local"
                value={filters.serviceDate}
                onChange={(e) =>
                  setFilters({ ...filters, serviceDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Billing Code</label>
              <Input
                placeholder="Search by billing code"
                value={filters.code}
                onChange={(e) =>
                  setFilters({ ...filters, code: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">Section</label>
              <Input
                placeholder="Search by section code or title"
                value={filters.section}
                onChange={(e) =>
                  setFilters({ ...filters, section: e.target.value })
                }
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredServices.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No services found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredServices.map((service) => {
                    // Get the earliest service date from the service codes
                    return (
                      <>
                        <tr key={service.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {`${service.patient.firstName} ${
                              service.patient.lastName
                            }${
                              service.patient.middleInitial
                                ? ` ${service.patient.middleInitial}`
                                : ""
                            }`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(service.serviceDate)
                              .toISOString()
                              .slice(0, 10)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              className="text-blue-600 hover:underline focus:outline-none"
                              onClick={() =>
                                setExpandedServiceId(
                                  expandedServiceId === service.id
                                    ? null
                                    : service.id
                                )
                              }
                            >
                              {expandedServiceId === service.id
                                ? "Hide Codes"
                                : "Show Codes"}
                            </button>
                          </td>
                        </tr>
                        {expandedServiceId === service.id && (
                          <tr>
                            <td colSpan={3} className="bg-gray-50 px-6 py-4">
                              <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 border">
                                  <thead>
                                    <tr>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Billing Code
                                      </th>
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Section
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {service.serviceCodes.map((serviceCode) => {
                                      const claim = serviceCode.claim;
                                      return (
                                        <tr key={serviceCode.id}>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {serviceCode.billingCode.code} -{" "}
                                            {serviceCode.billingCode.title}
                                          </td>
                                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                            {
                                              serviceCode.billingCode.section
                                                .code
                                            }{" "}
                                            -{" "}
                                            {
                                              serviceCode.billingCode.section
                                                .title
                                            }
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
