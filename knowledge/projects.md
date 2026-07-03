# Projects

Luke has built and shipped a range of full-stack and AI projects. His main
projects are the Startup Idea Validator, the Cowork Student Toolkit, the Finance
Dashboard, the Obsidian Dev Tracker, the Note Taker, and this portfolio site
itself (the "Ask my AI" assistant). Each one is described below, including what it
does and what it was built with.

## Startup Idea Validator
An AI-powered web app that turns a rough startup idea into an investor-style
breakdown in seconds: problem validation, market assessment, competitors, key
risks, and a clear go/no-go verdict. Input validation with gibberish detection
keeps the model honest, and analyses persist to a browsable history. Built with
Django, Python, the NVIDIA LLM API, and SQLite. This is one of Luke's featured
projects.

## Cowork Student Toolkit
An MCP server that connects Claude directly to Canvas LMS. Students can ask what
assignments are due, what they're missing, or what their grades are, with no
app-hopping. Built with MCP, Node.js, and the Canvas API.

## Finance Dashboard
A browser-based CRM with a sales pipeline, transaction ledger, and live summary
dashboard, synced to Google Firestore. Built with Flask, Python, and Firestore.

## Obsidian Dev Tracker
A custom Obsidian plugin that renders GitHub contribution and Claude Code session
heatmaps in the sidebar. Built with TypeScript, the Obsidian API, and the GitHub
API.

## Note Taker
A polished command-line note app with arrow-key navigation, type-to-search, tag
filtering, and local JSON storage. Built with TypeScript, Node.js, and a CLI
interface.

## This Portfolio Site (Ask My AI)
Luke's portfolio site at moffatluke.com, including the "Ask my AI" assistant that
answers questions about him. It is a retrieval-augmented generation (RAG) app:
each question is embedded, matched against a knowledge base with a pgvector
similarity search, and answered by a language model using only the retrieved
facts. Built with React, Vite, and Vercel serverless functions, Google Gemini for
embeddings and answers, and Supabase Postgres with the pgvector extension as the
vector database.
