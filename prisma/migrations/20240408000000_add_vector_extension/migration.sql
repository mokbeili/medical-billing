-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Add openai_embedding column to billing_codes if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'billing_codes' 
        AND column_name = 'openai_embedding'
    ) THEN
        ALTER TABLE "billing_codes" ADD COLUMN "openai_embedding" vector(1536);
    END IF;
END $$; 