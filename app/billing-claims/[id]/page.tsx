"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClaimStatus } from "@prisma/client";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface BillingClaim {
  id: string;
  friendlyId: string;
  summary: string;
  serviceDate: string;
  physician: {
    firstName: string;
    lastName: string;
    middleInitial: string | null;
    billingNumber: string;
  };
  patient: {
    firstName: string;
    lastName: string;
    middleInitial: string | null;
    billingNumber: string;
  };
  healthInstitution?: {
    id: number;
    name: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } | null;
  icdCode?: {
    id: number;
    version: string;
    code: string;
    description: string;
  } | null;
  serviceCodes: {
    id: number;
    status: ClaimStatus;
    code: {
      code: string;
      title: string;
      description: string | null;
      section: {
        code: string;
        title: string;
      };
    };
  }[];
  createdAt: string;
  updatedAt: string;
}

export default function BillingClaimDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [claim, setClaim] = useState<BillingClaim | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClaim = async () => {
      try {
        const response = await fetch(`/api/billing-claims/${params.id}`);
        if (response.ok) {
          const data = await response.json();
          setClaim(data);
        } else {
          router.push("/billing-claims");
        }
      } catch (error) {
        console.error("Error fetching claim:", error);
        router.push("/billing-claims");
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchClaim();
    }
  }, [params.id, status, router]);

  if (status === "loading" || isLoading) {
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

  if (!claim) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Claim Not Found</h1>
          <p className="mt-2 text-gray-600">
            The requested claim could not be found.
          </p>
          <Link href="/billing-claims" className="mt-4 inline-block">
            <Button>Back to Claims</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Claim Details</h1>
        <div className="space-x-2">
          <Link href="/billing-claims">
            <Button variant="outline">Back to Claims</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Claim Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Claim ID</h3>
              <p className="mt-1 text-sm text-gray-900">{claim.friendlyId}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Service Date and Time
              </h3>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(claim.serviceDate).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Created At</h3>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(claim.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Last Updated
              </h3>
              <p className="mt-1 text-sm text-gray-900">
                {new Date(claim.updatedAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Name</h3>
              <p className="mt-1 text-sm text-gray-900">
                {`${claim.patient.firstName} ${claim.patient.lastName}${
                  claim.patient.middleInitial
                    ? ` ${claim.patient.middleInitial}`
                    : ""
                }`}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Billing Number
              </h3>
              <p className="mt-1 text-sm text-gray-900">
                {claim.patient.billingNumber}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Physician Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Name</h3>
              <p className="mt-1 text-sm text-gray-900">
                {`${claim.physician.firstName} ${claim.physician.lastName}${
                  claim.physician.middleInitial
                    ? ` ${claim.physician.middleInitial}`
                    : ""
                }`}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Billing Number
              </h3>
              <p className="mt-1 text-sm text-gray-900">
                {claim.physician.billingNumber}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">
              {claim.summary}
            </p>
          </CardContent>
        </Card>

        {claim.healthInstitution && (
          <Card>
            <CardHeader>
              <CardTitle>Health Institution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {claim.healthInstitution.name}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Address</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {claim.healthInstitution.street}
                  <br />
                  {claim.healthInstitution.city},{" "}
                  {claim.healthInstitution.state}{" "}
                  {claim.healthInstitution.postalCode}
                  <br />
                  {claim.healthInstitution.country}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {claim.icdCode && (
          <Card>
            <CardHeader>
              <CardTitle>ICD Diagnosis Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Code</h3>
                <p className="mt-1 text-sm text-gray-900">
                  {claim.icdCode.code} ({claim.icdCode.version})
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">
                  Description
                </h3>
                <p className="mt-1 text-sm text-gray-900">
                  {claim.icdCode.description}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Billing Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Section
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {claim.serviceCodes.map((serviceCode) => (
                    <tr key={serviceCode.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {serviceCode.code.code}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {serviceCode.code.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {serviceCode.code.section.code} -{" "}
                        {serviceCode.code.section.title}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
