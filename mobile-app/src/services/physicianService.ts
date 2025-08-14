import { PatientData } from "../utils/expoTextRecognitionService";

export interface ReferringPhysician {
  id: number;
  jurisdiction_id: number;
  code: string;
  name: string;
  location: string;
  specialty: string;
  physician_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ServiceData {
  billingNumber: string;
  firstName: string;
  lastName: string;
  middleInitial?: string;
  dateOfBirth: string;
  gender: string;
  serviceDate?: string;
  visitNumber?: string;
  attendingPhysicianId?: number;
  familyPhysicianId?: number;
}

export class PhysicianService {
  private baseUrl: string;

  constructor() {
    // Use environment variable or default to local development
    this.baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";
  }

  /**
   * Search for referring physicians by name
   */
  async searchReferringPhysicians(
    searchTerm: string
  ): Promise<ReferringPhysician[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/referring-physicians?search=${encodeURIComponent(
          searchTerm
        )}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error searching referring physicians:", error);
      throw error;
    }
  }

  /**
   * Find the best matching physician for a given name
   */
  async findBestMatchingPhysician(
    physicianName: string
  ): Promise<ReferringPhysician | null> {
    try {
      // Clean up the physician name
      const cleanName = physicianName.trim().toLowerCase();

      // Search for the physician
      const results = await this.searchReferringPhysicians(cleanName);

      if (results.length === 0) {
        return null;
      }

      // Find exact match first
      const exactMatch = results.find(
        (physician) => physician.name.toLowerCase() === cleanName
      );

      if (exactMatch) {
        return exactMatch;
      }

      // Find partial match
      const partialMatch = results.find(
        (physician) =>
          physician.name.toLowerCase().includes(cleanName) ||
          cleanName.includes(physician.name.toLowerCase())
      );

      if (partialMatch) {
        return partialMatch;
      }

      // Return the first result if no better match found
      return results[0];
    } catch (error) {
      console.error("Error finding best matching physician:", error);
      return null;
    }
  }

  /**
   * Process patient data and find matching physicians
   */
  async processPatientData(patientData: PatientData): Promise<ServiceData> {
    try {
      let attendingPhysicianId: number | undefined;
      let familyPhysicianId: number | undefined;

      // Find attending physician if present
      if (patientData.attendingPhysician) {
        const attendingPhysician = await this.findBestMatchingPhysician(
          patientData.attendingPhysician
        );
        if (attendingPhysician) {
          attendingPhysicianId = attendingPhysician.id;
          console.log("Found attending physician:", attendingPhysician.name);
        } else {
          console.log(
            "No matching attending physician found for:",
            patientData.attendingPhysician
          );
        }
      }

      // Find family physician if present
      if (patientData.familyPhysician) {
        const familyPhysician = await this.findBestMatchingPhysician(
          patientData.familyPhysician
        );
        if (familyPhysician) {
          familyPhysicianId = familyPhysician.id;
          console.log("Found family physician:", familyPhysician.name);
        } else {
          console.log(
            "No matching family physician found for:",
            patientData.familyPhysician
          );
        }
      }

      return {
        billingNumber: patientData.billingNumber,
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        middleInitial: patientData.middleInitial,
        dateOfBirth: patientData.dateOfBirth,
        gender: patientData.gender,
        serviceDate: patientData.serviceDate,
        visitNumber: patientData.visitNumber,
        attendingPhysicianId,
        familyPhysicianId,
      };
    } catch (error) {
      console.error("Error processing patient data:", error);
      throw error;
    }
  }

  /**
   * Save service data to the backend
   */
  async saveServiceData(serviceData: ServiceData): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/services`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error saving service data:", error);
      throw error;
    }
  }

  /**
   * Create service from camera data (includes patient creation)
   */
  async createServiceFromCameraData(serviceData: ServiceData): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/services/camera`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(serviceData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error creating service from camera data:", error);
      throw error;
    }
  }
}

export const physicianService = new PhysicianService();
export default physicianService;
