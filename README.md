# LP Insight

Private Markdown knowledge assistant for Living Plus. The pilot searches a shared Turso library and returns exact source excerpts with filenames, headings, book pages, and line ranges.

## Current release

The Turso library contains 16,441 documents and 63,172 passages. Keyword retrieval, source filtering, and citation previews are implemented. Sources are unreviewed. AI-written answers, semantic search, individual staff accounts, source approval, and claim validation remain future milestones.

## Run locally

Install dependencies with npm install, then run npm run dev. The app runs on port 5174. Create an ignored .env file using .env.example. Required server-only settings: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, AUTH_SECRET, LP_ACCESS_PASSWORD. AUTH_SECRET must contain at least 32 characters. Never expose these settings through NEXT_PUBLIC variables.

## Pilot access

A shared pilot password issues a signed HttpOnly session cookie lasting eight hours. API routes reject unauthenticated requests. Login requires a same-origin POST; failed attempts are rate limited through Turso. This is a pilot access gate, not individual staff identity or departmental permissions.

The local pilot password is stored in the ignored .env file under LP_ACCESS_PASSWORD. Keep it private. Replace the shared gate with individual accounts before broader team rollout.

## Deploy to Vercel

Import this private repository, choose Next.js, and configure all four server settings as sensitive Production environment variables. vercel.json selects the Mumbai function region. The full corpus stays in Turso; Markdown sources and SQLite files are not deployed or committed.

Vercel's Hobby plan is restricted to personal, non-commercial use. Use an appropriate plan for an internal clinic application. No plan upgrades are performed by the deployment scripts.

## Local ingestion tools

scripts/corpus.cjs parses documents and preserves source metadata. scripts/ingest.cjs imports a source folder into a local versioned SQLite index. scripts/turso-migrate.cjs migrates the active index into Turso. These tools run locally and are excluded from Vercel deployment uploads. Private corpus files live outside this repository.

## Grounded AI answers
The authenticated POST /api/answer endpoint retrieves up to 12 deduplicated Markdown passages (36,000 characters), then uses the OpenAI Responses API with structured output and no tools. OPENAI_API_KEY is server-only; OPENAI_MODEL defaults to gpt-4.1-mini. Responses use store:false. Only the question and selected passages are sent; OpenAI's API data policies still apply.
Every sentence must cite a retrieved chunk with a verbatim quote. Server checks reject unknown chunks and altered quotes. A second model call checks sentence support and question relevance; failures withhold the answer. This reduces unsupported claims but does not guarantee correctness or replace review of source material. Retrieval currently uses full-text search, not vector embeddings, and can miss differently worded evidence.
Sentence clicks highlight the quote in the stored passage. Source links use the database's original URL; book references show the stored title and page where available. A global atomic limit permits 20 requests per ten minutes and 300 per rolling day. Existing pilot shared-password authentication remains in place; individual accounts are not implemented yet.

### Gemini provider
Set GEMINI_API_KEY on the server (never a NEXT_PUBLIC_ or VITE_ key). Gemini is selected automatically when this key is present; optional AI_PROVIDER=gemini makes the choice explicit. GEMINI_MODEL defaults to gemini-3.5-flash-lite. Both writing and checking use the same selected provider, with no automatic fallback or cross-provider data transfer. The Gemini request supplies no tools, Search grounding, or URL context. Google API data policies apply, including free-tier product-improvement use. Citation validation and authentication are unchanged.

### Retrieval and partial answers
Natural-language questions are rewritten into short search queries with spelling correction and synonyms, and up to three separate topics. These queries only find Markdown evidence; they are never evidence themselves. Prefix full-text searches, reciprocal-rank fusion, source diversity and adjacent chunks supply up to 48,000 characters of context. This is query-expanded full-text retrieval, not an embedding index. A bounded retry handles unusable quote output. Each sentence is verified independently; rejected claims are omitted while supported sentences remain visible. Missing topics and related passages are shown explicitly. Repeated citations within one sentence are grouped and all supporting quotes are highlighted. Model checks reduce errors but do not guarantee clinical correctness or exhaustive coverage.
