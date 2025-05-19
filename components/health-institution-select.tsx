"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

interface HealthInstitution {
  id: number;
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface HealthInstitutionSelectProps {
  value?: number;
  onValueChange: (value: number) => void;
  className?: string;
}

export function HealthInstitutionSelect({
  value,
  onValueChange,
  className,
}: HealthInstitutionSelectProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HealthInstitution[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedInstitution, setSelectedInstitution] =
    useState<HealthInstitution | null>(null);

  useEffect(() => {
    const searchInstitutions = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await fetch(
          `/api/health-institutions?query=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data);
        }
      } catch (error) {
        console.error("Error searching health institutions:", error);
      } finally {
        setIsSearching(false);
      }
    };

    setSearchResults([]);
    const debounceTimer = setTimeout(searchInstitutions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  useEffect(() => {
    const fetchSelectedInstitution = async () => {
      if (!value) {
        setSelectedInstitution(null);
        return;
      }
      try {
        const response = await fetch(`/api/health-institutions?query=${value}`);
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            setSelectedInstitution(data[0]);
          }
        }
      } catch (error) {
        console.error("Error fetching selected institution:", error);
      }
    };

    fetchSelectedInstitution();
  }, [value]);

  const handleSelectInstitution = (institution: HealthInstitution) => {
    setSelectedInstitution(institution);
    onValueChange(institution.id);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleRemoveInstitution = () => {
    setSelectedInstitution(null);
    onValueChange(0);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder="Search health institutions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {isSearching && (
          <div className="absolute right-2 top-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          </div>
        )}
        {searchResults.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {searchResults.map((institution) => (
              <div
                key={institution.id}
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => handleSelectInstitution(institution)}
              >
                <div className="font-medium">{institution.name}</div>
                <div className="text-sm text-gray-600">
                  {institution.street}, {institution.city}, {institution.state}{" "}
                  {institution.postalCode}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedInstitution && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
            <div>
              <span className="font-medium">{selectedInstitution.name}</span>
              <br />
              <span className="text-sm text-gray-600">
                {selectedInstitution.street}, {selectedInstitution.city},{" "}
                {selectedInstitution.state} {selectedInstitution.postalCode}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemoveInstitution}
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
