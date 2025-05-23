"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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

export function BillingCodesTable() {
  const [billingCodes, setBillingCodes] = useState<BillingCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<{
    code: string;
    title: string;
    description: string;
    sectionId: number;
    codeClass: string;
    anes: string;
    details: string;
    generalPracticeCost: string;
    specialistPrice: string;
    referredPrice: string;
    nonReferredPrice: string;
  }>({
    code: "",
    title: "",
    description: "",
    sectionId: 0,
    codeClass: "",
    anes: "",
    details: "",
    generalPracticeCost: "",
    specialistPrice: "",
    referredPrice: "",
    nonReferredPrice: "",
  });
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
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionSearchQuery, setSectionSearchQuery] = useState("");
  const [sectionSearchResults, setSectionSearchResults] = useState<Section[]>(
    []
  );
  const [isSearchingSection, setIsSearchingSection] = useState(false);
  const [open, setOpen] = useState(false);
  const [newBillingCode, setNewBillingCode] = useState({
    code: "",
    title: "",
    description: "",
    sectionId: "",
    section: null as Section | null,
    codeClass: "",
    anes: "",
    details: "",
    generalPracticeCost: "",
    specialistPrice: "",
    referredPrice: "",
    nonReferredPrice: "",
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };

  const handleNewBillingCodeChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setNewBillingCode((prev) => ({ ...prev, [name]: value }));
  };

  const handleEdit = (code: BillingCode) => {
    setEditingId(code.id);
    setEditValues({
      code: code.code,
      title: code.title,
      description: code.description || "",
      sectionId: code.section.id,
      codeClass: code.code_class || "",
      anes: code.anes || "",
      details: code.details || "",
      generalPracticeCost: code.general_practice_cost || "",
      specialistPrice: code.specialist_price || "",
      referredPrice: code.referred_price || "",
      nonReferredPrice: code.non_referred_price || "",
    });
    setError(null);
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSave = async (id: number) => {
    try {
      // Check for duplicates
      const duplicateCheck = await fetch(
        `/api/billing-codes/check-duplicates?code=${editValues.code}&title=${editValues.title}&excludeId=${id}`
      );
      const duplicateData = await duplicateCheck.json();

      if (duplicateData.duplicate) {
        setError(duplicateData.message);
        return;
      }

      const response = await fetch(`/api/billing-codes/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: editValues.code,
          title: editValues.title,
          description: editValues.description,
          sectionId: editValues.sectionId,
          codeClass: editValues.codeClass || null,
          anes: editValues.anes || null,
          details: editValues.details || null,
          generalPracticeCost: editValues.generalPracticeCost || null,
          specialistPrice: editValues.specialistPrice || null,
          referredPrice: editValues.referredPrice || null,
          nonReferredPrice: editValues.nonReferredPrice || null,
        }),
      });

      if (!response.ok) {
        console.log(response);
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update billing code");
      }

      await fetchBillingCodes();
      setEditingId(null);
      setError(null);
    } catch (error) {
      console.error("Error updating billing code:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to update billing code. Please try again."
      );
    }
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setError(null);
  };

  const fetchBillingCodes = async () => {
    try {
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

  const fetchSections = async () => {
    try {
      const response = await fetch("/api/sections");
      if (!response.ok) throw new Error("Failed to fetch sections");
      const data = await response.json();
      setSections(data);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  };

  useEffect(() => {
    fetchBillingCodes();
    fetchSections();
  }, [filter, pagination.page]);

  useEffect(() => {
    const searchSections = async () => {
      if (sectionSearchQuery.length < 2) {
        setSectionSearchResults([]);
        return;
      }
      setIsSearchingSection(true);
      try {
        const response = await fetch(
          `/api/sections?search=${encodeURIComponent(sectionSearchQuery)}`
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

  const handleSelectSection = (section: Section) => {
    setNewBillingCode((prev) => ({
      ...prev,
      section,
      sectionId: section.id.toString(),
    }));
    setSectionSearchQuery("");
    setSectionSearchResults([]);
  };

  const handleRemoveSection = () => {
    setNewBillingCode((prev) => ({
      ...prev,
      section: null,
      sectionId: "",
    }));
  };

  const handleCreateBillingCode = async () => {
    try {
      if (!newBillingCode.section) {
        setError("Please select a section");
        return;
      }

      const response = await fetch("/api/billing-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: newBillingCode.code,
          title: newBillingCode.title,
          description: newBillingCode.description,
          sectionId: newBillingCode.section.id,
          codeClass: newBillingCode.codeClass || null,
          anes: newBillingCode.anes || null,
          details: newBillingCode.details || null,
          generalPracticeCost: newBillingCode.generalPracticeCost || null,
          specialistPrice: newBillingCode.specialistPrice || null,
          referredPrice: newBillingCode.referredPrice || null,
          nonReferredPrice: newBillingCode.nonReferredPrice || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to create billing code");
      await fetchBillingCodes();
      setNewBillingCode({
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
      });
      setOpen(false);
    } catch (error) {
      console.error("Error creating billing code:", error);
      setError(
        error instanceof Error ? error.message : "Failed to create billing code"
      );
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
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
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Billing Code
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Billing Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    name="code"
                    value={newBillingCode.code}
                    onChange={handleNewBillingCodeChange}
                    placeholder="Enter billing code"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="codeClass">Code Class</Label>
                  <Input
                    id="codeClass"
                    name="codeClass"
                    value={newBillingCode.codeClass}
                    onChange={handleNewBillingCodeChange}
                    placeholder="Enter code class"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={newBillingCode.title}
                  onChange={handleNewBillingCodeChange}
                  placeholder="Enter title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={newBillingCode.description}
                  onChange={handleNewBillingCodeChange}
                  placeholder="Enter description"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="anes">Anesthesia</Label>
                <Input
                  id="anes"
                  name="anes"
                  value={newBillingCode.anes}
                  onChange={handleNewBillingCodeChange}
                  placeholder="Enter anesthesia details"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="details">Details</Label>
                <Textarea
                  id="details"
                  name="details"
                  value={newBillingCode.details}
                  onChange={handleNewBillingCodeChange}
                  placeholder="Enter additional details"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="generalPracticeCost">
                    General Practice Cost
                  </Label>
                  <Input
                    id="generalPracticeCost"
                    name="generalPracticeCost"
                    value={newBillingCode.generalPracticeCost}
                    onChange={handleNewBillingCodeChange}
                    placeholder="Enter general practice cost"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="specialistPrice">Specialist Price</Label>
                  <Input
                    id="specialistPrice"
                    name="specialistPrice"
                    value={newBillingCode.specialistPrice}
                    onChange={handleNewBillingCodeChange}
                    placeholder="Enter specialist price"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referredPrice">Referred Price</Label>
                  <Input
                    id="referredPrice"
                    name="referredPrice"
                    value={newBillingCode.referredPrice}
                    onChange={handleNewBillingCodeChange}
                    placeholder="Enter referred price"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nonReferredPrice">Non-Referred Price</Label>
                  <Input
                    id="nonReferredPrice"
                    name="nonReferredPrice"
                    value={newBillingCode.nonReferredPrice}
                    onChange={handleNewBillingCodeChange}
                    placeholder="Enter non-referred price"
                  />
                </div>
              </div>

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

                {newBillingCode.section && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                      <div>
                        <span className="font-medium">
                          {newBillingCode.section.code}
                        </span>{" "}
                        - {newBillingCode.section.title}
                        <div className="text-sm text-gray-500">
                          {newBillingCode.section.jurisdiction.country} -{" "}
                          {newBillingCode.section.jurisdiction.region}
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
              {error && <div className="text-red-500 text-sm">{error}</div>}
              <Button onClick={handleCreateBillingCode}>Create</Button>
            </div>
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
                  <TableCell>
                    {editingId === code.id ? (
                      <Input
                        name="code"
                        value={editValues.code}
                        onChange={handleEditChange}
                        className={error ? "border-red-500" : ""}
                      />
                    ) : (
                      code.code
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === code.id ? (
                      <Input
                        name="title"
                        value={editValues.title}
                        onChange={handleEditChange}
                        className={error ? "border-red-500" : ""}
                      />
                    ) : (
                      code.title
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === code.id ? (
                      <Textarea
                        name="description"
                        value={editValues.description}
                        onChange={handleEditChange}
                      />
                    ) : (
                      code.description || "-"
                    )}
                  </TableCell>
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
                    {editingId === code.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-codeClass">Code Class</Label>
                            <Input
                              id="edit-codeClass"
                              name="codeClass"
                              value={editValues.codeClass}
                              onChange={handleEditChange}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-anes">Anesthesia</Label>
                            <Input
                              id="edit-anes"
                              name="anes"
                              value={editValues.anes}
                              onChange={handleEditChange}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-details">Details</Label>
                          <Textarea
                            id="edit-details"
                            name="details"
                            value={editValues.details}
                            onChange={handleEditChange}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-generalPracticeCost">
                              General Practice Cost
                            </Label>
                            <Input
                              id="edit-generalPracticeCost"
                              name="generalPracticeCost"
                              value={editValues.generalPracticeCost}
                              onChange={handleEditChange}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-specialistPrice">
                              Specialist Price
                            </Label>
                            <Input
                              id="edit-specialistPrice"
                              name="specialistPrice"
                              value={editValues.specialistPrice}
                              onChange={handleEditChange}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-referredPrice">
                              Referred Price
                            </Label>
                            <Input
                              id="edit-referredPrice"
                              name="referredPrice"
                              value={editValues.referredPrice}
                              onChange={handleEditChange}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-nonReferredPrice">
                              Non-Referred Price
                            </Label>
                            <Input
                              id="edit-nonReferredPrice"
                              name="nonReferredPrice"
                              value={editValues.nonReferredPrice}
                              onChange={handleEditChange}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleEditSave(code.id)}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleEditCancel}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(code)}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}

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
    </div>
  );
}
