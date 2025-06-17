-- Drop existing columns that are no longer needed
ALTER TABLE "billing_codes" DROP COLUMN IF EXISTS "code_class";
ALTER TABLE "billing_codes" DROP COLUMN IF EXISTS "anes";
ALTER TABLE "billing_codes" DROP COLUMN IF EXISTS "details";
ALTER TABLE "billing_codes" DROP COLUMN IF EXISTS "general_practice_cost";
ALTER TABLE "billing_codes" DROP COLUMN IF EXISTS "specialist_price";
ALTER TABLE "billing_codes" DROP COLUMN IF EXISTS "referred_price";
ALTER TABLE "billing_codes" DROP COLUMN IF EXISTS "non_referred_price";
ALTER TABLE "billing_codes" DROP COLUMN IF EXISTS "technical_component_price";
ALTER TABLE "billing_codes" DROP COLUMN IF EXISTS "interpretation_component_price";
ALTER TABLE "billing_codes" DROP COLUMN IF EXISTS "technical_and_interpretation_component_price";

-- Add new columns
ALTER TABLE "billing_codes" ADD COLUMN "low_fee" FLOAT4 NOT NULL DEFAULT 0;
ALTER TABLE "billing_codes" ADD COLUMN "high_fee" FLOAT4 NOT NULL DEFAULT 0;
ALTER TABLE "billing_codes" ADD COLUMN "service_class" VARCHAR(50);
ALTER TABLE "billing_codes" ADD COLUMN "add_on_indicator" VARCHAR(50);
ALTER TABLE "billing_codes" ADD COLUMN "multiple_unit_indicator" VARCHAR(50);
ALTER TABLE "billing_codes" ADD COLUMN "fee_determinant" VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE "billing_codes" ADD COLUMN "anaesthesia_indicator" VARCHAR(50);
ALTER TABLE "billing_codes" ADD COLUMN "submit_at_100_percent" VARCHAR(50);
ALTER TABLE "billing_codes" ADD COLUMN "referring_practitioner_required" VARCHAR(50);
ALTER TABLE "billing_codes" ADD COLUMN "start_time_required" VARCHAR(50);
ALTER TABLE "billing_codes" ADD COLUMN "stop_time_required" VARCHAR(50);
ALTER TABLE "billing_codes" ADD COLUMN "technical_fee" FLOAT4;

-- Update column constraints
ALTER TABLE "billing_codes" ALTER COLUMN "code" TYPE VARCHAR(50);
ALTER TABLE "billing_codes" ALTER COLUMN "description" TYPE VARCHAR(256);
ALTER TABLE "billing_codes" ALTER COLUMN "title" SET DEFAULT '';

-- Update billing_code_change_logs table to match
ALTER TABLE "billing_code_change_logs" DROP COLUMN IF EXISTS "code_class";
ALTER TABLE "billing_code_change_logs" DROP COLUMN IF EXISTS "anes";
ALTER TABLE "billing_code_change_logs" DROP COLUMN IF EXISTS "details";
ALTER TABLE "billing_code_change_logs" DROP COLUMN IF EXISTS "general_practice_cost";
ALTER TABLE "billing_code_change_logs" DROP COLUMN IF EXISTS "specialist_price";
ALTER TABLE "billing_code_change_logs" DROP COLUMN IF EXISTS "referred_price";
ALTER TABLE "billing_code_change_logs" DROP COLUMN IF EXISTS "non_referred_price";
ALTER TABLE "billing_code_change_logs" DROP COLUMN IF EXISTS "technical_component_price";
ALTER TABLE "billing_code_change_logs" DROP COLUMN IF EXISTS "interpretation_component_price";
ALTER TABLE "billing_code_change_logs" DROP COLUMN IF EXISTS "technical_and_interpretation_component_price";

ALTER TABLE "billing_code_change_logs" ADD COLUMN "low_fee" FLOAT4 NOT NULL DEFAULT 0;
ALTER TABLE "billing_code_change_logs" ADD COLUMN "high_fee" FLOAT4 NOT NULL DEFAULT 0;
ALTER TABLE "billing_code_change_logs" ADD COLUMN "service_class" VARCHAR(50);
ALTER TABLE "billing_code_change_logs" ADD COLUMN "add_on_indicator" VARCHAR(50);
ALTER TABLE "billing_code_change_logs" ADD COLUMN "multiple_unit_indicator" VARCHAR(50);
ALTER TABLE "billing_code_change_logs" ADD COLUMN "fee_determinant" VARCHAR(50) NOT NULL DEFAULT '';
ALTER TABLE "billing_code_change_logs" ADD COLUMN "anaesthesia_indicator" VARCHAR(50);
ALTER TABLE "billing_code_change_logs" ADD COLUMN "submit_at_100_percent" VARCHAR(50);
ALTER TABLE "billing_code_change_logs" ADD COLUMN "referring_practitioner_required" VARCHAR(50);
ALTER TABLE "billing_code_change_logs" ADD COLUMN "start_time_required" VARCHAR(50);
ALTER TABLE "billing_code_change_logs" ADD COLUMN "stop_time_required" VARCHAR(50);
ALTER TABLE "billing_code_change_logs" ADD COLUMN "technical_fee" FLOAT4;

ALTER TABLE "billing_code_change_logs" ALTER COLUMN "code" TYPE VARCHAR(50);
ALTER TABLE "billing_code_change_logs" ALTER COLUMN "description" TYPE VARCHAR(256);
ALTER TABLE "billing_code_change_logs" ALTER COLUMN "title" SET DEFAULT ''; 