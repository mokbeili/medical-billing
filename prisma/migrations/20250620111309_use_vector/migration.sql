ALTER TABLE billing_codes 
ADD COLUMN vector_embedding vector(1536);

UPDATE billing_codes
SET vector_embedding  = trim(openai_embedding)::vector;