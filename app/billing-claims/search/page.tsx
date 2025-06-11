"use client";

import Layout from "@/app/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface BillingClaim {
  id: string;
  friendlyId: string;
  batchClaimText: string | null;
  createdAt: string;
  updatedAt: string;
  physician: {
    firstName: string;
    lastName: string;
    billingNumber: string;
    groupNumber: string;
  };
  jurisdiction: {
    country: string;
    region: string;
  };
  serviceCodes: {
    id: number;
    status: string;
    code: {
      code: string;
      title: string;
    };
  }[];
}

export default function BillingClaimsSearchPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [claims, setClaims] = useState<BillingClaim[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        const response = await fetch("/api/billing-claims");
        if (response.ok) {
          const data = await response.json();
          setClaims(data);
        }
      } catch (error) {
        console.error("Error fetching claims:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchClaims();
    }
  }, [status]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const filteredClaims = claims.filter((claim) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      claim.friendlyId.toLowerCase().includes(searchLower) ||
      claim.physician.firstName.toLowerCase().includes(searchLower) ||
      claim.physician.lastName.toLowerCase().includes(searchLower) ||
      claim.physician.billingNumber.toLowerCase().includes(searchLower) ||
      claim.jurisdiction.country.toLowerCase().includes(searchLower) ||
      claim.jurisdiction.region.toLowerCase().includes(searchLower)
    );
  });

  const handleDownload = (claim: BillingClaim) => {
    if (!claim.batchClaimText) return;

    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, "0") +
      now.getDate().toString().padStart(2, "0") +
      now.getHours().toString().padStart(2, "0") +
      now.getMinutes().toString().padStart(2, "0") +
      now.getSeconds().toString().padStart(2, "0");

    const blob = new Blob([claim.batchClaimText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${claim.physician.groupNumber}_${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (status === "loading" || isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
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
      <div className="min-h-screen bg-gray-50">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Billing Claims</h1>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4">
            <Input
              type="text"
              placeholder="Search claims by ID, physician, or jurisdiction..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="max-w-md"
            />
          </div>
        </div>

        <div className="grid gap-6">
          {filteredClaims.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">
              No claims found
            </div>
          ) : (
            filteredClaims.map((claim) => (
              <Card key={claim.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>Claim {claim.friendlyId}</CardTitle>
                    {claim.batchClaimText && (
                      <Button
                        variant="outline"
                        onClick={() => handleDownload(claim)}
                      >
                        Download Batch Claim
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Physician
                      </h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {claim.physician.firstName} {claim.physician.lastName} (
                        {claim.physician.billingNumber})
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Jurisdiction
                      </h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {claim.jurisdiction.region},{" "}
                        {claim.jurisdiction.country}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Service Codes
                      </h3>
                      <div className="mt-1 space-y-1">
                        {claim.serviceCodes.map((serviceCode) => (
                          <p
                            key={serviceCode.id}
                            className="text-sm text-gray-900"
                          >
                            {serviceCode.code.code} - {serviceCode.code.title} (
                            {serviceCode.status})
                          </p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Created At
                      </h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {new Date(claim.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}
