delete from search_query_logs;

-- Add vector_embedding column to search_query_logs
ALTER TABLE search_query_logs 
ADD COLUMN vector_embedding vector(1536);

-- Add HNSW index for vector_embedding in search_query_logs
CREATE INDEX ON search_query_logs USING hnsw (vector_embedding vector_cosine_ops);