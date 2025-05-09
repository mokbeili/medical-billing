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

export function BillingCodesTable() {
  const [billingCodes, setBillingCodes] = useState<BillingCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    provider: "",
    jurisdiction: "",
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
  const [newBillingCode, setNewBillingCode] = useState({
    code: "",
    title: "",
    description: "",
    sectionId: "",
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

  const fetchBillingCodes = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.provider) params.append("provider", filter.provider);
      if (filter.jurisdiction)
        params.append("jurisdiction", filter.jurisdiction);
      if (filter.title) params.append("title", filter.title);
      if (filter.sectionCode) params.append("sectionCode", filter.sectionCode);
      if (filter.sectionTitle)
        params.append("sectionTitle", filter.sectionTitle);
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());

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

  const handleCreateBillingCode = async () => {
    try {
      const response = await fetch("/api/billing-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBillingCode),
      });

      if (!response.ok) throw new Error("Failed to create billing code");
      await fetchBillingCodes();
      setNewBillingCode({
        code: "",
        title: "",
        description: "",
        sectionId: "",
      });
    } catch (error) {
      console.error("Error creating billing code:", error);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  useEffect(() => {
    fetchBillingCodes();
  }, [filter, pagination.page]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <Input
            placeholder="Filter by provider..."
            name="provider"
            value={filter.provider}
            onChange={handleFilterChange}
            className="max-w-xs"
          />
          <Input
            placeholder="Filter by jurisdiction..."
            name="jurisdiction"
            value={filter.jurisdiction}
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
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Billing Code
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Billing Code</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  name="code"
                  value={newBillingCode.code}
                  onChange={handleNewBillingCodeChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={newBillingCode.title}
                  onChange={handleNewBillingCodeChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={newBillingCode.description}
                  onChange={handleNewBillingCodeChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sectionId">Section ID</Label>
                <Input
                  id="sectionId"
                  name="sectionId"
                  value={newBillingCode.sectionId}
                  onChange={handleNewBillingCodeChange}
                />
              </div>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : billingCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
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
    </div>
  );
}
