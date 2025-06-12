-- DropForeignKey
ALTER TABLE "service_codes" DROP CONSTRAINT "billing_claim_codes_claim_id_fkey";

-- DropForeignKey
ALTER TABLE "service_codes" DROP CONSTRAINT "service_codes_health_institution_id_fkey";

-- DropForeignKey
ALTER TABLE "service_codes" DROP CONSTRAINT "service_codes_icd_code_id_fkey";

-- DropForeignKey
ALTER TABLE "service_codes" DROP CONSTRAINT "service_codes_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "service_codes" DROP CONSTRAINT "service_codes_referring_physician_id_fkey";

-- First, rename the constraint
ALTER TABLE "service_codes" RENAME CONSTRAINT "billing_claim_codes_pkey" TO "service_codes_pkey";

-- Now drop columns one by one
ALTER TABLE "service_codes" DROP COLUMN "claim_id";
ALTER TABLE "service_codes" DROP COLUMN "claim_type";
ALTER TABLE "service_codes" DROP COLUMN "created_at";
ALTER TABLE "service_codes" DROP COLUMN "health_institution_id";
ALTER TABLE "service_codes" DROP COLUMN "icd_code_id";
ALTER TABLE "service_codes" DROP COLUMN "patient_id";
ALTER TABLE "service_codes" DROP COLUMN "referring_physician_id";
ALTER TABLE "service_codes" DROP COLUMN "service_date";
ALTER TABLE "service_codes" DROP COLUMN "service_location";
ALTER TABLE "service_codes" DROP COLUMN "special_circumstances";
ALTER TABLE "service_codes" DROP COLUMN "status";
ALTER TABLE "service_codes" DROP COLUMN "summary";
ALTER TABLE "service_codes" DROP COLUMN "updated_at";

-- Add new columns
ALTER TABLE "service_codes" ADD COLUMN "code" TEXT NOT NULL;
ALTER TABLE "service_codes" ADD COLUMN "service_id" INTEGER NOT NULL;

-- Set NOT NULL constraints
ALTER TABLE "service_codes" ALTER COLUMN "service_start_time" SET NOT NULL;
ALTER TABLE "service_codes" ALTER COLUMN "service_end_time" SET NOT NULL;
ALTER TABLE "service_codes" ALTER COLUMN "number_of_units" DROP DEFAULT;

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "claim_id" TEXT,
    "status" "ClaimStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "patient_id" TEXT,
    "icd_code_id" INTEGER,
    "referring_physician_id" INTEGER,
    "health_institution_id" INTEGER,
    "service_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT NOT NULL DEFAULT '',
    "service_location" TEXT NOT NULL,
    "special_circumstances" TEXT,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "services_claim_id_idx" ON "services"("claim_id");

-- CreateIndex
CREATE INDEX "services_patient_id_idx" ON "services"("patient_id");

-- CreateIndex
CREATE INDEX "services_icd_code_id_idx" ON "services"("icd_code_id");

-- CreateIndex
CREATE INDEX "services_referring_physician_id_idx" ON "services"("referring_physician_id");

-- CreateIndex
CREATE INDEX "services_health_institution_id_idx" ON "services"("health_institution_id");

-- CreateIndex
CREATE INDEX "service_codes_service_id_idx" ON "service_codes"("service_id");

-- CreateIndex
CREATE INDEX "service_codes_code_id_idx" ON "service_codes"("code_id");

-- RenameForeignKey
ALTER TABLE "service_codes" RENAME CONSTRAINT "billing_claim_codes_code_id_fkey" TO "service_codes_code_id_fkey";

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_claim_id_fkey" FOREIGN KEY ("claim_id") REFERENCES "billing_claims"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_icd_code_id_fkey" FOREIGN KEY ("icd_code_id") REFERENCES "icd_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_referring_physician_id_fkey" FOREIGN KEY ("referring_physician_id") REFERENCES "referring_physicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_health_institution_id_fkey" FOREIGN KEY ("health_institution_id") REFERENCES "health_institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_codes" ADD CONSTRAINT "service_codes_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
