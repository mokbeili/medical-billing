import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { decrypt, encrypt } from "../utils/encryption";

const prisma = new PrismaClient();

interface Address {
  street: string;
  unit?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface CreateUserInput {
  email: string;
  password: string;
  address: Address;
  roles: Role[];
}

export async function createUser({
  email,
  password,
  address,
  roles,
}: CreateUserInput) {
  const hashedPassword = await bcrypt.hash(password, 12);

  return prisma.user.create({
    data: {
      email,
      password_hash: hashedPassword,
      encrypted_street: encrypt(address.street),
      encrypted_unit: address.unit ? encrypt(address.unit) : null,
      encrypted_city: encrypt(address.city),
      encrypted_state: encrypt(address.state),
      encrypted_postal_code: encrypt(address.postalCode),
      encrypted_country: encrypt(address.country),
      roles,
    },
  });
}

export async function validateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return null;

  return {
    ...user,
    address: {
      street: user.encrypted_street ? decrypt(user.encrypted_street) : "",
      unit: user.encrypted_unit ? decrypt(user.encrypted_unit) : "",
      city: user.encrypted_city ? decrypt(user.encrypted_city) : "",
      state: user.encrypted_state ? decrypt(user.encrypted_state) : "",
      postalCode: user.encrypted_postal_code
        ? decrypt(user.encrypted_postal_code)
        : "",
      country: user.encrypted_country ? decrypt(user.encrypted_country) : "",
    },
  };
}

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;

  return {
    ...user,
    address: {
      street: user.encrypted_street ? decrypt(user.encrypted_street) : "",
      unit: user.encrypted_unit ? decrypt(user.encrypted_unit) : "",
      city: user.encrypted_city ? decrypt(user.encrypted_city) : "",
      state: user.encrypted_state ? decrypt(user.encrypted_state) : "",
      postalCode: user.encrypted_postal_code
        ? decrypt(user.encrypted_postal_code)
        : "",
      country: user.encrypted_country ? decrypt(user.encrypted_country) : "",
    },
  };
}
