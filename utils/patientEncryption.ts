import crypto from "crypto";

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
const PATIENT_ENCRYPTION_SALT =
  process.env.PATIENT_ENCRYPTION_SALT || "default-patient-salt";
const IV_LENGTH = 16;

// Physician-specific encryption key derivation with environment variable
function derivePhysicianKey(physicianId: string): Buffer {
  const salt = `physician_${physicianId}_${PATIENT_ENCRYPTION_SALT}`;
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 10000, 32, "sha256");
}

// Create a deterministic encryption for searchable fields with environment variable
function createSearchableHash(text: string, physicianId: string): string {
  const salt = `search_${physicianId}_${PATIENT_ENCRYPTION_SALT}`;
  return crypto
    .pbkdf2Sync(text.toLowerCase(), salt, 1000, 16, "sha256")
    .toString("hex");
}

// Encrypt patient data with physician-specific key
export function encryptPatientData(
  data: string | null | undefined,
  physicianId: string
): string | null {
  if (!data) return null;

  const physicianKey = derivePhysicianKey(physicianId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", physicianKey, iv);
  let encrypted = cipher.update(data);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

// Decrypt patient data with physician-specific key
export function decryptPatientData(
  encryptedData: string | null,
  physicianId: string
): string | null {
  if (!encryptedData) return null;

  const physicianKey = derivePhysicianKey(physicianId);
  const textParts = encryptedData.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", physicianKey, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

// Create searchable hash for patient fields
export function createPatientSearchHash(
  field: string,
  physicianId: string
): string {
  return createSearchableHash(field, physicianId);
}

// Interface for patient data
export interface PatientData {
  firstName: string;
  lastName: string;
  middleInitial?: string;
  billingNumber: string;
  dateOfBirth: string;
}

// Encrypt all patient fields for storage
export function encryptPatientFields(
  patientData: PatientData,
  physicianId: string
) {
  return {
    firstName: encryptPatientData(patientData.firstName, physicianId),
    lastName: encryptPatientData(patientData.lastName, physicianId),
    middleInitial: encryptPatientData(patientData.middleInitial, physicianId),
    billingNumber: encryptPatientData(patientData.billingNumber, physicianId),
    dateOfBirth: encryptPatientData(patientData.dateOfBirth, physicianId),
  };
}

// Decrypt patient fields for display
export function decryptPatientFields(
  encryptedPatient: {
    firstName: string | null;
    lastName: string | null;
    middleInitial: string | null;
    billingNumber: string | null;
    dateOfBirth: string | null;
  },
  physicianId: string
): PatientData {
  return {
    firstName:
      decryptPatientData(encryptedPatient.firstName, physicianId) || "",
    lastName: decryptPatientData(encryptedPatient.lastName, physicianId) || "",
    middleInitial:
      decryptPatientData(encryptedPatient.middleInitial, physicianId) ||
      undefined,
    billingNumber:
      decryptPatientData(encryptedPatient.billingNumber, physicianId) || "",
    dateOfBirth:
      decryptPatientData(encryptedPatient.dateOfBirth, physicianId) || "",
  };
}

// Create search hash for a field (for search functionality)
export function createSearchHash(field: string, physicianId: string): string {
  return createSearchableHash(field, physicianId);
}
