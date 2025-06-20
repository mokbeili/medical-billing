
-- Create trigger function to update vector_embedding
CREATE OR REPLACE FUNCTION update_vector_embedding()
RETURNS TRIGGER AS $$
BEGIN
    NEW.vector_embedding = trim(NEW.embeddings)::vector;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function on INSERT or UPDATE
CREATE TRIGGER trigger_update_vector_embedding
    BEFORE INSERT OR UPDATE ON search_query_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_vector_embedding(); 