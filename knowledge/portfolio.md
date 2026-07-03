# This Portfolio Site (Ask My AI)
Luke's portfolio site at moffatluke.com is itself one of his projects. It is a
personal portfolio with a built-in "Ask my AI" assistant: visitors can ask
questions about Luke's background, skills, and projects and get answers written
by an AI that is grounded in a real knowledge base of facts about him. If the
answer isn't in that knowledge base, the assistant says so and points people to
the contact form instead of making something up.

## How the AI answers questions (RAG)
The assistant uses retrieval-augmented generation (RAG). When someone asks a
question, the site turns the question into a 768-number vector (an embedding),
searches a database of facts about Luke for the closest matches by meaning, and
feeds those top matches to a language model that writes the reply. Because every
answer is built from real retrieved facts, the bot doesn't hallucinate or invent
details it wasn't given.

## Tech stack
The front end is built with React and Vite and is deployed on Vercel. The AI runs
in serverless API functions on Vercel. Google's Gemini models handle both the
embeddings and the written answers, with a lighter fallback model if the main one
is busy. The knowledge base is stored in a Supabase Postgres database using the
pgvector extension, which lets the database search by vector similarity rather
than exact keywords.

## The vector database
Each fact about Luke is stored as a row with its text and a 768-dimensional
embedding in a Postgres table. An HNSW index with cosine distance makes the
similarity search fast, and a database function returns the closest facts to a
question. This is what a normal database can't do on its own: rank rows by how
close they are in meaning rather than by exact keyword matches.

## Knowledge base and ingestion
The knowledge the AI draws on lives in a set of markdown files covering Luke's
bio, education, experience, skills, projects, and Sandbox. An ingestion script
chunks those files, prefixes each chunk with its document title and section for
context, embeds them with Gemini, and stores them in the vector database. To
teach the AI something new, Luke edits the markdown and re-runs the ingestion.

## Other details
The site has a few extra touches: an animated neural-graph background rendered
with Three.js behind the chat, a contact form that emails Luke through Resend,
per-visitor rate limiting so the AI can't be abused, and continuous integration
that runs linting, tests, a production build, and an automated broken-link check
on every change. The database is locked down with row-level security so only the
server can read or write it.
