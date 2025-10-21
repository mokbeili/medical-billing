-- CreateTable
CREATE TABLE "locations_of_service" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "start_time" TIME,
    "end_time" TIME,
    "holiday_start_time" TIME,
    "holiday_end_time" TIME,
    "provider_id" INTEGER NOT NULL,
    "premium" FLOAT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_of_service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physician_locations_of_service" (
    "id" SERIAL NOT NULL,
    "physician_id" TEXT NOT NULL,
    "location_of_service_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physician_locations_of_service_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_of_service_provider_id_idx" ON "locations_of_service"("provider_id");

-- CreateIndex
CREATE INDEX "physician_locations_of_service_physician_id_idx" ON "physician_locations_of_service"("physician_id");

-- CreateIndex
CREATE INDEX "physician_locations_of_service_location_of_service_id_idx" ON "physician_locations_of_service"("location_of_service_id");

-- CreateIndex
CREATE UNIQUE INDEX "physician_locations_of_service_physician_id_location_of_service_id_key" ON "physician_locations_of_service"("physician_id", "location_of_service_id");

-- AddForeignKey
ALTER TABLE "locations_of_service" ADD CONSTRAINT "locations_of_service_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physician_locations_of_service" ADD CONSTRAINT "physician_locations_of_service_physician_id_fkey" FOREIGN KEY ("physician_id") REFERENCES "physicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physician_locations_of_service" ADD CONSTRAINT "physician_locations_of_service_location_of_service_id_fkey" FOREIGN KEY ("location_of_service_id") REFERENCES "locations_of_service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
