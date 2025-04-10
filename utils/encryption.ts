import crypto from "crypto";

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "base64");
const IV_LENGTH = 16;

export function encrypt(text: string | null | undefined): string | null {
  if (!text) return null;

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string | null): string | null {
  if (!text) return null;

  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  unit?: string;
}

export function encryptAddress(address: Partial<Address>) {
  return {
    encrypted_street: encrypt(address.street),
    encrypted_city: encrypt(address.city),
    encrypted_state: encrypt(address.state),
    encrypted_postal_code: encrypt(address.postalCode),
    encrypted_country: encrypt(address.country),
    encrypted_unit: encrypt(address.unit),
  };
}

export function decryptAddress(encryptedAddress: {
  encrypted_street: string | null;
  encrypted_city: string | null;
  encrypted_state: string | null;
  encrypted_postal_code: string | null;
  encrypted_country: string | null;
  encrypted_unit: string | null;
}): Partial<Address> {
  return {
    street: decrypt(encryptedAddress.encrypted_street),
    city: decrypt(encryptedAddress.encrypted_city),
    state: decrypt(encryptedAddress.encrypted_state),
    postalCode: decrypt(encryptedAddress.encrypted_postal_code),
    country: decrypt(encryptedAddress.encrypted_country),
    unit: decrypt(encryptedAddress.encrypted_unit),
  };
}
