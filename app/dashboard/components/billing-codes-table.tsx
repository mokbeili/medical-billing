"use client";

import { ChevronLeft, ChevronRight, History, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Textarea } from "../../components/ui/textarea";

interface BillingCode {
  id: number;
  code: string;
  title: string;
  description: string | null;
  code_class: string | null;
  anes: string | null;
  details: string | null;
  general_practice_cost: string | null;
  specialist_price: string | null;
  referred_price: string | null;
  non_referred_price: string | null;
  section: {
    id: number;
    code: string;
    title: string;
    jurisdiction: {
      country: string;
      region: string;
      provider: {
        name: string;
      };
    };
  };
}

interface BillingCodeChangeLog {
  id: number;
  code: string;
  title: string;
  description: string | null;
  code_class: string | null;
  anes: string | null;
  details: string | null;
  general_practice_cost: string | null;
  specialist_price: string | null;
  referred_price: string | null;
  non_referred_price: string | null;
  changed_at: string;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface Section {
  id: number;
  code: string;
  title: string;
  jurisdiction: {
    country: string;
    region: string;
    provider: {
      name: string;
    };
  };
}

interface BillingCodeFormProps {
  initialData?: {
    code: string;
    title: string;
    description: string;
    sectionId: string;
    section: Section | null;
    codeClass: string;
    anes: string;
    details: string;
    generalPracticeCost: string;
    specialistPrice: string;
    referredPrice: string;
    nonReferredPrice: string;
  };
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  error: string | null;
}

function BillingCodeForm({
  initialData,
  onSubmit,
  onCancel,
  error,
}: BillingCodeFormProps) {
  const [formData, setFormData] = useState(
    initialData || {
      code: "",
      title: "",
      description: "",
      sectionId: "",
      section: null,
      codeClass: "",
      anes: "",
      details: "",
      generalPracticeCost: "",
      specialistPrice: "",
      referredPrice: "",
      nonReferredPrice: "",
    }
  );
  const [sectionSearchQuery, setSectionSearchQuery] = useState("");
  const [sectionSearchResults, setSectionSearchResults] = useState<Section[]>(
    []
  );
  const [isSearchingSection, setIsSearchingSection] = useState(false);

  useEffect(() => {
    const searchSections = async () => {
      if (sectionSearchQuery.length < 1) {
        setSectionSearchResults([]);
        return;
      }
      setIsSearchingSection(true);
      try {
        const response = await fetch(
          `/api/sections?search=${encodeURIComponent(
            sectionSearchQuery
          )}&searchFields=${sectionSearchQuery.length === 1 ? "code" : "title"}`
        );
        if (response.ok) {
          const data = await response.json();
          setSectionSearchResults(data);
        }
      } catch (error) {
        console.error("Error searching sections:", error);
      } finally {
        setIsSearchingSection(false);
      }
    };

    setSectionSearchResults([]);
    const debounceTimer = setTimeout(searchSections, 300);
    return () => clearTimeout(debounceTimer);
  }, [sectionSearchQuery]);

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectSection = (section: Section) => {
    setFormData((prev) => ({
      ...prev,
      section,
      sectionId: section.id.toString(),
    }));
    setSectionSearchQuery("");
    setSectionSearchResults([]);
  };

  const handleRemoveSection = () => {
    setFormData((prev) => ({
      ...prev,
      section: null,
      sectionId: "",
    }));
  };

  const handleSubmit = async () => {
    if (!formData.section) {
      return;
    }
    await onSubmit(formData);
  };

  return (
    <div className="space-y-4 py-4">
      <div className="space-y-2">
        <Label>Section</Label>
        <div className="relative">
          <Input
            placeholder="Search sections..."
            value={sectionSearchQuery}
            onChange={(e) => setSectionSearchQuery(e.target.value)}
          />
          {isSearchingSection && (
            <div className="absolute right-2 top-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            </div>
          )}
          {sectionSearchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {sectionSearchResults.map((section) => (
                <div
                  key={section.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleSelectSection(section)}
                >
                  <div className="font-medium">
                    {section.code} - {section.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {section.jurisdiction.country} -{" "}
                    {section.jurisdiction.region}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {formData.section && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
              <div>
                <span className="font-medium">{formData.section.code}</span> -{" "}
                {formData.section.title}
                <div className="text-sm text-gray-500">
                  {formData.section.jurisdiction.country} -{" "}
                  {formData.section.jurisdiction.region}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemoveSection}
              >
                Remove
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            name="code"
            value={formData.code}
            onChange={handleFormChange}
            placeholder="Enter billing code"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            value={formData.title}
            onChange={handleFormChange}
            placeholder="Enter title"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleFormChange}
          placeholder="Enter description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="specialistPrice">Specialist Price</Label>
          <Input
            id="specialistPrice"
            name="specialistPrice"
            value={formData.specialistPrice}
            onChange={handleFormChange}
            placeholder="Enter specialist price"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="generalPracticeCost">General Practice Cost</Label>
          <Input
            id="generalPracticeCost"
            name="generalPracticeCost"
            value={formData.generalPracticeCost}
            onChange={handleFormChange}
            placeholder="Enter general practice cost"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="referredPrice">Referred Price</Label>
          <Input
            id="referredPrice"
            name="referredPrice"
            value={formData.referredPrice}
            onChange={handleFormChange}
            placeholder="Enter referred price"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nonReferredPrice">Non-Referred Price</Label>
          <Input
            id="nonReferredPrice"
            name="nonReferredPrice"
            value={formData.nonReferredPrice}
            onChange={handleFormChange}
            placeholder="Enter non-referred price"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="codeClass">Code Class</Label>
          <Input
            id="codeClass"
            name="codeClass"
            value={formData.codeClass}
            onChange={handleFormChange}
            placeholder="Enter code class"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anes">Anesthesia</Label>
          <Input
            id="anes"
            name="anes"
            value={formData.anes}
            onChange={handleFormChange}
            placeholder="Enter anesthesia details"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="details">Details</Label>
        <Textarea
          id="details"
          name="details"
          value={formData.details}
          onChange={handleFormChange}
          placeholder="Enter additional details"
        />
      </div>

      {error && <div className="text-red-500 text-sm">{error}</div>}
      <div className="flex gap-2">
        <Button onClick={handleSubmit}>
          {initialData ? "Save Changes" : "Create"}
        </Button>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function BillingCodesTable() {
  const [billingCodes, setBillingCodes] = useState<BillingCode[]>([]);
  const [changeLogs, setChangeLogs] = useState<BillingCodeChangeLog[]>([]);
  const [isChangeLogOpen, setIsChangeLogOpen] = useState(false);
  const [selectedCodeId, setSelectedCodeId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    code: "",
    title: "",
    sectionCode: "",
    sectionTitle: "",
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };

  const fetchBillingCodes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.code) params.append("code", filter.code);
      if (filter.title) params.append("title", filter.title);
      if (filter.sectionCode) params.append("sectionCode", filter.sectionCode);
      if (filter.sectionTitle)
        params.append("sectionTitle", filter.sectionTitle);
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      params.append("sortBy", "section.code,code");
      params.append("sortOrder", "asc,asc");

      const response = await fetch(`/api/billing-codes?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch billing codes");
      const data = await response.json();
      setBillingCodes(data.data);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching billing codes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingCodes();
  }, [filter, pagination.page]);

  const handleEdit = (code: BillingCode) => {
    setEditingId(code.id);
    setIsEditing(true);
    setOpen(true);
  };

  const handleEditSave = async (formData: any) => {
    try {
      // Check for duplicates
      const duplicateCheck = await fetch(
        `/api/billing-codes/check-duplicates?code=${formData.code}&title=${formData.title}&excludeId=${editingId}&sectionId=${formData.section.id}`
      );
      const duplicateData = await duplicateCheck.json();

      if (duplicateData.duplicate) {
        setError(duplicateData.message);
        return;
      }

      const response = await fetch(`/api/billing-codes/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: formData.code,
          title: formData.title,
          description: formData.description,
          sectionId: formData.section.id,
          codeClass: formData.codeClass || null,
          anes: formData.anes || null,
          details: formData.details || null,
          generalPracticeCost: formData.generalPracticeCost || null,
          specialistPrice: formData.specialistPrice || null,
          referredPrice: formData.referredPrice || null,
          nonReferredPrice: formData.nonReferredPrice || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update billing code");
      }

      await fetchBillingCodes();
      setEditingId(null);
      setError(null);
      setOpen(false);
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating billing code:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update billing code. Please try again."
      );
    }
  };

  const handleCreateBillingCode = async (formData: any) => {
    try {
      if (!formData.section) {
        setError("Please select a section");
        return;
      }

      const response = await fetch("/api/billing-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: formData.code,
          title: formData.title,
          description: formData.description,
          sectionId: formData.section.id,
          codeClass: formData.codeClass || null,
          anes: formData.anes || null,
          details: formData.details || null,
          generalPracticeCost: formData.generalPracticeCost || null,
          specialistPrice: formData.specialistPrice || null,
          referredPrice: formData.referredPrice || null,
          nonReferredPrice: formData.nonReferredPrice || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create billing code");
      await fetchBillingCodes();
      setOpen(false);
      setError(null);
    } catch (error) {
      console.error("Error creating billing code:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create billing code"
      );
    }
  };

  const handleDialogClose = () => {
    setOpen(false);
    setEditingId(null);
    setIsEditing(false);
    setError(null);
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handleViewChangeLog = async (codeId: number) => {
    try {
      const response = await fetch(`/api/billing-codes/${codeId}/change-log`);
      if (!response.ok) throw new Error("Failed to fetch change log");
      const data = await response.json();
      setChangeLogs(data);
      setSelectedCodeId(codeId);
      setIsChangeLogOpen(true);
    } catch (error) {
      console.error("Error fetching change log:", error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Input
            placeholder="Filter by code..."
            name="code"
            value={filter.code}
            onChange={handleFilterChange}
            className="max-w-xs"
          />
          <Input
            placeholder="Filter by title..."
            name="title"
            value={filter.title}
            onChange={handleFilterChange}
            className="max-w-xs"
          />
          <Input
            placeholder="Filter by section code..."
            name="sectionCode"
            value={filter.sectionCode}
            onChange={handleFilterChange}
            className="max-w-xs"
          />
          <Input
            placeholder="Filter by section title..."
            name="sectionTitle"
            value={filter.sectionTitle}
            onChange={handleFilterChange}
            className="max-w-xs"
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Billing Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {isEditing ? "Edit Billing Code" : "Add New Billing Code"}
              </DialogTitle>
            </DialogHeader>
            <BillingCodeForm
              initialData={
                isEditing
                  ? billingCodes.find((code) => code.id === editingId)
                    ? {
                        code: billingCodes.find(
                          (code) => code.id === editingId
                        )!.code,
                        title: billingCodes.find(
                          (code) => code.id === editingId
                        )!.title,
                        description:
                          billingCodes.find((code) => code.id === editingId)!
                            .description || "",
                        sectionId: billingCodes
                          .find((code) => code.id === editingId)!
                          .section.id.toString(),
                        section: billingCodes.find(
                          (code) => code.id === editingId
                        )!.section,
                        codeClass:
                          billingCodes.find((code) => code.id === editingId)!
                            .code_class || "",
                        anes:
                          billingCodes.find((code) => code.id === editingId)!
                            .anes || "",
                        details:
                          billingCodes.find((code) => code.id === editingId)!
                            .details || "",
                        generalPracticeCost:
                          billingCodes.find((code) => code.id === editingId)!
                            .general_practice_cost || "",
                        specialistPrice:
                          billingCodes.find((code) => code.id === editingId)!
                            .specialist_price || "",
                        referredPrice:
                          billingCodes.find((code) => code.id === editingId)!
                            .referred_price || "",
                        nonReferredPrice:
                          billingCodes.find((code) => code.id === editingId)!
                            .non_referred_price || "",
                      }
                    : undefined
                  : undefined
              }
              onSubmit={isEditing ? handleEditSave : handleCreateBillingCode}
              onCancel={handleDialogClose}
              error={error}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Jurisdiction</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : billingCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  No billing codes found
                </TableCell>
              </TableRow>
            ) : (
              billingCodes.map((code) => (
                <TableRow key={code.id}>
                  <TableCell>{code.code}</TableCell>
                  <TableCell>{code.title}</TableCell>
                  <TableCell>{code.description || "-"}</TableCell>
                  <TableCell>
                    {code.section.jurisdiction.provider.name}
                  </TableCell>
                  <TableCell>
                    {code.section.jurisdiction.country} -{" "}
                    {code.section.jurisdiction.region}
                  </TableCell>
                  <TableCell>
                    {code.section.code} - {code.section.title}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(code)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewChangeLog(code.id)}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="text-sm text-muted-foreground">
          Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
          {pagination.total} results
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={isChangeLogOpen} onOpenChange={setIsChangeLogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Change Log History</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Changed At</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changeLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.changed_at).toLocaleString()}
                    </TableCell>
                    <TableCell>{log.code}</TableCell>
                    <TableCell>{log.title}</TableCell>
                    <TableCell>{log.description}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {log.code_class && <div>Class: {log.code_class}</div>}
                        {log.anes && <div>Anes: {log.anes}</div>}
                        {log.details && <div>Details: {log.details}</div>}
                        {log.general_practice_cost && (
                          <div>GP Cost: {log.general_practice_cost}</div>
                        )}
                        {log.specialist_price && (
                          <div>Specialist: {log.specialist_price}</div>
                        )}
                        {log.referred_price && (
                          <div>Referred: {log.referred_price}</div>
                        )}
                        {log.non_referred_price && (
                          <div>Non-referred: {log.non_referred_price}</div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
