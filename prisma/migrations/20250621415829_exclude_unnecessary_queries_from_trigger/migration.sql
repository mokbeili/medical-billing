CREATE OR REPLACE FUNCTION update_vector_embedding()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.previous_log_id IS NULL AND NEW.embeddings != '[]' THEN
        INSERT INTO search_query_embeddings (search_query_log_id, vector_embeddings)
        VALUES (NEW.id, trim(NEW.embeddings)::vector);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;