-- AlterTable
ALTER TABLE "service_codes" ADD COLUMN "service_location" TEXT NOT NULL;
ALTER TABLE "service_codes" ADD COLUMN "location_of_service" TEXT NOT NULL;
ALTER TABLE "services" DROP COLUMN "service_location";


