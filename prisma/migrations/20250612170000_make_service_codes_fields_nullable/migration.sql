-- Make service_start_time, service_end_time, and number_of_units nullable
ALTER TABLE "service_codes" 
  ALTER COLUMN "service_start_time" DROP NOT NULL,
  ALTER COLUMN "service_end_time" DROP NOT NULL,
  ALTER COLUMN "number_of_units" DROP NOT NULL;

-- Remove the code column
ALTER TABLE "service_codes" DROP COLUMN "code"; 