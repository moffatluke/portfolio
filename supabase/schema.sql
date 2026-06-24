-- Enable pgvector
create extension if not exists vector;

-- Knowledge base chunks
create table if not exists documents (
  id bigint generated always as identity primary key,
  content text not null,
  embedding vector(768),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Fast cosine similarity search
create index if not exists documents_embedding_hnsw
  on documents using hnsw (embedding vector_cosine_ops);

-- Per-IP rate limiting
create table if not exists rate_limits (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists rate_limits_ip_created
  on rate_limits (ip, created_at);

-- Contact form submissions (also emailed via Resend)
create table if not exists messages (
  id bigint generated always as identity primary key,
  name text not null,
  email text not null,
  message text not null,
  created_at timestamptz not null default now()
);

-- Lock tables down: only the service role (used by our serverless
-- function) may read/write. Service role bypasses RLS; with RLS on and
-- no policies, the anon/public key has no access.
alter table documents enable row level security;
alter table rate_limits enable row level security;
alter table messages enable row level security;

-- Retrieval function: returns the most similar chunks
create or replace function match_documents (
  query_embedding vector(768),
  match_count int default 5
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  order by documents.embedding <=> query_embedding
  limit match_count;
$$;
