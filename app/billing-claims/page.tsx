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

interface BillingClaim {
  id: string;
  friendlyId: string;
  physician: {
    firstName: string;
    lastName: string;
    middleInitial: string | null;
  };
  patient: {
    firstName: string;
    lastName: string;
    middleInitial: string | null;
    billingNumber: string;
  };
  claimCodes: {
    status: ClaimStatus;
  }[];
  createdAt: string;
}

export default function BillingClaimsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [claims, setClaims] = useState<BillingClaim[]>([]);
  const [filteredClaims, setFilteredClaims] = useState<BillingClaim[]>([]);
  const [filters, setFilters] = useState({
    status: "PENDING",
    patientName: "",
    billingNumber: "",
  });

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const response = await fetch("/api/billing-claims");
        if (response.ok) {
          const data = await response.json();
          setClaims(data);
          setFilteredClaims(data);
        }
      } catch (error) {
        console.error("Error fetching claims:", error);
      }
    };

    if (status === "authenticated") {
      fetchClaims();
    }
  }, [status]);

  useEffect(() => {
    let filtered = [...claims];

    if (filters.status && filters.status !== "ALL") {
      filtered = filtered.filter((claim) =>
        claim.claimCodes.some((code) => code.status === filters.status)
      );
    }

    if (filters.patientName) {
      const searchTerm = filters.patientName.toLowerCase();
      filtered = filtered.filter(
        (claim) =>
          claim.patient.firstName.toLowerCase().includes(searchTerm) ||
          claim.patient.lastName.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.billingNumber) {
      const searchTerm = filters.billingNumber.toLowerCase();
      filtered = filtered.filter((claim) =>
        claim.patient.billingNumber.toLowerCase().includes(searchTerm)
      );
    }

    setFilteredClaims(filtered);
  }, [claims, filters]);

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
          <h1 className="text-3xl font-bold text-gray-900">Billing Claims</h1>
          <Link href="/billing-claims/create">
            <Button>Create New Claim</Button>
          </Link>
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
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          {filteredClaims.length === 0 ? (
            <div className="p-4">
              <p className="text-gray-500">
                No claims found matching your criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Claim ID
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
                      Created At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClaims.map((claim) => (
                    <tr key={claim.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {claim.friendlyId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {`${claim.patient.firstName} ${claim.patient.lastName}${
                          claim.patient.middleInitial
                            ? ` ${claim.patient.middleInitial}`
                            : ""
                        }`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {claim.patient.billingNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            claim.claimCodes[0]?.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : claim.claimCodes[0]?.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : claim.claimCodes[0]?.status === "SENT"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {claim.claimCodes[0]?.status || "PENDING"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(claim.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Link href={`/billing-claims/${claim.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                          >
                            View Details
                          </Button>
                        </Link>
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
