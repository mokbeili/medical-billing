-- Add comprehensive search indexes for ICD codes
-- Index for description field for faster text search
CREATE INDEX IF NOT EXISTS "icd_codes_description_idx" ON "icd_codes"("description");

-- Index for version field for filtering
CREATE INDEX IF NOT EXISTS "icd_codes_version_idx" ON "icd_codes"("version");

-- Composite index for code and version for efficient filtering
CREATE INDEX IF NOT EXISTS "icd_codes_code_version_idx" ON "icd_codes"("code", "version");

-- Full-text search index for description field
CREATE INDEX IF NOT EXISTS "icd_codes_description_fts_idx" ON "icd_codes" USING gin(to_tsvector('english', description));

-- Full-text search index for code field
CREATE INDEX IF NOT EXISTS "icd_codes_code_fts_idx" ON "icd_codes" USING gin(to_tsvector('english', code));

-- Combined full-text search index for both code and description
CREATE INDEX IF NOT EXISTS "icd_codes_combined_fts_idx" ON "icd_codes" USING gin(to_tsvector('english', code || ' ' || description)); 