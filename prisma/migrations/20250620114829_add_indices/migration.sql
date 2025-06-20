-- Add indices for billing_codes table
CREATE INDEX ON billing_codes (code);
CREATE INDEX ON billing_codes (title);

-- Add HNSW index for vector_embedding in billing_codes
CREATE INDEX ON billing_codes USING hnsw (vector_embedding vector_cosine_ops);