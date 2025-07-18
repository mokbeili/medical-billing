-- Add search vector column to referring_physicians table
ALTER TABLE "referring_physicians" ADD COLUMN "search_vector" tsvector;

-- Create full-text search indexes for referring physicians
CREATE INDEX IF NOT EXISTS "referring_physicians_code_fts_idx" ON "referring_physicians" USING gin(to_tsvector('english', code));
CREATE INDEX IF NOT EXISTS "referring_physicians_name_fts_idx" ON "referring_physicians" USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS "referring_physicians_specialty_fts_idx" ON "referring_physicians" USING gin(to_tsvector('english', specialty));
CREATE INDEX IF NOT EXISTS "referring_physicians_location_fts_idx" ON "referring_physicians" USING gin(to_tsvector('english', location));

-- Create combined full-text search index for all searchable fields
CREATE INDEX IF NOT EXISTS "referring_physicians_combined_fts_idx" ON "referring_physicians" USING gin(to_tsvector('english', code || ' ' || name || ' ' || specialty || ' ' || location));

-- Create a trigger function to automatically update the search vector
CREATE OR REPLACE FUNCTION update_referring_physicians_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', 
    COALESCE(NEW.code, '') || ' ' || 
    COALESCE(NEW.name, '') || ' ' || 
    COALESCE(NEW.specialty, '') || ' ' || 
    COALESCE(NEW.location, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector on insert/update
CREATE TRIGGER referring_physicians_search_vector_update
  BEFORE INSERT OR UPDATE ON "referring_physicians"
  FOR EACH ROW
  EXECUTE FUNCTION update_referring_physicians_search_vector();

-- Update existing records with search vector
UPDATE "referring_physicians" 
SET search_vector = to_tsvector('english', 
  COALESCE(code, '') || ' ' || 
  COALESCE(name, '') || ' ' || 
  COALESCE(specialty, '') || ' ' || 
  COALESCE(location, '')
); 