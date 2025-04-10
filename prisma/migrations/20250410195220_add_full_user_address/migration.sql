/*
  Warnings:

  - You are about to drop the column `encrypted_address` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "encrypted_address",
ADD COLUMN     "encrypted_city" TEXT,
ADD COLUMN     "encrypted_country" TEXT,
ADD COLUMN     "encrypted_postal_code" TEXT,
ADD COLUMN     "encrypted_state" TEXT,
ADD COLUMN     "encrypted_street" TEXT,
ADD COLUMN     "encrypted_unit" TEXT;
