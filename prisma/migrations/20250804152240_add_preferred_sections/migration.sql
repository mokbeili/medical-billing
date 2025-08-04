-- CreateTable
CREATE TABLE "preferred_sections" (
    "id" SERIAL NOT NULL,
    "physician_id" TEXT NOT NULL,
    "section_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preferred_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preferred_sections_physician_id_idx" ON "preferred_sections"("physician_id");

-- CreateIndex
CREATE INDEX "preferred_sections_section_id_idx" ON "preferred_sections"("section_id");

-- CreateIndex
CREATE UNIQUE INDEX "preferred_sections_physician_id_section_id_key" ON "preferred_sections"("physician_id", "section_id");

-- AddForeignKey
ALTER TABLE "preferred_sections" ADD CONSTRAINT "preferred_sections_physician_id_fkey" FOREIGN KEY ("physician_id") REFERENCES "physicians"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferred_sections" ADD CONSTRAINT "preferred_sections_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
