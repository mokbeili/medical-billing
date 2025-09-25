"use client";

import Layout from "@/app/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatFullDate } from "@/lib/dateUtils";
import { ServiceStatus } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

interface Service {
  id: string;
  serviceDate: string;
  claimId: string | null;
  status: ServiceStatus;
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
    specialCircumstances: string | null;
    bilateralIndicator: string | null;
    serviceStartTime: string | null;
    serviceEndTime: string | null;
    serviceDate: string | null;
    summary: string;
    createdAt: string;
    billingCode: {
      code: string;
      title: string;
      description: string | null;
      billing_record_type: number;
      section: {
        code: string;
        title: string;
        jurisdiction_id: string;
      };
    };
    changeLogs?: {
      changeType: string;
      roundingDate: string | null;
    }[];
  }[];
}

export default function ServiceRecordsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    patientName: "",
    billingNumber: "",
    status: "OPEN", // Default to open services
    serviceDate: "",
    code: "",
    section: "",
    includeClaimed: false,
  });
  const [sortBy, setSortBy] = useState("lastNameAsc"); // Default sort by last name ascending
  const [showFilters, setShowFilters] = useState(false);
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
    let filtered = [...services];

    // Filter out services with claims by default unless includeClaimed is true
    if (!filters.includeClaimed) {
      filtered = filtered.filter((service) => service.claimId === null);
    }

    if (filters.status && filters.status !== "ALL") {
      if (filters.status === "OPEN_PENDING") {
        filtered = filtered.filter(
          (service) => service.status === "OPEN" || service.status === "PENDING"
        );
      } else if (filters.status === "BILLED_TODAY") {
        filtered = filtered.filter((service) => isBilledToday(service));
      } else {
        filtered = filtered.filter(
          (service) => service.status === filters.status
        );
      }
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
      const searchTerm = filters.serviceDate;

      filtered = filtered.filter((service) => {
        // Parse service date in local timezone
        const serviceDate = new Date(service.serviceDate);

        // Parse filter date as UTC to avoid timezone shifts
        // searchTerm is in YYYY-MM-DD format, so we append 'T00:00:00.000Z' to make it UTC
        const filterDate = new Date(searchTerm + "T00:00:00.000Z");

        // Compare year, month, and day only (ignore time and timezone)
        // Use UTC methods for filterDate to avoid timezone conversion
        return (
          serviceDate.getFullYear() === filterDate.getUTCFullYear() &&
          serviceDate.getMonth() === filterDate.getUTCMonth() &&
          serviceDate.getDate() === filterDate.getUTCDate()
        );
      });
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

    // Apply sorting
    filtered = sortServices(filtered, sortBy);

    setFilteredServices(filtered);
  }, [services, filters, sortBy]);

  const handleServiceSelect = (serviceId: string) => {
    if (selectedServices.includes(serviceId)) {
      setSelectedServices(selectedServices.filter((id) => id !== serviceId));
    } else {
      // Check if this is the first selection
      if (selectedServices.length === 0) {
        setSelectedServices([serviceId]);
      } else {
        // Get the first selected service to compare physician and jurisdiction
        const firstSelected = services.find(
          (s) => s.id === selectedServices[0]
        );
        const currentService = services.find((s) => s.id === serviceId);

        if (!firstSelected || !currentService) return;

        // Check if the physician and jurisdiction match
        const firstServiceCode = firstSelected.serviceCodes[0];
        const currentServiceCode = currentService.serviceCodes[0];

        if (
          firstServiceCode &&
          currentServiceCode &&
          firstSelected.patient.physician?.id ===
            currentService.patient.physician?.id &&
          firstServiceCode.billingCode.section.jurisdiction_id ===
            currentServiceCode.billingCode.section.jurisdiction_id
        ) {
          setSelectedServices([...selectedServices, serviceId]);
        }
      }
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
        const claim = await response.json();
        // Refresh the service codes list
        const updatedResponse = await fetch("/api/services");
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setServices(data);
          setFilteredServices(data);
        }
        setSelectedServices([]);
      }
    } catch (error) {
      console.error("Error creating claim:", error);
    }
  };

  const handleFinishService = async (serviceId: string) => {
    try {
      const response = await fetch(`/api/services/${serviceId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "PENDING" }),
      });

      if (response.ok) {
        // Refresh the services list
        const updatedResponse = await fetch("/api/services");
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setServices(data);
          setFilteredServices(data);
        }
      } else {
        console.error("Error updating service status");
      }
    } catch (error) {
      console.error("Error finishing service:", error);
    }
  };

  const handleSelectAll = () => {
    if (filteredServices.length === 0) return;

    // If all filtered services are already selected, deselect all
    if (
      filteredServices.every((service) => selectedServices.includes(service.id))
    ) {
      setSelectedServices([]);
      return;
    }

    // Get the first service to use as reference for validation
    const firstService = filteredServices[0];
    const firstServiceCode = firstService.serviceCodes[0];

    // Only select services that match the first service's physician and jurisdiction
    const validServices = filteredServices.filter((service) => {
      const serviceCode = service.serviceCodes[0];
      return (
        service.patient.physician?.id === firstService.patient.physician?.id &&
        serviceCode.billingCode.section.jurisdiction_id ===
          firstServiceCode.billingCode.section.jurisdiction_id
      );
    });

    setSelectedServices(validServices.map((service) => service.id));
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
          <h1 className="text-3xl font-bold text-gray-900">Claims</h1>
          <div className="space-x-4">
            {selectedServices.length > 0 && (
              <Button onClick={handleCreateClaim}>
                Create Submission ({selectedServices.length})
              </Button>
            )}
            <Link href="/services/new">
              <Button>New Claim</Button>
            </Link>
          </div>
        </div>

        {/* Collapsible Filter Section */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center text-left flex-1"
              >
                <h2 className="text-lg font-medium text-gray-900">
                  Search, Sort & Filter
                </h2>
                <svg
                  className={`w-5 h-5 ml-2 transform transition-transform ${
                    showFilters ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {!showFilters &&
                (filters.patientName ||
                  filters.billingNumber ||
                  filters.code ||
                  filters.section ||
                  filters.serviceDate ||
                  filters.status !== "OPEN" ||
                  sortBy !== "lastNameAsc") && (
                  <button
                    onClick={() => {
                      setFilters({
                        patientName: "",
                        billingNumber: "",
                        status: "OPEN",
                        serviceDate: "",
                        code: "",
                        section: "",
                        includeClaimed: false,
                      });
                      setSortBy("lastNameAsc");
                    }}
                    className="ml-2 p-1 text-red-500 hover:text-red-700 transition-colors"
                    title="Clear all filters"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
            </div>
          </div>

          {showFilters && (
            <div className="p-4 space-y-6">
              {/* Search Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Search
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Patient Name
                    </label>
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
                      Health Services Number
                    </label>
                    <Input
                      placeholder="Search by billing number"
                      value={filters.billingNumber}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          billingNumber: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Billing Code
                    </label>
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

              {/* Sort Section */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Sort By
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Sort Order
                    </label>
                    <Select
                      value={sortBy}
                      onValueChange={(value) => setSortBy(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select sort order" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lastNameAsc">
                          Last Name (A-Z)
                        </SelectItem>
                        <SelectItem value="lastNameDesc">
                          Last Name (Z-A)
                        </SelectItem>
                        <SelectItem value="firstNameAsc">
                          First Name (A-Z)
                        </SelectItem>
                        <SelectItem value="firstNameDesc">
                          First Name (Z-A)
                        </SelectItem>
                        <SelectItem value="admitDateAsc">
                          Admit Date (Oldest First)
                        </SelectItem>
                        <SelectItem value="admitDateDesc">
                          Admit Date (Newest First)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Filter Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Filters</h3>
                  <button
                    onClick={() => {
                      setFilters({
                        patientName: "",
                        billingNumber: "",
                        status: "OPEN",
                        serviceDate: "",
                        code: "",
                        section: "",
                        includeClaimed: false,
                      });
                      setSortBy("lastNameAsc");
                    }}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear All
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <SelectItem value="OPEN">Open</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="OPEN_PENDING">
                          Open/Pending
                        </SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="BILLED_TODAY">
                          Billed Today
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Admission Date
                    </label>
                    <Input
                      type="date"
                      value={filters.serviceDate}
                      onChange={(e) =>
                        setFilters({ ...filters, serviceDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">
                      Include Claims with Submissions
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filters.includeClaimed}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            includeClaimed: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-500">
                        Show claims with submissions
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredServices.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No claims found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredServices.length > 0 &&
                            filteredServices.every((service) =>
                              selectedServices.includes(service.id)
                            )
                          }
                          onChange={handleSelectAll}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2">Select</span>
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Admission Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
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
                      <React.Fragment key={service.id}>
                        <tr key={service.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <input
                              type="checkbox"
                              checked={selectedServices.includes(service.id)}
                              onChange={() => handleServiceSelect(service.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              disabled={
                                service.claimId !== null ||
                                service.status !== "PENDING"
                              }
                            />
                          </td>
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
                            {formatFullDate(
                              new Date(service.serviceDate)
                                .toISOString()
                                .slice(0, 10)
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                service.status === "OPEN"
                                  ? "bg-green-100 text-green-800"
                                  : service.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : service.status === "SENT"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {service.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
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
                              {service.claimId === null && (
                                <Link
                                  href={`/services/edit/${service.id}`}
                                  className="text-green-600 hover:underline focus:outline-none"
                                >
                                  Edit
                                </Link>
                              )}
                              {service.status === "OPEN" &&
                                service.claimId === null && (
                                  <button
                                    className="text-orange-600 hover:underline focus:outline-none"
                                    onClick={() =>
                                      handleFinishService(service.id)
                                    }
                                  >
                                    Approve & Finish
                                  </button>
                                )}
                            </div>
                          </td>
                        </tr>
                        {expandedServiceId === service.id && (
                          <tr>
                            <td colSpan={5} className="bg-gray-50 px-6 py-4">
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
                                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {service.serviceCodes.map((serviceCode) => {
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
                                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                            {formatFullDate(
                                              serviceCode.serviceDate ||
                                                service.serviceDate
                                            )}
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
                      </React.Fragment>
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
