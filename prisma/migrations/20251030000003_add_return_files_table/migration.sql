-- CreateTable
CREATE TABLE "return_files" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "physician_id" TEXT NOT NULL,
    "jurisdiction_id" INTEGER NOT NULL,
    "file_text" TEXT,
    "file_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "return_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "return_files_physician_id_idx" ON "return_files"("physician_id");

-- CreateIndex
CREATE INDEX "return_files_jurisdiction_id_idx" ON "return_files"("jurisdiction_id");

-- AddForeignKey
ALTER TABLE "return_files" ADD CONSTRAINT "return_files_physician_id_fkey" FOREIGN KEY ("physician_id") REFERENCES "physicians"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "return_files" ADD CONSTRAINT "return_files_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

