-- Move special_circumstances from services to service_codes
ALTER TABLE "service_codes" ADD COLUMN "special_circumstances" TEXT;
UPDATE "service_codes" sc
SET "special_circumstances" = s."special_circumstances"
FROM "services" s
WHERE sc."service_id" = s."id";
ALTER TABLE "services" DROP COLUMN "special_circumstances"; 