import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { decrypt, encrypt } from "../utils/encryption";

const prisma = new PrismaClient();

interface CreateUserInput {
  email: string;
  password: string;
  address: string;
  roles: Role[];
}

export async function createUser({
  email,
  password,
  address,
  roles,
}: CreateUserInput) {
  const hashedPassword = await bcrypt.hash(password, 12);
  const encryptedAddress = encrypt(address);

  return prisma.user.create({
    data: {
      email,
      password_hash: hashedPassword,
      encrypted_address: encryptedAddress,
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
    address: user.encrypted_address ? decrypt(user.encrypted_address) : null,
  };
}

export async function getUserById(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return null;

  return {
    ...user,
    address: user.encrypted_address ? decrypt(user.encrypted_address) : null,
  };
}
