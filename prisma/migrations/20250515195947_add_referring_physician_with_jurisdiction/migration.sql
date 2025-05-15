-- CreateTable
CREATE TABLE "referring_physicians" (
    "id" SERIAL NOT NULL,
    "jurisdiction_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "physician_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "referring_physicians_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "referring_physicians" ADD CONSTRAINT "referring_physicians_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referring_physicians" ADD CONSTRAINT "referring_physicians_physician_id_fkey" FOREIGN KEY ("physician_id") REFERENCES "physicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
