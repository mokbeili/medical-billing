-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'PHYSICIAN', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "encrypted_address" TEXT,
    "roles" "Role"[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_email_key" UNIQUE ("email")
);