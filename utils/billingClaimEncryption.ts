import crypto from "crypto";

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
const PATIENT_ENCRYPTION_SALT =
  process.env.PATIENT_ENCRYPTION_SALT || "default-patient-salt";
const IV_LENGTH = 16;

// Physician-specific encryption key derivation with environment variable
function derivePhysicianKey(physicianId: string): Buffer {
  const salt = `billing_claim_${physicianId}_${PATIENT_ENCRYPTION_SALT}`;
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 10000, 32, "sha256");
}

// Create a deterministic encryption for searchable fields
function createSearchableHash(text: string, physicianId: string): string {
  const salt = `billing_claim_search_${physicianId}_${PATIENT_ENCRYPTION_SALT}`;
  return crypto
    .pbkdf2Sync(text.toLowerCase(), salt, 1000, 16, "sha256")
    .toString("hex");
}

// Encrypt billing claim data with physician-specific key
export function encryptBillingClaimData(
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

// Decrypt billing claim data with physician-specific key
export function decryptBillingClaimData(
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

// Create searchable hash for billing claim fields
export function createBillingClaimSearchHash(
  field: string,
  physicianId: string
): string {
  return createSearchableHash(field, physicianId);
}

// Interface for billing claim data
export interface BillingClaimData {
  batchClaimText?: string;
}

// Encrypt billing claim fields for storage
export function encryptBillingClaimFields(
  billingClaimData: BillingClaimData,
  physicianId: string
) {
  return {
    batchClaimText: encryptBillingClaimData(
      billingClaimData.batchClaimText,
      physicianId
    ),
  };
}

// Decrypt billing claim fields for display
export function decryptBillingClaimFields(
  encryptedBillingClaim: {
    batchClaimText: string | null;
  },
  physicianId: string
): BillingClaimData {
  return {
    batchClaimText:
      decryptBillingClaimData(
        encryptedBillingClaim.batchClaimText,
        physicianId
      ) || undefined,
  };
}
