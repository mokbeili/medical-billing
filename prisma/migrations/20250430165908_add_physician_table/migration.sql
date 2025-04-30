-- CreateTable
CREATE TABLE "physicians" (
    "id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_initial" TEXT,
    "billing_number" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "jurisdiction_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "physicians_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "physicians" ADD CONSTRAINT "physicians_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "physicians" ADD CONSTRAINT "physicians_jurisdiction_id_fkey" FOREIGN KEY ("jurisdiction_id") REFERENCES "jurisdictions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
