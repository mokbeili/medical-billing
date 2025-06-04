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

interface ServiceCode {
  id: number;
  status: ClaimStatus;
  serviceDate: string;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
  summary: string;
  createdAt: string;
  code: {
    code: string;
    title: string;
    description: string | null;
    section: {
      code: string;
      title: string;
      jurisdiction_id: string;
    };
  };
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
  claim: {
    id: string;
    friendlyId: string;
  } | null;
}

export default function BillingClaimsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [serviceCodes, setServiceCodes] = useState<ServiceCode[]>([]);
  const [filteredServiceCodes, setFilteredServiceCodes] = useState<
    ServiceCode[]
  >([]);
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

  useEffect(() => {
    const fetchServiceCodes = async () => {
      try {
        const response = await fetch("/api/service-codes");
        if (response.ok) {
          const data = await response.json();
          setServiceCodes(data);
          setFilteredServiceCodes(data);
        }
      } catch (error) {
        console.error("Error fetching service codes:", error);
      }
    };

    if (status === "authenticated") {
      fetchServiceCodes();
    }
  }, [status]);

  useEffect(() => {
    let filtered = [...serviceCodes];

    if (filters.status && filters.status !== "ALL") {
      filtered = filtered.filter((code) => code.status === filters.status);
    }

    if (filters.patientName) {
      const searchTerm = filters.patientName.toLowerCase();
      filtered = filtered.filter(
        (code) =>
          code.patient.firstName.toLowerCase().includes(searchTerm) ||
          code.patient.lastName.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.billingNumber) {
      const searchTerm = filters.billingNumber.toLowerCase();
      filtered = filtered.filter((code) =>
        code.patient.billingNumber.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.serviceDate) {
      const searchTerm = filters.serviceDate.toLowerCase();
      filtered = filtered.filter(
        (code) =>
          new Date(code.serviceDate).toISOString().slice(0, 16) === searchTerm
      );
    }

    if (filters.code) {
      const searchTerm = filters.code.toLowerCase();
      filtered = filtered.filter((code) =>
        code.code.code.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.section) {
      const searchTerm = filters.section.toLowerCase();
      filtered = filtered.filter(
        (code) =>
          code.code.section.code.toLowerCase().includes(searchTerm) ||
          code.code.section.title.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredServiceCodes(filtered);
  }, [serviceCodes, filters]);

  const handleServiceCodeSelect = (serviceCodeId: number) => {
    const serviceCode = serviceCodes.find((sc) => sc.id === serviceCodeId);
    if (!serviceCode) return;

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
        const firstSelected = serviceCodes.find(
          (sc) => sc.id === selectedServiceCodes[0]
        );
        if (!firstSelected) return;

        // Check if the physician and jurisdiction match
        if (
          firstSelected.patient.physician?.id ===
            serviceCode.patient.physician?.id &&
          firstSelected.code.section.jurisdiction_id ===
            serviceCode.code.section.jurisdiction_id
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
        const updatedResponse = await fetch("/api/service-codes");
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setServiceCodes(data);
          setFilteredServiceCodes(data);
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
          <h1 className="text-3xl font-bold text-gray-900">Service Codes</h1>
          <div className="space-x-4">
            {selectedServiceCodes.length > 0 && (
              <Button onClick={handleCreateClaim}>
                Create Claim ({selectedServiceCodes.length})
              </Button>
            )}
            <Link href="/billing-claims/create">
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
          {filteredServiceCodes.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No service codes found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billing Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Billing Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Date and Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Claim
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredServiceCodes.map((serviceCode) => (
                    <tr key={serviceCode.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {!serviceCode.claim && (
                          <input
                            type="checkbox"
                            checked={selectedServiceCodes.includes(
                              serviceCode.id
                            )}
                            onChange={() =>
                              handleServiceCodeSelect(serviceCode.id)
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {serviceCode.code.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {serviceCode.code.section.code} -{" "}
                        {serviceCode.code.section.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {`${serviceCode.patient.firstName} ${
                          serviceCode.patient.lastName
                        }${
                          serviceCode.patient.middleInitial
                            ? ` ${serviceCode.patient.middleInitial}`
                            : ""
                        }`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {serviceCode.patient.billingNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            serviceCode.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : serviceCode.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : serviceCode.status === "SENT"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {serviceCode.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(serviceCode.serviceDate).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {serviceCode.claim ? (
                          <Link
                            href={`/billing-claims/${serviceCode.claim.id}`}
                          >
                            <span className="text-blue-600 hover:text-blue-800">
                              {serviceCode.claim.friendlyId}
                            </span>
                          </Link>
                        ) : (
                          "Not Claimed"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {serviceCode.claim ? (
                          <Link
                            href={`/billing-claims/${serviceCode.claim.id}`}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                            >
                              View Claim
                            </Button>
                          </Link>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-green-50 hover:text-green-600 transition-colors"
                            onClick={() =>
                              handleServiceCodeSelect(serviceCode.id)
                            }
                          >
                            Add to Claim
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
