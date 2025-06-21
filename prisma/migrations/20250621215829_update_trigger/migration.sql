CREATE OR REPLACE TRIGGER trigger_update_vector_embedding
    AFTER INSERT OR UPDATE ON search_query_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_vector_embedding(); 