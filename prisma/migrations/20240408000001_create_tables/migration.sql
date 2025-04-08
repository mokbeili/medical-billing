-- Create providers table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'providers') THEN
        CREATE TABLE "providers" (
            "id" SERIAL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "general_information" TEXT,
            "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Create jurisdictions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jurisdictions') THEN
        CREATE TABLE "jurisdictions" (
            "id" SERIAL PRIMARY KEY,
            "country" TEXT NOT NULL,
            "region" TEXT NOT NULL,
            "provider_id" INTEGER NOT NULL REFERENCES "providers"("id"),
            "general_information" TEXT,
            "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Create sections table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sections') THEN
        CREATE TABLE "sections" (
            "id" SERIAL PRIMARY KEY,
            "code" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "description" TEXT,
            "jurisdiction_id" INTEGER NOT NULL REFERENCES "jurisdictions"("id"),
            "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

-- Create billing_codes table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'billing_codes') THEN
        CREATE TABLE "billing_codes" (
            "id" SERIAL PRIMARY KEY,
            "code" TEXT NOT NULL,
            "title" TEXT NOT NULL,
            "description" TEXT,
            "section_id" INTEGER NOT NULL REFERENCES "sections"("id"),
            "openai_embedding" vector(1536),
            "created_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$; 