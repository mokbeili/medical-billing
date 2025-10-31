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
import { formatDateTime } from "@/lib/dateUtils";
import { ServiceStatus } from "@prisma/client";
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
  services: {
    id: number;
    status: ServiceStatus;
    serviceDate: string;
    summary: string;
    serviceCodes: {
      id: number;
      billingCode: {
        code: string;
        title: string;
      };
    }[];
  }[];
}

interface Physician {
  id: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  billingNumber: string;
  groupNumber?: string;
  jurisdiction: {
    country: string;
    region: string;
  };
}

export default function BillingClaimsSearchPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [claims, setClaims] = useState<BillingClaim[]>([]);
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhysicianId, setSelectedPhysicianId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const checkUserRole = async () => {
      try {
        const response = await fetch("/api/user");
        if (response.ok) {
          const userData = await response.json();
          setIsAdmin(userData.roles.includes("ADMIN"));
        }
      } catch (error) {
        console.error("Error checking user role:", error);
      }
    };

    if (status === "authenticated") {
      checkUserRole();
    }
  }, [status]);

  useEffect(() => {
    const fetchPhysicians = async () => {
      if (!isAdmin) return;

      try {
        const response = await fetch("/api/physicians/admin");
        if (response.ok) {
          const data = await response.json();
          setPhysicians(data);
        }
      } catch (error) {
        console.error("Error fetching physicians:", error);
      }
    };

    if (isAdmin) {
      fetchPhysicians();
    }
  }, [isAdmin]);

  useEffect(() => {
    const fetchClaims = async () => {
      try {
        let url = "/api/billing-claims";
        if (isAdmin && selectedPhysicianId) {
          url += `?physicianId=${selectedPhysicianId}`;
        }

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setClaims(data);
        }
      } catch (error) {
        console.error("Error fetching submissions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchClaims();
    }
  }, [status, isAdmin, selectedPhysicianId]);

  const handleSearch = (query: string) => {
    setSelectedPhysicianId("");
    setSearchQuery(query);
    // Clear physician selection when user starts typing in search field
    if (query && selectedPhysicianId) {
      setSelectedPhysicianId("");
    }
  };

  const handlePhysicianChange = (physicianId: string) => {
    if (physicianId === "all") {
      setSelectedPhysicianId("");
    } else {
      setSelectedPhysicianId(physicianId);
    }
    setIsLoading(true);
  };

  const handleClearFilter = () => {
    setSelectedPhysicianId("");
    setIsLoading(true);
  };

  const handleDelete = async (claim: BillingClaim) => {
    if (!window.confirm("Are you sure you want to delete this claim?")) {
      return;
    }

    try {
      setIsDeleting(true);
      const response = await fetch(`/api/billing-claims/${claim.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setClaims((prevClaims) => prevClaims.filter((c) => c.id !== claim.id));
      } else {
        const error = await response.text();
        alert(error || "Failed to delete submission");
      }
    } catch (error) {
      console.error("Error deleting submission:", error);
      alert("Failed to delete submission");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateStatus = async (claim: BillingClaim) => {
    if (
      !window.confirm(
        "Are you sure you want to update this claim's status to SENT?"
      )
    ) {
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/billing-claims/${claim.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: ServiceStatus.SENT }),
      });

      if (response.ok) {
        setClaims((prevClaims) =>
          prevClaims.map((c) =>
            c.id === claim.id
              ? {
                  ...c,
                  services: c.services.map((s) => ({
                    ...s,
                    status: ServiceStatus.SENT,
                  })),
                }
              : c
          )
        );
      } else {
        const error = await response.text();
        alert(error || "Failed to update submission status");
      }
    } catch (error) {
      console.error("Error updating submission status:", error);
      alert("Failed to update submission status");
    } finally {
      setIsUpdating(false);
    }
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

  const handleDownloadAll = async () => {
    if (!window.confirm("Are you sure you want to download all submissions?")) {
      return;
    }

    try {
      let apiUrl = "/api/billing-claims/download-all";
      if (selectedPhysicianId) {
        apiUrl += `?physicianId=${selectedPhysicianId}`;
      }

      const response = await fetch(apiUrl);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = selectedPhysicianId
          ? `physician_submissions_${selectedPhysicianId}.zip`
          : "all_submissions.zip";
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else {
        const error = await response.text();
        alert(error || "Failed to download all submissions");
      }
    } catch (error) {
      console.error("Error downloading all submissions:", error);
      alert("Failed to download all submissions");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedFileType) {
      alert("Please select a file type and a file");
      return;
    }

    try {
      setIsUploading(true);

      // Read the file content
      const fileContent = await selectedFile.text();

      const response = await fetch("/api/return-files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileType: selectedFileType,
          fileContent,
          fileName: selectedFile.name,
        }),
      });

      if (response.ok) {
        alert("File uploaded successfully");
        setSelectedFile(null);
        setSelectedFileType("");
        // Reset the file input
        const fileInput = document.getElementById(
          "file-input"
        ) as HTMLInputElement;
        if (fileInput) {
          fileInput.value = "";
        }
      } else {
        const error = await response.json();
        alert(error.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Submissionsas</h1>
          {isAdmin && selectedPhysicianId && (
            <p className="mt-2 text-sm text-gray-600">
              Viewing submissions for:{" "}
              {physicians.find((p) => p.id === selectedPhysicianId)?.lastName},{" "}
              {physicians.find((p) => p.id === selectedPhysicianId)?.firstName}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {isLoading
              ? "Loading submissions..."
              : `${filteredClaims.length} submission${
                  filteredClaims.length !== 1 ? "s" : ""
                } found`}
            {!isLoading &&
              isAdmin &&
              selectedPhysicianId &&
              ` for selected physician`}
            {!isLoading &&
              isAdmin &&
              !selectedPhysicianId &&
              " across all physicians"}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 space-y-4">
            {isAdmin && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Search submissions by ID, physician, or jurisdiction... (clears physician filter)"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="max-w-md"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Filter by Physician:
                  </label>
                  <Select
                    value={selectedPhysicianId || "all"}
                    onValueChange={handlePhysicianChange}
                  >
                    <SelectTrigger className="w-80">
                      <SelectValue placeholder="Select a physician to filter submissions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Physicians</SelectItem>
                      {physicians.map((physician) => (
                        <SelectItem key={physician.id} value={physician.id}>
                          {physician.lastName}, {physician.firstName}{" "}
                          {physician.middleInitial || ""}(
                          {physician.billingNumber}) -{" "}
                          {physician.jurisdiction.region},{" "}
                          {physician.jurisdiction.country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPhysicianId && (
                  <Button
                    variant="outline"
                    onClick={handleClearFilter}
                    className="text-sm"
                  >
                    Clear Filter
                  </Button>
                )}

                {isAdmin && filteredClaims.length > 0 && (
                  <Button
                    variant="default"
                    onClick={() => handleDownloadAll()}
                    className="text-sm"
                  >
                    Download All Submissions
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Upload Return File</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    File Type
                  </label>
                  <Select
                    value={selectedFileType}
                    onValueChange={setSelectedFileType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select file type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Daily Return File</SelectItem>
                      <SelectItem value="BIWEEKLY">
                        BiWeekly Return File
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Select File
                  </label>
                  <Input
                    id="file-input"
                    type="file"
                    onChange={handleFileChange}
                    accept=".txt,.csv"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    onClick={handleFileUpload}
                    disabled={!selectedFile || !selectedFileType || isUploading}
                  >
                    {isUploading ? "Uploading..." : "Upload File"}
                  </Button>
                </div>
              </div>

              {selectedFile && (
                <div className="text-sm text-gray-600">
                  Selected file: {selectedFile.name} (
                  {(selectedFile.size / 1024).toFixed(2)} KB)
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          {filteredClaims.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">
              No submissions found
            </div>
          ) : (
            filteredClaims.map((claim) => (
              <Card key={claim.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{claim.friendlyId}</CardTitle>
                      {isAdmin && !selectedPhysicianId && (
                        <p className="text-sm text-gray-600 mt-1">
                          Physician: {claim.physician.firstName}{" "}
                          {claim.physician.lastName} (
                          {claim.physician.billingNumber})
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {claim.batchClaimText && (
                        <Button
                          variant="outline"
                          onClick={() => handleDownload(claim)}
                        >
                          Download Batch Claim
                        </Button>
                      )}
                      {claim.services.every(
                        (service) => service.status === ServiceStatus.PENDING
                      ) && (
                        <>
                          <Button
                            variant="default"
                            onClick={() => handleUpdateStatus(claim)}
                            disabled={isUpdating}
                          >
                            Mark as Sent
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleDelete(claim)}
                            disabled={isDeleting}
                          >
                            Delete Claim
                          </Button>
                        </>
                      )}
                    </div>
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
                        Services
                      </h3>
                      <div className="mt-1 space-y-2">
                        {claim.services.map((service) => (
                          <div
                            key={service.id}
                            className="border-l-2 border-gray-200 pl-3"
                          >
                            <p className="text-sm font-medium text-gray-900">
                              {
                                new Date(service.serviceDate)
                                  .toISOString()
                                  .split("T")[0]
                              }{" "}
                              - {service.status}
                            </p>
                            <p className="text-sm text-gray-600">
                              {service.summary}
                            </p>
                            <div className="mt-1 space-y-1">
                              {service.serviceCodes.map((serviceCode) => (
                                <p
                                  key={serviceCode.id}
                                  className="text-sm text-gray-900"
                                >
                                  {serviceCode.billingCode.code} -{" "}
                                  {serviceCode.billingCode.title}
                                </p>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">
                        Created At
                      </h3>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDateTime(claim.createdAt)}
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
