"use client";

import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const CANADIAN_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "YT", name: "Yukon" },
];

// Canadian postal code validation function
const validateCanadianPostalCode = (postalCode: string): boolean => {
  // Canadian postal code format: A1A 1A1 (letter-number-letter space number-letter-number)
  const postalCodeRegex = /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/;
  return postalCodeRegex.test(postalCode);
};

// Format postal code to standard format (A1A 1A1)
const formatPostalCode = (postalCode: string): string => {
  // Remove all non-alphanumeric characters
  const cleaned = postalCode.replace(/[^A-Za-z0-9]/g, "");

  if (cleaned.length === 6) {
    // Insert space after first 3 characters
    return cleaned.slice(0, 3) + " " + cleaned.slice(3);
  }

  return postalCode;
};

// Password strength validation
const validatePasswordStrength = (password: string) => {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const strength = Object.values(checks).filter(Boolean).length;

  return {
    checks,
    strength,
    isValid: strength >= 4, // At least 4 out of 5 criteria must be met
  };
};

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  is_physician: boolean;
  address: {
    street: string;
    unit: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  // Physician-specific fields
  group_number: string;
  clinic_info: {
    name: string;
    clinicNumber: string;
    phoneNumber: string;
    existing_clinic: boolean;
    clinic_id?: number;
    address: {
      street: string;
      unit: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    same_as_above: boolean;
  };
  physician_confirmation: {
    billing_code: string;
    confirmed: boolean;
  };
}

export default function RegisterPage() {
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    is_physician: false,
    address: {
      street: "",
      unit: "",
      city: "",
      state: "",
      postalCode: "",
      country: "Canada",
    },
    // Physician-specific fields
    group_number: "",
    clinic_info: {
      name: "",
      clinicNumber: "",
      phoneNumber: "",
      existing_clinic: false,
      address: {
        street: "",
        unit: "",
        city: "",
        state: "",
        postalCode: "",
        country: "Canada",
      },
      same_as_above: false,
    },
    physician_confirmation: {
      billing_code: "",
      confirmed: false,
    },
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState("");
  const [clinicPostalCodeError, setClinicPostalCodeError] = useState("");
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [provinceSearch, setProvinceSearch] = useState("");
  const provinceDropdownRef = useRef<HTMLDivElement>(null);

  // Physician search states
  const [physicianSearchQuery, setPhysicianSearchQuery] = useState("");
  const [physicianSearchResults, setPhysicianSearchResults] = useState<any[]>(
    []
  );
  const [isSearchingPhysician, setIsSearchingPhysician] = useState(false);
  const [selectedPhysician, setSelectedPhysician] = useState<any>(null);

  // Clinic search states
  const [clinicSearchResults, setClinicSearchResults] = useState<any[]>([]);
  const [isSearchingClinic, setIsSearchingClinic] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<any>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        provinceDropdownRef.current &&
        !provinceDropdownRef.current.contains(event.target as Node)
      ) {
        console.log("Clicking outside, closing dropdown");
        setOpen(false);
        setProvinceSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Prevent form submission when dropdown is open
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        setProvinceSearch("");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Calculate password strength
  const [passwordStrength, setPasswordStrength] = useState(
    validatePasswordStrength("")
  );

  // Update password strength when password changes
  useEffect(() => {
    const newStrength = validatePasswordStrength(formData.password);
    console.log("Password strength updated:", newStrength);
    setPasswordStrength(newStrength);
  }, [formData.password]);

  // Debug dropdown state
  useEffect(() => {
    console.log("Dropdown open state changed:", open);
    console.log("Province search:", provinceSearch);
  }, [open, provinceSearch]);

  // Set default physician search query when user checks "Register as a physician"
  useEffect(() => {
    if (formData.is_physician && formData.firstName && formData.lastName) {
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      if (fullName && !physicianSearchQuery && !selectedPhysician) {
        setPhysicianSearchQuery(fullName);
      }
    }
  }, [
    formData.is_physician,
    formData.firstName,
    formData.lastName,
    physicianSearchQuery,
    selectedPhysician,
  ]);

  // Physician search effect
  useEffect(() => {
    const searchPhysicians = async () => {
      if (physicianSearchQuery.length < 2) {
        setPhysicianSearchResults([]);
        return;
      }
      setIsSearchingPhysician(true);
      try {
        const response = await fetch(
          `/api/referring-physicians/public?search=${encodeURIComponent(
            physicianSearchQuery
          )}`
        );
        if (response.ok) {
          const data = await response.json();
          setPhysicianSearchResults(data);
        }
      } catch (error) {
        console.error("Error searching physicians:", error);
      } finally {
        setIsSearchingPhysician(false);
      }
    };

    const debounceTimer = setTimeout(searchPhysicians, 300);
    return () => clearTimeout(debounceTimer);
  }, [physicianSearchQuery]);

  // Clinic search effect
  useEffect(() => {
    const searchClinic = async () => {
      if (
        !formData.clinic_info.clinicNumber ||
        formData.clinic_info.clinicNumber.length < 2
      ) {
        setClinicSearchResults([]);
        return;
      }
      setIsSearchingClinic(true);
      try {
        const response = await fetch(
          `/api/health-institutions/public?clinicNumber=${encodeURIComponent(
            formData.clinic_info.clinicNumber
          )}`
        );
        if (response.ok) {
          const data = await response.json();
          setClinicSearchResults(data);
          if (data.length > 0) {
            setSelectedClinic(data[0]);
            // Prefill clinic information
            setFormData((prev) => ({
              ...prev,
              clinic_info: {
                ...prev.clinic_info,
                name: data[0].name,
                phoneNumber: data[0].phoneNumber,
                existing_clinic: true,
                clinic_id: data[0].id,
                address: {
                  street: data[0].street,
                  unit: "",
                  city: data[0].city,
                  state: data[0].state,
                  postalCode: data[0].postalCode,
                  country: data[0].country,
                },
              },
            }));
          }
        }
      } catch (error) {
        console.error("Error searching clinic:", error);
      } finally {
        setIsSearchingClinic(false);
      }
    };

    const debounceTimer = setTimeout(searchClinic, 300);
    return () => clearTimeout(debounceTimer);
  }, [formData.clinic_info.clinicNumber]);

  // Check if all required fields are filled
  const isFormValid = () => {
    const requiredFields = [
      formData.firstName,
      formData.lastName,
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.address.street,
      formData.address.city,
      formData.address.state,
      formData.address.postalCode,
    ];

    const allFieldsFilled = requiredFields.every(
      (field) => field.trim() !== ""
    );
    const passwordsMatch = formData.password === formData.confirmPassword;
    const passwordStrong = passwordStrength.isValid;
    const postalCodeValid = validateCanadianPostalCode(
      formData.address.postalCode
    );

    // Physician-specific validation
    let physicianFieldsValid = true;
    if (formData.is_physician) {
      const clinicAddressValid =
        formData.clinic_info.existing_clinic ||
        (formData.clinic_info.address.street.trim() !== "" &&
          formData.clinic_info.address.city.trim() !== "" &&
          formData.clinic_info.address.state.trim() !== "" &&
          formData.clinic_info.address.postalCode.trim() !== "" &&
          validateCanadianPostalCode(formData.clinic_info.address.postalCode));

      physicianFieldsValid =
        formData.group_number.trim() !== "" &&
        formData.clinic_info.name.trim() !== "" &&
        formData.clinic_info.clinicNumber.trim() !== "" &&
        formData.clinic_info.phoneNumber.trim() !== "" &&
        formData.physician_confirmation.billing_code.trim() !== "" &&
        formData.physician_confirmation.confirmed &&
        clinicAddressValid;
    }

    return (
      allFieldsFilled &&
      passwordsMatch &&
      passwordStrong &&
      postalCodeValid &&
      physicianFieldsValid
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPostalCodeError("");
    setClinicPostalCodeError("");
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (!passwordStrength.isValid) {
      setError("Password does not meet strength requirements");
      setLoading(false);
      return;
    }

    // Validate postal code
    if (!validateCanadianPostalCode(formData.address.postalCode)) {
      setPostalCodeError(
        "Please enter a valid Canadian postal code (e.g., A1A 1A1)"
      );
      setLoading(false);
      return;
    }

    // Validate clinic postal code if physician registration
    if (
      formData.is_physician &&
      !formData.clinic_info.existing_clinic &&
      !validateCanadianPostalCode(formData.clinic_info.address.postalCode)
    ) {
      setClinicPostalCodeError(
        "Please enter a valid Canadian postal code for the clinic (e.g., A1A 1A1)"
      );
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          password: formData.password,
          is_physician: formData.is_physician,
          address: formData.address,
          group_number: formData.group_number,
          clinic_info: formData.clinic_info,
          physician_confirmation: formData.physician_confirmation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed");
      }

      window.location.href = "/auth/signin?registered=true";
    } catch (err: any) {
      setError(err.message || "An error occurred during registration");
      console.error("Registration error:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateAddress = (
    field: keyof typeof formData.address,
    value: string
  ) => {
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        [field]: value,
      },
    });

    // Clear postal code error when user starts typing
    if (field === "postalCode") {
      setPostalCodeError("");
    }
  };

  const updateClinicAddress = (
    field: keyof typeof formData.clinic_info.address,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      clinic_info: {
        ...prev.clinic_info,
        address: {
          ...prev.clinic_info.address,
          [field]: value,
        },
      },
    }));
  };

  const handlePostalCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    const formatted = formatPostalCode(value);
    updateAddress("postalCode", formatted);
  };

  const handleClinicPostalCodeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.toUpperCase();
    const formatted = formatPostalCode(value);
    updateClinicAddress("postalCode", formatted);
    setClinicPostalCodeError(""); // Clear error when user starts typing
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.strength <= 2) return "bg-red-500";
    if (passwordStrength.strength === 3) return "bg-yellow-500";
    if (passwordStrength.strength === 4) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.strength <= 2) return "Weak";
    if (passwordStrength.strength === 3) return "Fair";
    if (passwordStrength.strength === 4) return "Good";
    return "Strong";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {/* Account Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Account Information
            </h3>
            <div className="rounded-md shadow-sm -space-y-px">
              <input
                type="text"
                required
                className="appearance-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="First Name"
                value={formData.firstName}
                onChange={(e) =>
                  setFormData({ ...formData, firstName: e.target.value })
                }
              />
              <input
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={(e) =>
                  setFormData({ ...formData, lastName: e.target.value })
                }
              />
              <input
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm pr-10"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  className="appearance-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm pr-10"
                  placeholder="Confirm Password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      confirmPassword: e.target.value,
                    })
                  }
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Password strength:</span>
                  <span
                    className={cn(
                      "font-medium",
                      passwordStrength.strength <= 2
                        ? "text-red-600"
                        : passwordStrength.strength === 3
                        ? "text-yellow-600"
                        : passwordStrength.strength === 4
                        ? "text-blue-600"
                        : "text-green-600"
                    )}
                  >
                    {getPasswordStrengthText()}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      getPasswordStrengthColor()
                    )}
                    style={{
                      width: `${(passwordStrength.strength / 5) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div
                    className={cn(
                      "flex items-center",
                      passwordStrength.checks.length
                        ? "text-green-600"
                        : "text-gray-400"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3 w-3 mr-1",
                        passwordStrength.checks.length
                          ? "text-green-600"
                          : "text-gray-400"
                      )}
                    />
                    At least 8 characters
                  </div>
                  <div
                    className={cn(
                      "flex items-center",
                      passwordStrength.checks.uppercase
                        ? "text-green-600"
                        : "text-gray-400"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3 w-3 mr-1",
                        passwordStrength.checks.uppercase
                          ? "text-green-600"
                          : "text-gray-400"
                      )}
                    />
                    One uppercase letter
                  </div>
                  <div
                    className={cn(
                      "flex items-center",
                      passwordStrength.checks.lowercase
                        ? "text-green-600"
                        : "text-gray-400"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3 w-3 mr-1",
                        passwordStrength.checks.lowercase
                          ? "text-green-600"
                          : "text-gray-400"
                      )}
                    />
                    One lowercase letter
                  </div>
                  <div
                    className={cn(
                      "flex items-center",
                      passwordStrength.checks.number
                        ? "text-green-600"
                        : "text-gray-400"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3 w-3 mr-1",
                        passwordStrength.checks.number
                          ? "text-green-600"
                          : "text-gray-400"
                      )}
                    />
                    One number
                  </div>
                  <div
                    className={cn(
                      "flex items-center",
                      passwordStrength.checks.special
                        ? "text-green-600"
                        : "text-gray-400"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-3 w-3 mr-1",
                        passwordStrength.checks.special
                          ? "text-green-600"
                          : "text-gray-400"
                      )}
                    />
                    One special character
                  </div>
                </div>
              </div>
            )}

            {/* Password Match Indicator */}
            {formData.confirmPassword && (
              <div
                className={cn(
                  "flex items-center text-sm",
                  formData.password === formData.confirmPassword
                    ? "text-green-600"
                    : "text-red-600"
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 mr-2",
                    formData.password === formData.confirmPassword
                      ? "text-green-600"
                      : "text-red-600"
                  )}
                />
                {formData.password === formData.confirmPassword
                  ? "Passwords match"
                  : "Passwords do not match"}
              </div>
            )}
          </div>

          {/* Address Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">
              Address Information
            </h3>
            <div className="space-y-4">
              <input
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Street Address"
                value={formData.address.street}
                onChange={(e) => updateAddress("street", e.target.value)}
              />
              <input
                type="text"
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Apartment, suite, etc. (optional)"
                value={formData.address.unit}
                onChange={(e) => updateAddress("unit", e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4 overflow-visible">
                <input
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="City"
                  value={formData.address.city}
                  onChange={(e) => updateAddress("city", e.target.value)}
                />
                <div
                  className="relative z-10 overflow-visible"
                  ref={provinceDropdownRef}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log(
                        "Dropdown clicked, current open state:",
                        open
                      );
                      setOpen(!open);
                    }}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 hover:bg-gray-50"
                  >
                    {formData.address.state
                      ? CANADIAN_PROVINCES.find(
                          (province) => province.code === formData.address.state
                        )?.name
                      : "Select Province..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </button>

                  {open && (
                    <div
                      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto top-full left-0"
                      style={{ position: "absolute", zIndex: 9999 }}
                    >
                      <div className="p-2">
                        <input
                          type="text"
                          placeholder="Search province..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={provinceSearch}
                          onChange={(e) => setProvinceSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-auto">
                        {CANADIAN_PROVINCES.filter(
                          (province) =>
                            province.name
                              .toLowerCase()
                              .includes(provinceSearch.toLowerCase()) ||
                            province.code
                              .toLowerCase()
                              .includes(provinceSearch.toLowerCase())
                        ).map((province) => (
                          <button
                            key={province.code}
                            type="button"
                            onClick={() => {
                              console.log("Province selected:", province.name);
                              updateAddress("state", province.code);
                              setOpen(false);
                              setProvinceSearch("");
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.address.state === province.code
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {province.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="text"
                    required
                    className={cn(
                      "appearance-none rounded-md relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                      postalCodeError
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-gray-300 focus:border-blue-500"
                    )}
                    placeholder="Postal Code (A1A 1A1)"
                    value={formData.address.postalCode}
                    onChange={handlePostalCodeChange}
                    maxLength={7}
                  />
                  {postalCodeError && (
                    <p className="mt-1 text-sm text-red-600">
                      {postalCodeError}
                    </p>
                  )}
                </div>
                <input
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Country"
                  value={formData.address.country}
                  onChange={(e) => updateAddress("country", e.target.value)}
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Physician Registration Checkbox */}
          <div className="flex items-center">
            <input
              id="is_physician"
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              checked={formData.is_physician}
              onChange={(e) =>
                setFormData({ ...formData, is_physician: e.target.checked })
              }
            />
            <label
              htmlFor="is_physician"
              className="ml-2 block text-sm text-gray-900"
            >
              Register as a physician
            </label>
          </div>

          {/* Physician Information Section */}
          {formData.is_physician && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                Physician Information
              </h3>

              {/* Group Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group Number *
                </label>
                <input
                  type="text"
                  required
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your group number"
                  value={formData.group_number}
                  onChange={(e) =>
                    setFormData({ ...formData, group_number: e.target.value })
                  }
                />
              </div>

              {/* Physician Search and Confirmation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Your Information *
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type="text"
                      className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-20"
                      placeholder="Search for your name in the referring physicians database"
                      value={physicianSearchQuery}
                      onChange={(e) => setPhysicianSearchQuery(e.target.value)}
                    />
                    {physicianSearchQuery && (
                      <button
                        type="button"
                        onClick={() => {
                          setPhysicianSearchQuery("");
                          setPhysicianSearchResults([]);
                          setSelectedPhysician(null);
                          setFormData((prev) => ({
                            ...prev,
                            physician_confirmation: {
                              billing_code: "",
                              confirmed: false,
                            },
                          }));
                        }}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {isSearchingPhysician && (
                    <div className="text-sm text-gray-500 flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Searching...
                    </div>
                  )}

                  {physicianSearchResults.length > 0 && (
                    <div className="border border-gray-300 rounded-md max-h-40 overflow-auto">
                      {physicianSearchResults.map((physician) => (
                        <button
                          key={physician.id}
                          type="button"
                          onClick={() => {
                            setSelectedPhysician(physician);
                            setFormData((prev) => ({
                              ...prev,
                              physician_confirmation: {
                                billing_code: physician.code,
                                confirmed: true,
                              },
                            }));
                            setPhysicianSearchQuery(physician.name);
                            setPhysicianSearchResults([]);
                          }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                        >
                          <div className="font-medium">{physician.name}</div>
                          <div className="text-gray-600">
                            Code: {physician.code}
                          </div>
                          <div className="text-gray-600">
                            {physician.specialty}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedPhysician && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="text-sm text-green-800">
                        <div className="font-medium flex items-center justify-between">
                          <span>Selected: {selectedPhysician.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPhysician(null);
                              setFormData((prev) => ({
                                ...prev,
                                physician_confirmation: {
                                  billing_code: "",
                                  confirmed: false,
                                },
                              }));
                            }}
                            className="text-red-600 hover:text-red-800 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                        <div>Billing Code: {selectedPhysician.code}</div>
                        <div>Specialty: {selectedPhysician.specialty}</div>
                      </div>
                    </div>
                  )}

                  {physicianSearchQuery &&
                    !isSearchingPhysician &&
                    physicianSearchResults.length === 0 && (
                      <div className="text-sm text-gray-500">
                        No physicians found. Please try a different search term.
                      </div>
                    )}
                </div>
              </div>

              {/* Clinic Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinic Information *
                </label>
                <div className="space-y-3">
                  <input
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Clinic Name"
                    value={formData.clinic_info.name}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        clinic_info: {
                          ...prev.clinic_info,
                          name: e.target.value,
                        },
                      }))
                    }
                  />

                  <input
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Clinic Number"
                    value={formData.clinic_info.clinicNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        clinic_info: {
                          ...prev.clinic_info,
                          clinicNumber: e.target.value,
                        },
                      }))
                    }
                  />

                  <input
                    type="text"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Phone Number"
                    value={formData.clinic_info.phoneNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        clinic_info: {
                          ...prev.clinic_info,
                          phoneNumber: e.target.value,
                        },
                      }))
                    }
                  />

                  {formData.clinic_info.existing_clinic ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <div className="text-sm text-blue-800">
                        Clinic found in database. Address will be pre-filled.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center mb-2">
                        <input
                          id="same_as_above"
                          type="checkbox"
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          checked={formData.clinic_info.same_as_above}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              clinic_info: {
                                ...prev.clinic_info,
                                same_as_above: e.target.checked,
                                address: e.target.checked
                                  ? formData.address
                                  : prev.clinic_info.address,
                              },
                            }))
                          }
                        />
                        <label
                          htmlFor="same_as_above"
                          className="ml-2 block text-sm text-gray-900"
                        >
                          Clinic address is the same as above
                        </label>
                      </div>

                      {!formData.clinic_info.same_as_above && (
                        <div className="space-y-3">
                          <input
                            type="text"
                            required
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Clinic Street Address"
                            value={formData.clinic_info.address.street}
                            onChange={(e) =>
                              updateClinicAddress("street", e.target.value)
                            }
                          />

                          <input
                            type="text"
                            className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Clinic Unit (optional)"
                            value={formData.clinic_info.address.unit}
                            onChange={(e) =>
                              updateClinicAddress("unit", e.target.value)
                            }
                          />

                          <div className="grid grid-cols-2 gap-4">
                            <input
                              type="text"
                              required
                              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Clinic City"
                              value={formData.clinic_info.address.city}
                              onChange={(e) =>
                                updateClinicAddress("city", e.target.value)
                              }
                            />

                            <input
                              type="text"
                              required
                              className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                              placeholder="Clinic Province"
                              value={formData.clinic_info.address.state}
                              onChange={(e) =>
                                updateClinicAddress("state", e.target.value)
                              }
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              required
                              className={cn(
                                "appearance-none rounded-md relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm",
                                clinicPostalCodeError
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                  : "border-gray-300 focus:border-blue-500"
                              )}
                              placeholder="Clinic Postal Code (A1A 1A1)"
                              value={formData.clinic_info.address.postalCode}
                              onChange={handleClinicPostalCodeChange}
                              maxLength={7}
                            />
                            {clinicPostalCodeError && (
                              <p className="mt-1 text-sm text-red-600">
                                {clinicPostalCodeError}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className={cn(
                "group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                isFormValid() && !loading
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              )}
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating account...
                </span>
              ) : (
                "Create account"
              )}
            </button>
          </div>

          <div className="text-center">
            <Link
              href="/auth/signin"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
