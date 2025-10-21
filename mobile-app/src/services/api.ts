import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";
import {
  AIPrompt,
  BillingCode,
  HealthInstitution,
  ICDCode,
  Patient,
  Physician,
  ReferringPhysician,
  SearchResponse,
  Service,
  ServiceFormData,
  User,
} from "../types";

// Get API base URL from Expo constants (set by app.config.ts)
const API_BASE_URL = (Constants?.expoConfig as any)?.extra
  ?.apiBaseUrl as string;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token if available
api.interceptors.request.use(async (config) => {
  // Add user headers for authentication
  try {
    const userStr = await AsyncStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      // Set individual headers as expected by the middleware
      config.headers["x-user-id"] = user.id;
      config.headers["x-user-email"] = user.email;
      config.headers["x-user-roles"] = user.roles.join(",");
    }
  } catch (error) {
    console.error("Error getting user from storage:", error);
  }

  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error("API Error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
    });
    return Promise.reject(error);
  }
);

export const testAPI = {
  test: async () => {
    const response = await api.get("/api/test");
    return response.data;
  },
};

export const searchAPI = {
  search: async (
    query: string,
    page: number = 1,
    limit: number = 20,
    jurisdictionId: number = 1,
    userId?: string
  ): Promise<SearchResponse> => {
    const params = new URLSearchParams({
      query: encodeURIComponent(query),
      page: page.toString(),
      limit: limit.toString(),
      jurisdictionId: jurisdictionId.toString(),
    });

    if (userId) {
      params.append("userId", userId);
    }

    const response = await api.get(`/api/search?${params.toString()}`);
    return response.data;
  },
};

export const authAPI = {
  signIn: async (email: string, password: string) => {
    const response = await api.post("/api/mobile-auth/login", {
      email,
      password,
    });
    return response.data;
  },

  signUp: async (userData: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) => {
    // The register endpoint expects an address object, so we'll create a basic one
    const registerData = {
      email: userData.email,
      password: userData.password,
      address: {
        street: "123 Main St",
        city: "Saskatoon",
        state: "SK",
        postalCode: "S7K 1A1",
        country: "Canada",
        unit: null,
      },
    };
    const response = await api.post("/api/auth/register", registerData);
    return response.data;
  },

  signOut: async () => {
    const response = await api.post("/api/auth/logout");
    return response.data;
  },

  getSession: async (): Promise<{ user: User } | null> => {
    try {
      const response = await api.get("/api/auth/session");
      return response.data;
    } catch (error) {
      return null;
    }
  },

  getUserWithPhysicians: async (): Promise<User> => {
    const response = await api.get("/api/user/profile");
    return response.data;
  },
};

export const billingTypesAPI = {
  updateActiveBillingType: async (
    physicianId: string,
    billingTypeId: number
  ): Promise<void> => {
    await api.put(
      `/api/physician-billing-types/${physicianId}/${billingTypeId}/active`
    );
  },
};

export const billingCodesAPI = {
  getAll: async (): Promise<BillingCode[]> => {
    const response = await api.get("/api/billing-codes");
    return response.data;
  },

  getById: async (id: number): Promise<BillingCode> => {
    const response = await api.get(`/api/billing-codes/${id}`);
    return response.data;
  },

  search: async (query: string): Promise<BillingCode[]> => {
    const response = await api.get(
      `/api/search?query=${encodeURIComponent(query)}&limit=20`
    );
    // Transform the search response to match BillingCode format
    return response.data.results.map((result: any) => ({
      id: result.id,
      code: result.code,
      title: result.title,
      description: result.description,
      section: result.section,
      multiple_unit_indicator: result.multiple_unit_indicator,
      fee_determinant: result.fee_determinant,
      billing_record_type: result.billing_record_type,
      referring_practitioner_required: result.referring_practitioner_required,
      start_time_required: result.start_time_required,
      end_time_required: result.end_time_required,
      day_range: result.day_range,
      max_units: result.max_units,
      previousCodes: result.previousCodes,
      nextCodes: result.nextCodes,
      billingCodeChains: result.billingCodeChains,
      billing_unit_type: result.billing_unit_type,
      jurisdiction: {
        id: 1, // Default jurisdiction
        name: "Saskatchewan",
      },
      provider: {
        id: 1, // Default provider
        name: "Default Provider",
      },
    }));
  },

  getFrequentlyUsed: async (physicianId: string): Promise<BillingCode[]> => {
    const response = await api.get(
      `/api/billing-codes/frequently-used/${physicianId}`
    );
    return response.data;
  },
};

export const aiPromptsAPI = {
  getAll: async (): Promise<AIPrompt[]> => {
    const response = await api.get("/api/ai-prompts");
    return response.data;
  },

  getById: async (id: number): Promise<AIPrompt> => {
    const response = await api.get(`/api/ai-prompts/${id}`);
    return response.data;
  },
};

export const servicesAPI = {
  getAll: async (): Promise<Service[]> => {
    const response = await api.get("/api/services");
    return response.data;
  },

  getById: async (id: string): Promise<Service> => {
    const response = await api.get(`/api/services/${id}`);
    return response.data;
  },

  create: async (data: ServiceFormData): Promise<Service> => {
    const response = await api.post("/api/services", data);
    return response.data;
  },

  update: async (id: string, data: ServiceFormData): Promise<Service> => {
    const response = await api.put(`/api/services/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/services/${id}`);
  },

  round: async (
    id: string,
    serviceDate?: string | null
  ): Promise<{ service: Service; newServiceCodes: any[]; message: string }> => {
    const response = await api.post(`/api/services/${id}/round`, {
      // If provided, pass the service date so backend can use it for rounding
      serviceDate: serviceDate ?? null,
    });
    return response.data;
  },

  addServiceCodes: async (
    serviceId: string,
    billingCodes: Array<{
      codeId: number;
      serviceStartTime: string | null;
      serviceEndTime: string | null;
      serviceDate: string | null;
      serviceEndDate: string | null;
      bilateralIndicator: string | null;
      numberOfUnits: number | null;
      specialCircumstances: string | null;
      // serviceLocation and locationOfService are determined by the backend
    }>
  ): Promise<any[]> => {
    const serviceCodesData = billingCodes.map((code) => ({
      ...code,
      serviceId: serviceId,
    }));

    const response = await api.post("/api/service-codes", serviceCodesData);
    return response.data;
  },

  discharge: async (
    serviceId: string,
    dischargeDate: string
  ): Promise<Service> => {
    const response = await api.post(`/api/services/${serviceId}/discharge`, {
      dischargeDate,
    });
    return response.data;
  },
};

export const physiciansAPI = {
  getAll: async (): Promise<Physician[]> => {
    const response = await api.get("/api/physicians");
    return response.data;
  },
};

export const patientsAPI = {
  getAll: async (): Promise<Patient[]> => {
    const response = await api.get("/api/patients");
    return response.data;
  },

  search: async (query: string): Promise<Patient[]> => {
    const response = await api.get(
      `/api/patients/search?query=${encodeURIComponent(query)}`
    );
    return response.data;
  },

  create: async (data: {
    firstName: string;
    lastName: string;
    billingNumber: string;
    dateOfBirth: string;
    sex: string;
    physicianId: string;
  }): Promise<Patient> => {
    const response = await api.post("/api/patients", data);
    return response.data;
  },
};

export const icdCodesAPI = {
  search: async (query: string): Promise<ICDCode[]> => {
    const response = await api.get(
      `/api/icd-search?query=${encodeURIComponent(query)}`
    );
    return response.data.results;
  },
};

export const referringPhysiciansAPI = {
  search: async (query: string): Promise<ReferringPhysician[]> => {
    const response = await api.get(
      `/api/referring-physicians?search=${encodeURIComponent(query)}`
    );
    return response.data;
  },
};

export const healthInstitutionsAPI = {
  getAll: async (): Promise<HealthInstitution[]> => {
    const response = await api.get("/api/health-institutions");
    return response.data;
  },
};

export default api;
