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
}

export interface Service {
  id: string;
  serviceDate: string;
  claimId: string | null;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    middleInitial: string | null;
    billingNumber: string;
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
  billingCodes: Array<{
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
  }>;
}
