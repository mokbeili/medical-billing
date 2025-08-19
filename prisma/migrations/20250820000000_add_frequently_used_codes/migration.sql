-- CreateTable
CREATE TABLE "frequently_used_codes" (
    "id" SERIAL PRIMARY KEY,
    "physician_id" TEXT NOT NULL,
    "billing_code_id" INTEGER NOT NULL,
    "sort_metric" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

-- Relations
ALTER TABLE "frequently_used_codes"
ADD CONSTRAINT "frequently_used_codes_physician_id_fkey"
FOREIGN KEY ("physician_id") REFERENCES "physicians"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "frequently_used_codes"
ADD CONSTRAINT "frequently_used_codes_billing_code_id_fkey"
FOREIGN KEY ("billing_code_id") REFERENCES "billing_codes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- Indexes and constraints
CREATE UNIQUE INDEX "frequently_used_codes_physician_id_billing_code_id_key"
ON "frequently_used_codes" ("physician_id", "billing_code_id");

CREATE INDEX "idx_frequently_used_codes_physician_id"
ON "frequently_used_codes" ("physician_id");

CREATE INDEX "idx_frequently_used_codes_billing_code_id"
ON "frequently_used_codes" ("billing_code_id");

-- Trigger to keep updated_at in sync
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_frequently_used_codes_updated_at
BEFORE UPDATE ON "frequently_used_codes"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


