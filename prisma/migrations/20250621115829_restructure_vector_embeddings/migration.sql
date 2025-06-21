CREATE TABLE search_query_embeddings (
    id SERIAL PRIMARY KEY,
    search_query_log_id INTEGER NOT NULL REFERENCES search_query_logs(id) ON DELETE CASCADE,
    vector_embeddings VECTOR(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_search_query_embeddings_log_id ON search_query_embeddings(search_query_log_id);
CREATE INDEX idx_search_query_embeddings_vector ON search_query_embeddings USING ivfflat (vector_embeddings vector_cosine_ops);

INSERT INTO search_query_embeddings (search_query_log_id, vector_embeddings)
SELECT id, embeddings::vector 
FROM search_query_logs
WHERE embeddings IS NOT NULL;

ALTER TABLE search_query_logs DROP COLUMN vector_embedding;

-- Create trigger function to update vector_embedding
CREATE OR REPLACE FUNCTION update_vector_embedding()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO search_query_embeddings (search_query_log_id, vector_embeddings)
    VALUES (NEW.id, trim(NEW.embeddings)::vector);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE billing_code_embeddings (
    id SERIAL PRIMARY KEY,
    billing_code_id INTEGER NOT NULL REFERENCES billing_codes(id) ON DELETE CASCADE,
    vector_embeddings VECTOR(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

insert into billing_code_embeddings (billing_code_id, vector_embeddings)
select id, openai_embedding::vector
from billing_codes
where openai_embedding is not null;

alter table billing_codes drop column vector_embedding;