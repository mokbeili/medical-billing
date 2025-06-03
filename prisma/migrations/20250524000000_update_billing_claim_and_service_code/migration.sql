-- Drop foreign key constraints from billing_claims if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'billing_claims_patient_id_fkey') THEN
        ALTER TABLE "billing_claims" DROP CONSTRAINT "billing_claims_patient_id_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'billing_claims_icd_code_id_fkey') THEN
        ALTER TABLE "billing_claims" DROP CONSTRAINT "billing_claims_icd_code_id_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'billing_claims_referring_physician_id_fkey') THEN
        ALTER TABLE "billing_claims" DROP CONSTRAINT "billing_claims_referring_physician_id_fkey";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'billing_claims_health_institution_id_fkey') THEN
        ALTER TABLE "billing_claims" DROP CONSTRAINT "billing_claims_health_institution_id_fkey";
    END IF;
END $$;

-- Drop columns from billing_claims if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_claims' AND column_name = 'patient_id') THEN
        ALTER TABLE "billing_claims" DROP COLUMN "patient_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_claims' AND column_name = 'icd_code_id') THEN
        ALTER TABLE "billing_claims" DROP COLUMN "icd_code_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_claims' AND column_name = 'referring_physician_id') THEN
        ALTER TABLE "billing_claims" DROP COLUMN "referring_physician_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_claims' AND column_name = 'health_institution_id') THEN
        ALTER TABLE "billing_claims" DROP COLUMN "health_institution_id";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_claims' AND column_name = 'summary') THEN
        ALTER TABLE "billing_claims" DROP COLUMN "summary";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_claims' AND column_name = 'service_date') THEN
        ALTER TABLE "billing_claims" DROP COLUMN "service_date";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_claims' AND column_name = 'openai_embedding') THEN
        ALTER TABLE "billing_claims" DROP COLUMN "openai_embedding";
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_claims' AND column_name = 'openai_suggestions') THEN
        ALTER TABLE "billing_claims" DROP COLUMN "openai_suggestions";
    END IF;
END $$;

-- Add new columns to service_codes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_codes' AND column_name = 'patient_id') THEN
        ALTER TABLE "service_codes" ADD COLUMN "patient_id" TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_codes' AND column_name = 'icd_code_id') THEN
        ALTER TABLE "service_codes" ADD COLUMN "icd_code_id" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_codes' AND column_name = 'referring_physician_id') THEN
        ALTER TABLE "service_codes" ADD COLUMN "referring_physician_id" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_codes' AND column_name = 'health_institution_id') THEN
        ALTER TABLE "service_codes" ADD COLUMN "health_institution_id" INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_codes' AND column_name = 'service_date') THEN
        ALTER TABLE "service_codes" ADD COLUMN "service_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_codes' AND column_name = 'service_start_time') THEN
        ALTER TABLE "service_codes" ADD COLUMN "service_start_time" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_codes' AND column_name = 'service_end_time') THEN
        ALTER TABLE "service_codes" ADD COLUMN "service_end_time" TIMESTAMP(3);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'service_codes' AND column_name = 'summary') THEN
        ALTER TABLE "service_codes" ADD COLUMN "summary" TEXT NOT NULL DEFAULT '';
    END IF;
END $$;

-- Make claim_id optional in service_codes
ALTER TABLE "service_codes" ALTER COLUMN "claim_id" DROP NOT NULL;

-- Add foreign key constraints to service_codes if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'service_codes_patient_id_fkey') THEN
        ALTER TABLE "service_codes" ADD CONSTRAINT "service_codes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'service_codes_icd_code_id_fkey') THEN
        ALTER TABLE "service_codes" ADD CONSTRAINT "service_codes_icd_code_id_fkey" FOREIGN KEY ("icd_code_id") REFERENCES "icd_codes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'service_codes_referring_physician_id_fkey') THEN
        ALTER TABLE "service_codes" ADD CONSTRAINT "service_codes_referring_physician_id_fkey" FOREIGN KEY ("referring_physician_id") REFERENCES "referring_physicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'service_codes_health_institution_id_fkey') THEN
        ALTER TABLE "service_codes" ADD CONSTRAINT "service_codes_health_institution_id_fkey" FOREIGN KEY ("health_institution_id") REFERENCES "health_institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$; 