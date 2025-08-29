"use client";

import { ChevronLeft, ChevronRight, History, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { Checkbox } from "../../components/ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
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
  low_fee: number;
  high_fee: number;
  service_class: string | null;
  add_on_indicator: string | null;
  multiple_unit_indicator: string | null;
  fee_determinant: string;
  anaesthesia_indicator: string | null;
  submit_at_100_percent: string | null;
  referring_practitioner_required: string | null;
  start_time_required: string | null;
  stop_time_required: string | null;
  technical_fee: number | null;
  max_units: number | null;
  day_range: number | null;
  billing_record_type: number;
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
  previousCodes: Array<{
    previous_code: {
      id: number;
      code: string;
      title: string;
      section: {
        code: string;
        title: string;
      };
    };
  }>;
  nextCodes: Array<{
    next_code: {
      id: number;
      code: string;
      title: string;
      section: {
        code: string;
        title: string;
      };
    };
  }>;
  billingCodeChains: Array<{
    codeId: number;
    code: string;
    title: string;
    dayRange: number;
    rootId: number;
    previousCodeId: number | null;
    previousDayRange: number;
    cumulativeDayRange: number;
    prevPlusSelf: number;
    isLast: boolean;
  }>;
}

interface BillingCodeChangeLog {
  id: number;
  billing_code_id: number;
  code: string;
  title: string;
  description: string | null;
  changed_at: string;
  billing_record_type: number;
  low_fee: number;
  high_fee: number;
  service_class: string | null;
  add_on_indicator: string | null;
  multiple_unit_indicator: string | null;
  fee_determinant: string;
  anaesthesia_indicator: string | null;
  submit_at_100_percent: string | null;
  referring_practitioner_required: string | null;
  start_time_required: string | null;
  stop_time_required: string | null;
  technical_fee: number | null;
  max_units: number | null;
  day_range: number | null;
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
    low_fee: number;
    high_fee: number;
    service_class: string;
    add_on_indicator: string;
    multiple_unit_indicator: string;
    fee_determinant: string;
    anaesthesia_indicator: string;
    submit_at_100_percent: string;
    referring_practitioner_required: string;
    start_time_required: string;
    stop_time_required: string;
    technical_fee: number;
    max_units: number | null;
    day_range: number | null;
    billingRecordType: number;
    previousCodes: number[];
    nextCodes: number[];
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
  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    title: initialData?.title || "",
    description: initialData?.description || "",
    sectionId: initialData?.sectionId || "",
    section: initialData?.section || null,
    low_fee: initialData?.low_fee || 0,
    high_fee: initialData?.high_fee || 0,
    service_class: initialData?.service_class || "",
    add_on_indicator: initialData?.add_on_indicator || "",
    multiple_unit_indicator: initialData?.multiple_unit_indicator || "",
    fee_determinant: initialData?.fee_determinant || "",
    anaesthesia_indicator: initialData?.anaesthesia_indicator || "",
    submit_at_100_percent: initialData?.submit_at_100_percent || "",
    referring_practitioner_required:
      initialData?.referring_practitioner_required || "",
    start_time_required: initialData?.start_time_required || "",
    stop_time_required: initialData?.stop_time_required || "",
    technical_fee: initialData?.technical_fee || 0,
    max_units: initialData?.max_units || null,
    day_range: initialData?.day_range || null,
    billingRecordType: initialData?.billingRecordType || 50,
    previousCodes: initialData?.previousCodes || [],
    nextCodes: initialData?.nextCodes || [],
  });
  const [sectionSearchQuery, setSectionSearchQuery] = useState("");
  const [sectionSearchResults, setSectionSearchResults] = useState<Section[]>(
    []
  );
  const [isSearchingSection, setIsSearchingSection] = useState(false);

  // State for billing code search
  const [billingCodeSearchQuery, setBillingCodeSearchQuery] = useState("");
  const [billingCodeSearchResults, setBillingCodeSearchResults] = useState<
    BillingCode[]
  >([]);
  const [isSearchingBillingCodes, setIsSearchingBillingCodes] = useState(false);
  const [searchType, setSearchType] = useState<"previous" | "next" | null>(
    null
  );

  // Separate search states for previous and next codes
  const [previousCodeSearchQuery, setPreviousCodeSearchQuery] = useState("");
  const [previousCodeSearchResults, setPreviousCodeSearchResults] = useState<
    BillingCode[]
  >([]);
  const [isSearchingPreviousCodes, setIsSearchingPreviousCodes] =
    useState(false);

  const [nextCodeSearchQuery, setNextCodeSearchQuery] = useState("");
  const [nextCodeSearchResults, setNextCodeSearchResults] = useState<
    BillingCode[]
  >([]);
  const [isSearchingNextCodes, setIsSearchingNextCodes] = useState(false);

  // Store all billing codes for display purposes
  const [allBillingCodes, setAllBillingCodes] = useState<BillingCode[]>([]);

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

  // Search billing codes for previous/next selection
  useEffect(() => {
    const searchBillingCodes = async () => {
      if (billingCodeSearchQuery.length < 2) {
        setBillingCodeSearchResults([]);
        return;
      }
      setIsSearchingBillingCodes(true);
      try {
        const response = await fetch(
          `/api/search?query=${encodeURIComponent(
            billingCodeSearchQuery
          )}&jurisdictionId=1&limit=20`
        );
        if (response.ok) {
          const data = await response.json();
          setBillingCodeSearchResults(data.results);
        }
      } catch (error) {
        console.error("Error searching billing codes:", error);
      } finally {
        setIsSearchingBillingCodes(false);
      }
    };

    setBillingCodeSearchResults([]);
    const debounceTimer = setTimeout(searchBillingCodes, 300);
    return () => clearTimeout(debounceTimer);
  }, [billingCodeSearchQuery]);

  // Search for previous codes
  useEffect(() => {
    const searchPreviousCodes = async () => {
      if (previousCodeSearchQuery.length < 2) {
        setPreviousCodeSearchResults([]);
        return;
      }
      setIsSearchingPreviousCodes(true);
      try {
        const response = await fetch(
          `/api/search?query=${encodeURIComponent(
            previousCodeSearchQuery
          )}&jurisdictionId=1&limit=20`
        );
        if (response.ok) {
          const data = await response.json();
          setPreviousCodeSearchResults(data.results);
        }
      } catch (error) {
        console.error("Error searching previous codes:", error);
      } finally {
        setIsSearchingPreviousCodes(false);
      }
    };

    setPreviousCodeSearchResults([]);
    const debounceTimer = setTimeout(searchPreviousCodes, 300);
    return () => clearTimeout(debounceTimer);
  }, [previousCodeSearchQuery]);

  // Search for next codes
  useEffect(() => {
    const searchNextCodes = async () => {
      if (nextCodeSearchQuery.length < 2) {
        setNextCodeSearchResults([]);
        return;
      }
      setIsSearchingNextCodes(true);
      try {
        const response = await fetch(
          `/api/search?query=${encodeURIComponent(
            nextCodeSearchQuery
          )}&jurisdictionId=1&limit=20`
        );
        if (response.ok) {
          const data = await response.json();
          setNextCodeSearchResults(data.results);
        }
      } catch (error) {
        console.error("Error searching next codes:", error);
      } finally {
        setIsSearchingNextCodes(false);
      }
    };

    setNextCodeSearchResults([]);
    const debounceTimer = setTimeout(searchNextCodes, 300);
    return () => clearTimeout(debounceTimer);
  }, [nextCodeSearchQuery]);

  // Fetch all billing codes for display purposes
  useEffect(() => {
    const fetchAllBillingCodes = async () => {
      try {
        const response = await fetch("/api/billing-codes?limit=1000");
        if (response.ok) {
          const data = await response.json();
          setAllBillingCodes(data.data);
        }
      } catch (error) {
        console.error("Error fetching all billing codes:", error);
      }
    };

    fetchAllBillingCodes();
  }, []);

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

  const handleAddPreviousCode = (code: BillingCode) => {
    if (!formData.previousCodes.includes(code.id)) {
      setFormData((prev) => ({
        ...prev,
        previousCodes: [...prev.previousCodes, code.id],
      }));
    }
    setPreviousCodeSearchQuery("");
    setPreviousCodeSearchResults([]);
  };

  const handleAddNextCode = (code: BillingCode) => {
    if (!formData.nextCodes.includes(code.id)) {
      setFormData((prev) => ({
        ...prev,
        nextCodes: [...prev.nextCodes, code.id],
      }));
    }
    setNextCodeSearchQuery("");
    setNextCodeSearchResults([]);
  };

  const handleRemovePreviousCode = (codeId: number) => {
    setFormData((prev) => ({
      ...prev,
      previousCodes: prev.previousCodes.filter((id) => id !== codeId),
    }));
  };

  const handleRemoveNextCode = (codeId: number) => {
    setFormData((prev) => ({
      ...prev,
      nextCodes: prev.nextCodes.filter((id) => id !== codeId),
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
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="low_fee">Low Fee</Label>
          <Input
            id="low_fee"
            type="number"
            step="0.01"
            value={formData.low_fee}
            onChange={(e) =>
              setFormData({ ...formData, low_fee: parseFloat(e.target.value) })
            }
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="high_fee">High Fee</Label>
          <Input
            id="high_fee"
            type="number"
            step="0.01"
            value={formData.high_fee}
            onChange={(e) =>
              setFormData({ ...formData, high_fee: parseFloat(e.target.value) })
            }
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="service_class">Service Class</Label>
        <Select
          value={formData.service_class || "none"}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              service_class: value === "none" ? "" : value,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select service class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="D">D</SelectItem>
            <SelectItem value="V">V</SelectItem>
            <SelectItem value="42">42</SelectItem>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="0">0</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="add_on_indicator"
            checked={formData.add_on_indicator === "A"}
            onCheckedChange={(checked: boolean) =>
              setFormData({ ...formData, add_on_indicator: checked ? "A" : "" })
            }
          />
          <Label htmlFor="add_on_indicator">Add-on Indicator</Label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="multiple_unit_indicator"
            checked={formData.multiple_unit_indicator === "U"}
            onCheckedChange={(checked: boolean) =>
              setFormData({
                ...formData,
                multiple_unit_indicator: checked ? "U" : "",
              })
            }
          />
          <Label htmlFor="multiple_unit_indicator">
            Multiple Unit Indicator
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="fee_determinant">Fee Determinant</Label>
        <Select
          value={formData.fee_determinant}
          onValueChange={(value) =>
            setFormData({ ...formData, fee_determinant: value })
          }
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select fee determinant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DH">DH</SelectItem>
            <SelectItem value="X">X</SelectItem>
            <SelectItem value="S">S</SelectItem>
            <SelectItem value="Z">Z</SelectItem>
            <SelectItem value="U">U</SelectItem>
            <SelectItem value="E">E</SelectItem>
            <SelectItem value="W">W</SelectItem>
            <SelectItem value="D">D</SelectItem>
            <SelectItem value="P">P</SelectItem>
            <SelectItem value="TH">TH</SelectItem>
            <SelectItem value="H">H</SelectItem>
            <SelectItem value="T">T</SelectItem>
            <SelectItem value="G">G</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="anaesthesia_indicator">Anaesthesia Indicator</Label>
        <Select
          value={formData.anaesthesia_indicator || "none"}
          onValueChange={(value) =>
            setFormData({
              ...formData,
              anaesthesia_indicator: value === "none" ? "" : value,
            })
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select anaesthesia indicator" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="H">H</SelectItem>
            <SelectItem value="L">L</SelectItem>
            <SelectItem value="M">M</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="submit_at_100_percent"
            checked={formData.submit_at_100_percent === "Y"}
            onCheckedChange={(checked: boolean) =>
              setFormData({
                ...formData,
                submit_at_100_percent: checked ? "Y" : "",
              })
            }
          />
          <Label htmlFor="submit_at_100_percent">Submit at 100%</Label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="referring_practitioner_required"
            checked={formData.referring_practitioner_required === "Y"}
            onCheckedChange={(checked: boolean) =>
              setFormData({
                ...formData,
                referring_practitioner_required: checked ? "Y" : "",
              })
            }
          />
          <Label htmlFor="referring_practitioner_required">
            Referring Practitioner Required
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="start_time_required"
            checked={formData.start_time_required === "Y"}
            onCheckedChange={(checked: boolean) =>
              setFormData({
                ...formData,
                start_time_required: checked ? "Y" : "",
              })
            }
          />
          <Label htmlFor="start_time_required">Start Time Required</Label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="stop_time_required"
            checked={formData.stop_time_required === "Y"}
            onCheckedChange={(checked: boolean) =>
              setFormData({
                ...formData,
                stop_time_required: checked ? "Y" : "",
              })
            }
          />
          <Label htmlFor="stop_time_required">Stop Time Required</Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="technical_fee">Technical Fee</Label>
        <Input
          id="technical_fee"
          type="number"
          step="0.01"
          value={formData.technical_fee}
          onChange={(e) =>
            setFormData({
              ...formData,
              technical_fee: parseFloat(e.target.value),
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="max_units">Max Units</Label>
        <Input
          id="max_units"
          type="number"
          value={formData.max_units || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              max_units: e.target.value ? parseInt(e.target.value) : null,
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="day_range">Day Range</Label>
        <Input
          id="day_range"
          type="number"
          value={formData.day_range || ""}
          onChange={(e) =>
            setFormData({
              ...formData,
              day_range: e.target.value ? parseInt(e.target.value) : null,
            })
          }
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="billingRecordType">Billing Record Type</Label>
        <Select
          value={formData.billingRecordType.toString()}
          onValueChange={(value) =>
            setFormData({ ...formData, billingRecordType: parseInt(value) })
          }
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Select billing record type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="57">57</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Previous Codes Section */}
      <div className="space-y-4">
        <Label>Previous Codes</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search for previous codes..."
              value={previousCodeSearchQuery}
              onChange={(e) => setPreviousCodeSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviousCodeSearchQuery("")}
            >
              Clear
            </Button>
          </div>

          {previousCodeSearchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {previousCodeSearchResults.map((code) => (
                <div
                  key={code.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleAddPreviousCode(code)}
                >
                  <div className="font-medium">
                    {code.code} ({code.section.title})
                  </div>
                  <div className="text-sm text-gray-600">{code.title}</div>
                </div>
              ))}
            </div>
          )}

          {formData.previousCodes.length > 0 && (
            <div className="space-y-2">
              {formData.previousCodes.map((codeId) => {
                const code =
                  allBillingCodes.find((c) => c.id === codeId) ||
                  previousCodeSearchResults.find((c) => c.id === codeId);
                return code ? (
                  <div
                    key={codeId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div>
                      <span className="font-medium">{code.code}</span> -{" "}
                      {code.title}
                      <div className="text-sm text-gray-500">
                        {code.section.title}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePreviousCode(codeId)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div
                    key={codeId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div>
                      <span className="font-medium">Code ID: {codeId}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePreviousCode(codeId)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Next Codes Section */}
      <div className="space-y-4">
        <Label>Next Codes</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Search for next codes..."
              value={nextCodeSearchQuery}
              onChange={(e) => setNextCodeSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => setNextCodeSearchQuery("")}
            >
              Clear
            </Button>
          </div>

          {nextCodeSearchResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
              {nextCodeSearchResults.map((code) => (
                <div
                  key={code.id}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => handleAddNextCode(code)}
                >
                  <div className="font-medium">
                    {code.code} ({code.section.title})
                  </div>
                  <div className="text-sm text-gray-600">{code.title}</div>
                </div>
              ))}
            </div>
          )}

          {formData.nextCodes.length > 0 && (
            <div className="space-y-2">
              {formData.nextCodes.map((codeId) => {
                const code =
                  allBillingCodes.find((c) => c.id === codeId) ||
                  nextCodeSearchResults.find((c) => c.id === codeId);
                return code ? (
                  <div
                    key={codeId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div>
                      <span className="font-medium">{code.code}</span> -{" "}
                      {code.title}
                      <div className="text-sm text-gray-500">
                        {code.section.title}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveNextCode(codeId)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div
                    key={codeId}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                  >
                    <div>
                      <span className="font-medium">Code ID: {codeId}</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveNextCode(codeId)}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
          low_fee: formData.low_fee || null,
          high_fee: formData.high_fee || null,
          service_class: formData.service_class || null,
          add_on_indicator: formData.add_on_indicator || null,
          multiple_unit_indicator: formData.multiple_unit_indicator || null,
          fee_determinant: formData.fee_determinant || null,
          anaesthesia_indicator: formData.anaesthesia_indicator || null,
          submit_at_100_percent: formData.submit_at_100_percent || null,
          referring_practitioner_required:
            formData.referring_practitioner_required || null,
          start_time_required: formData.start_time_required || null,
          stop_time_required: formData.stop_time_required || null,
          technical_fee: formData.technical_fee || null,
          max_units: formData.max_units || null,
          day_range: formData.day_range || null,
          previousCodes: formData.previousCodes || [],
          nextCodes: formData.nextCodes || [],
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
          low_fee: formData.low_fee || null,
          high_fee: formData.high_fee || null,
          service_class: formData.service_class || null,
          add_on_indicator: formData.add_on_indicator || null,
          multiple_unit_indicator: formData.multiple_unit_indicator || null,
          fee_determinant: formData.fee_determinant || null,
          anaesthesia_indicator: formData.anaesthesia_indicator || null,
          submit_at_100_percent: formData.submit_at_100_percent || null,
          referring_practitioner_required:
            formData.referring_practitioner_required || null,
          start_time_required: formData.start_time_required || null,
          stop_time_required: formData.stop_time_required || null,
          technical_fee: formData.technical_fee || null,
          max_units: formData.max_units || null,
          day_range: formData.day_range || null,
          previousCodes: formData.previousCodes || [],
          nextCodes: formData.nextCodes || [],
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                        low_fee:
                          billingCodes.find((code) => code.id === editingId)!
                            .low_fee || 0,
                        high_fee:
                          billingCodes.find((code) => code.id === editingId)!
                            .high_fee || 0,
                        service_class:
                          billingCodes.find((code) => code.id === editingId)!
                            .service_class || "",
                        add_on_indicator:
                          billingCodes.find((code) => code.id === editingId)!
                            .add_on_indicator || "",
                        multiple_unit_indicator:
                          billingCodes.find((code) => code.id === editingId)!
                            .multiple_unit_indicator || "",
                        fee_determinant:
                          billingCodes.find((code) => code.id === editingId)!
                            .fee_determinant || "",
                        anaesthesia_indicator:
                          billingCodes.find((code) => code.id === editingId)!
                            .anaesthesia_indicator || "",
                        submit_at_100_percent:
                          billingCodes.find((code) => code.id === editingId)!
                            .submit_at_100_percent || "",
                        referring_practitioner_required:
                          billingCodes.find((code) => code.id === editingId)!
                            .referring_practitioner_required || "",
                        start_time_required:
                          billingCodes.find((code) => code.id === editingId)!
                            .start_time_required || "",
                        stop_time_required:
                          billingCodes.find((code) => code.id === editingId)!
                            .stop_time_required || "",
                        technical_fee:
                          billingCodes.find((code) => code.id === editingId)!
                            .technical_fee || 0,
                        max_units:
                          billingCodes.find((code) => code.id === editingId)!
                            .max_units || null,
                        day_range:
                          billingCodes.find((code) => code.id === editingId)!
                            .day_range || null,
                        billingRecordType:
                          billingCodes.find((code) => code.id === editingId)!
                            .billing_record_type || 50,
                        previousCodes:
                          billingCodes
                            .find((code) => code.id === editingId)!
                            .previousCodes.map((rel) => rel.previous_code.id) ||
                          [],
                        nextCodes:
                          billingCodes
                            .find((code) => code.id === editingId)!
                            .nextCodes.map((rel) => rel.next_code.id) || [],
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
              <TableHead>Previous Codes</TableHead>
              <TableHead>Next Codes</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : billingCodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center">
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
                    {code.previousCodes.length > 0 ? (
                      <div className="space-y-1">
                        {code.previousCodes.map((rel) => (
                          <div key={rel.previous_code.id} className="text-sm">
                            {rel.previous_code.code} - {rel.previous_code.title}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {code.nextCodes.length > 0 ? (
                      <div className="space-y-1">
                        {code.nextCodes.map((rel) => (
                          <div key={rel.next_code.id} className="text-sm">
                            {rel.next_code.code} - {rel.next_code.title}
                          </div>
                        ))}
                      </div>
                    ) : (
                      "-"
                    )}
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
                        {log.low_fee && <div>Low Fee: {log.low_fee}</div>}
                        {log.high_fee && <div>High Fee: {log.high_fee}</div>}
                        {log.service_class && (
                          <div>Service Class: {log.service_class}</div>
                        )}
                        {log.add_on_indicator && (
                          <div>Add-on Indicator: {log.add_on_indicator}</div>
                        )}
                        {log.multiple_unit_indicator && (
                          <div>
                            Multiple Unit Indicator:{" "}
                            {log.multiple_unit_indicator}
                          </div>
                        )}
                        {log.fee_determinant && (
                          <div>Fee Determinant: {log.fee_determinant}</div>
                        )}
                        {log.anaesthesia_indicator && (
                          <div>
                            Anaesthesia Indicator: {log.anaesthesia_indicator}
                          </div>
                        )}
                        {log.submit_at_100_percent && (
                          <div>Submit at 100%: {log.submit_at_100_percent}</div>
                        )}
                        {log.referring_practitioner_required && (
                          <div>
                            Referring Practitioner Required:{" "}
                            {log.referring_practitioner_required}
                          </div>
                        )}
                        {log.start_time_required && (
                          <div>
                            Start Time Required: {log.start_time_required}
                          </div>
                        )}
                        {log.stop_time_required && (
                          <div>
                            Stop Time Required: {log.stop_time_required}
                          </div>
                        )}
                        {log.technical_fee && (
                          <div>Technical Fee: {log.technical_fee}</div>
                        )}
                        {log.max_units && <div>Max Units: {log.max_units}</div>}
                        {log.day_range && <div>Day Range: {log.day_range}</div>}
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
