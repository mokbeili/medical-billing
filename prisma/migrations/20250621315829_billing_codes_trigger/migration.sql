-- Add unique constraint on billing_code_id to enable upsert operations
ALTER TABLE billing_code_embeddings ADD CONSTRAINT billing_code_embeddings_billing_code_id_unique UNIQUE (billing_code_id);

-- Create trigger function to update vector_embedding
CREATE OR REPLACE FUNCTION update_vector_embedding_billing_codes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO billing_code_embeddings (billing_code_id, vector_embeddings)
    VALUES (NEW.id, trim(NEW.openai_embedding)::vector)
    ON CONFLICT (billing_code_id) 
    DO UPDATE SET vector_embeddings = EXCLUDED.vector_embeddings;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on INSERT or UPDATE
CREATE TRIGGER trigger_update_vector_embedding_billing_codes
    AFTER INSERT OR UPDATE ON billing_codes
    FOR EACH ROW
    EXECUTE FUNCTION update_vector_embedding_billing_codes(); 