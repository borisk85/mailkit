-- RAG support bot: pgvector + knowledge base chunks

create extension if not exists vector;

create table if not exists knowledge_base_chunks (
  id          bigint generated always as identity primary key,
  source      text        not null, -- e.g. 'faq', 'terms', 'guarantee', 'how-it-works'
  chunk_index integer     not null,
  content     text        not null,
  embedding   vector(1536),
  created_at  timestamptz not null default now()
);

create index if not exists knowledge_base_chunks_embedding_idx
  on knowledge_base_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- similarity search function used by /api/support/chat
create or replace function match_chunks(
  query_embedding vector(1536),
  match_count     int default 5,
  min_similarity  float default 0.3
)
returns table (
  id      bigint,
  source  text,
  content text,
  similarity float
)
language sql stable as $$
  select
    id,
    source,
    content,
    1 - (embedding <=> query_embedding) as similarity
  from knowledge_base_chunks
  where embedding is not null
    and 1 - (embedding <=> query_embedding) >= min_similarity
  order by embedding <=> query_embedding
  limit match_count;
$$;
