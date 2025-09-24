-- CreateTable
CREATE TABLE "billing_types" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "jurisdiction_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "physician_billing_types" (
    "id" SERIAL NOT NULL,
    "physician_id" TEXT NOT NULL,
    "billing_type_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "color_code" VARCHAR(7) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physician_billing_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "physician_billing_types_physician_id_idx" ON "physician_billing_types"("physician_id");

-- CreateIndex
CREATE INDEX "physician_billing_types_billing_type_id_idx" ON "physician_billing_types"("billing_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "physician_billing_types_physician_id_billing_type_id_key" ON "physician_billing_types"("physician_id", "billing_type_id");

-- AddForeignKey
ALTER TABLE "billing_types" ADD CONSTRAINT "billing_types_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physician_billing_types" ADD CONSTRAINT "physician_billing_types_physician_id_fkey" FOREIGN KEY ("physician_id") REFERENCES "physicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physician_billing_types" ADD CONSTRAINT "physician_billing_types_billing_type_id_fkey" FOREIGN KEY ("billing_type_id") REFERENCES "billing_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
