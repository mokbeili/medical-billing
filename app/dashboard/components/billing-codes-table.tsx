"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";

interface BillingCode {
  id: number;
  code: string;
  title: string;
  description: string | null;
  section: {
    code: string;
    title: string;
  };
}

export function BillingCodesTable() {
  const [filter, setFilter] = useState({
    provider: "",
    jurisdiction: "",
    title: "",
  });

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilter((prev) => ({ ...prev, [name]: value }));
  };

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
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Billing Code
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Section</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* TODO: Add data fetching and mapping */}
            <TableRow>
              <TableCell>Loading...</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
