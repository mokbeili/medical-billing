export interface SearchResult {
  id: number;
  code: string;
  title: string;
  description: string | null;
  section: {
    code: string;
    title: string;
  };
  similarity?: number;
  displayCode: string;
  searchType?: string;
  billing_record_type: number;
  referring_practitioner_required: string | null;
  multiple_unit_indicator: string;
  start_time_required: boolean;
  stop_time_required: boolean;
  day_range: number | null;
  max_units: number | null;
  previousCodes?: Array<{
    previousCode: {
      id: number;
      code: string;
      title: string;
      section: {
        code: string;
        title: string;
      };
    };
  }>;
}

export interface SearchResponse {
  type:
    | "combined"
    | "exact_code"
    | "exact_title"
    | "partial_code"
    | "synonym"
    | "ai_strict"
    | "similar_query"
    | "ai_refined";
  results: SearchResult[];
  search_types_used: (
    | "exact_code"
    | "exact_title"
    | "partial_code"
    | "synonym"
    | "ai_strict"
    | "similar_query"
    | "ai_refined"
  )[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles: string[];
  physicians?: Physician[];
}

export interface BillingType {
  id: number;
  code: string;
  title: string;
  jurisdictionId: number;
}

export interface PhysicianBillingType {
  id: number;
  physicianId: string;
  billingTypeId: number;
  active: boolean;
  colorCode: string;
  billingType: BillingType;
}

export interface Session {
  user: User;
  expires: string;
}

export interface BillingCode {
  id: number;
  code: string;
  title: string;
  description: string | null;
  section: {
    code: string;
    title: string;
  };
  jurisdiction: {
    id: number;
    name: string;
  };
  provider: {
    id: number;
    name: string;
  };
  billing_record_type: number;
  referring_practitioner_required: string | null;
  fee_determinant: string;
  multiple_unit_indicator: string | null;
  max_units: number | null;
  start_time_required: string | null;
  stop_time_required: string | null;
  day_range: number | null;
  previousCodes?: Array<{
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
  nextCodes?: Array<{
    nextCode: {
      id: number;
      code: string;
      title: string;
      section: {
        code: string;
        title: string;
      };
    };
  }>;
  billingCodeChains?: Array<{
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

export interface AIPrompt {
  id: number;
  title: string;
  prompt: string;
  jurisdiction: {
    id: number;
    name: string;
  };
  provider: {
    id: number;
    name: string;
  };
}

export interface Physician {
  id: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  billingNumber: string;
  jurisdictionId: number;
  healthInstitution?: {
    city: string;
  } | null;
  frequentlyUsedCodes?: Array<{
    sortMetric: number;
    billingCode: {
      id: number;
      code: string;
      title: string;
      description: string | null;
    };
  }>;
  physicianBillingTypes?: PhysicianBillingType[];
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  middleInitial: string | null;
  billingNumber: string;
  dateOfBirth: string;
  sex: string;
}

export interface ICDCode {
  id: number;
  version: string;
  code: string;
  description: string;
}

export interface ReferringPhysician {
  id: number;
  code: string;
  name: string;
  location: string;
  specialty: string;
}

export interface HealthInstitution {
  id: number;
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface ServiceCodeChangeLog {
  id: number;
  changeType: "INSERT" | "DELETE" | "UPDATE" | "ROUND";
  previousData: string | null;
  newData: string | null;
  changedBy: number | null;
  changedAt: string;
  notes: string | null;
  roundingDate: string | null;
}

export interface ServiceCode {
  id: number;
  status: string;
  specialCircumstances: string | null;
  bilateralIndicator: string | null;
  serviceStartTime: string | null;
  serviceEndTime: string | null;
  serviceDate: string | null;
  serviceEndDate: string | null;
  serviceLocation: string | null;
  locationOfService: string | null;
  numberOfUnits: number | null;
  summary: string;
  createdAt: string;
  billingCode: BillingCode;
  changeLogs: ServiceCodeChangeLog[];
}

export interface Service {
  id: string;
  serviceDate: string;
  claimId: string | null;
  status: string;
  billingTypeId: number | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    middleInitial: string | null;
    billingNumber: string;
    dateOfBirth: string;
    sex: string;
  };
  physician: {
    id: string;
    firstName: string;
    lastName: string;
    billingNumber: string;
  };
  icdCode: {
    id: number;
    code: string;
    description: string;
  } | null;
  referringPhysician: {
    id: number;
    code: string;
    name: string;
  } | null;
  healthInstitution: {
    id: number;
    name: string;
  } | null;
  serviceCodes: ServiceCode[];
}

export interface ServiceFormData {
  physicianId: string;
  patientId: string;
  referringPhysicianId: number | null;
  icdCodeId: number | null;
  healthInstitutionId: number | null;
  summary: string;
  serviceDate: string;
  serviceLocation: string | null;
  locationOfService: string | null;
  serviceStatus: string;
  billingCodes: Array<{
    id?: number; // Optional service code ID (for existing codes)
    codeId: number;
    status: string;
    billing_record_type: number;
    serviceStartTime: string | null;
    serviceEndTime: string | null;
    numberOfUnits: number | null;
    bilateralIndicator: string | null;
    specialCircumstances: string | null;
    serviceDate: string | null;
    serviceEndDate: string | null;
    fee_determinant: string;
    multiple_unit_indicator: string | null;
  }>;
}
