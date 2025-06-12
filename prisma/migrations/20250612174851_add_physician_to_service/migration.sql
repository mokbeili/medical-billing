/*
  Warnings:

  - Added the required column `physician_id` to the `services` table without a default value. This is not possible if the table is not empty.

*/
-- First add the column as nullable
ALTER TABLE "services" ADD COLUMN "physician_id" TEXT NOT NULL;

-- Add the foreign key constraint
ALTER TABLE "services" ADD CONSTRAINT "services_physician_id_fkey" FOREIGN KEY ("physician_id") REFERENCES "physicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add the index
CREATE INDEX "services_physician_id_idx" ON "services"("physician_id");
