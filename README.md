# LP Insight

Current consolidated documentation: [PROJECT-RECORD.md](PROJECT-RECORD.md). Consult that record for deployment history, evidence, storage measurements and current limits.

Private Markdown knowledge assistant for Living Plus. The pilot searches a shared Turso library and generates source-grounded answers with inspectable supporting quotes, book pages and line ranges.

## Current release

The Turso library contains 16,441 documents and 63,172 passages. Deployed hybrid retrieval combines keyword matches with 285,409 indexed embedding windows. AI-written answers, evidence checks, plant-based-only nutrition recommendations and clickable inline source citations are active. Ambiguous requests ask for clarification; actionable answers must include supported next steps. Sources remain unreviewed. Individual accounts, private saved conversations and sidebar reopening are deployed. A source-approval workflow remains future work.

## Run locally

Install dependencies with npm install, then run npm run dev. The app runs on port 5174. Create an ignored .env file using .env.example. Required server-only settings: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, AUTH_SECRET, LP_ACCESS_PASSWORD. AUTH_SECRET must contain at least 32 characters. Never expose these settings through NEXT_PUBLIC variables.

## Pilot access

Approved users create a personal account with their name, email and a separate 12–200 character password; LP_ACCESS_PASSWORD is the invitation for registration. Email is a sign-in identifier, not a verified address. Automated email/password recovery is not implemented. Passwords use salted scrypt hashes. Signed HttpOnly, SameSite=Strict sessions last eight hours (Secure in production); sign-out revokes the account's existing sessions.

Each user's saved chats are owner-scoped on the server. New conversation preserves old chats in the sidebar; users can reopen, rename or delete their own conversations. Saved-turn data has a 128 MB global budget; transactional checks preserve the 4 GB database ceiling and 64 MB margin. New writes stop if limits are reached; existing chats remain readable/deletable. See the account/history implementation and live test report in D:/lp-insight/outputs/LP-Insight-accounts-and-saved-chats.md. Chats discarded before persistence was added cannot be recovered.

## Deploy to Vercel

Import this private repository, choose Next.js, and configure all four server settings as sensitive Production environment variables. vercel.json selects the Mumbai function region. The full corpus stays in Turso; Markdown sources and SQLite files are not deployed or committed.

Vercel's Hobby plan is restricted to personal, non-commercial use. Use an appropriate plan for an internal clinic application. No plan upgrades are performed by the deployment scripts.

## Local ingestion tools

scripts/corpus.cjs parses documents and preserves source metadata. scripts/ingest.cjs imports a source folder into a local versioned SQLite index. scripts/turso-migrate.cjs migrates the active index into Turso. These tools run locally and are excluded from Vercel deployment uploads. Private corpus files live outside this repository.

## Grounded AI answers

Authenticated POST /api/answer uses the configured Gemini or OpenAI provider to plan searches, draft from bounded library passages (up to 48,000 characters) and independently check the answer. Credentials stay server-side. Selected question text and passages are sent to the configured answer provider; the embedding model runs locally/in the browser. No web research is used.

Every factual sentence carries source IDs and supporting quotes. Unknown or altered quotes, unsupported details and policy failures are rejected. Case/whitespace differences are reconciled to the exact stored substring. Inline document numbers match Sources at the end; clicking a number highlights the supporting quote. These checks reduce errors but do not establish clinical correctness.

### Clarification and useful answers

An ambiguous request such as “what to do when keto diet is not working to a patient” returns status=clarification, with a question, outcome choices, a context object containing the original question, and empty sentences/citations. The client sends the reply as question and the supplied context as clarification. Server-side validation accepts at most 2,000 characters for a reply and 4,500 characters for clarification context (the original question plus earlier clarification), recombines them as untrusted question text, and re-plans retrieval. No model plan, safety flag or access privilege is trusted from the client. The UI embeds the combined intent and clears pending context after an answer, refusal, new chat or explicit new question.

Simple unresolved intervention/outcome ambiguity is detected before retrieval or AI calls; the planner can identify other missing-topic/outcome cases. Free-text replies are supported. A patient blood-sugar question without a specified condition or general-information scope gets a second clarification; the app preserves the original question and outcome instead of assuming a diabetes type. Clinical answer wording cannot identify a root cause for an individual from this sparse context. An unrelated new question can leave clarification mode explicitly.

Exact-quote, detail, plant-based and medical filters run before the evidence checker. That checker grades both sentence support and whether its supported subset actually answers the original request. Actionable requests additionally require a direct Answer and a Practical next steps section after all checks. An inadequate fragment gets one retry; if still inadequate, the app gives an evidence-gap message with no misleading answer fragment or unrelated source list.

Per-session and team limits are atomic: defaults are 15 questions/session/10 minutes, 60 total/10 minutes and 1,500 total/day. All authenticated question attempts, including clarification requests, use these limits. A bounded transient-provider retry shares the existing timeout; persistent provider failures return a clear error without showing an unverified answer.

### Gemini provider
Set GEMINI_API_KEY on the server (never a NEXT_PUBLIC_ or VITE_ key). Gemini is selected automatically when this key is present; optional AI_PROVIDER=gemini makes the choice explicit. GEMINI_MODEL defaults to gemini-3.5-flash-lite. Both writing and checking use the same selected provider, with no automatic fallback or cross-provider data transfer. The Gemini request supplies no tools, Search grounding, or URL context. Google API data policies apply, including free-tier product-improvement use. Citation validation and authentication are unchanged.

### Retrieval and partial answers
Natural-language questions are rewritten into short search queries with spelling correction and synonyms, and up to three separate topics. These queries only find Markdown evidence; they are never evidence themselves. Prefix full-text searches, reciprocal-rank fusion, source diversity and adjacent chunks supply up to 48,000 characters of context. This is query-expanded full-text retrieval, not an embedding index. A bounded retry handles unusable quote output. Each sentence is verified independently; rejected claims are omitted while supported sentences remain visible. Missing topics and related passages are shown explicitly. Repeated citations within one sentence are grouped and all supporting quotes are highlighted. Model checks reduce errors but do not guarantee clinical correctness or exhaustive coverage.
Source discovery questions (which books/videos, where a topic is mentioned) request separate document summaries using stored titles and source metadata. The evidence checker checks source attribution as well as claim support. Results are selected retrieved sources, not an exhaustive inventory.
Comparison searches retain low-carb as an adjacent phrase (including low-carbohydrate), and request both compared subjects. One shared rewrite budget handles unusable quotes or complete checker rejection; the second draft must pass the same evidence checks. The answer route allows up to 300 seconds for this bounded sequence.

### Evidence and import regression checks
Run `node --experimental-strip-types scripts/guard-test.mjs`, `node tests/answer-retry.cjs`, `node tests/citations.cjs`, `node tests/video-titles.cjs`, and `node tests/grounded.cjs`. These checks use mocked model responses and temporary databases; they do not call AI providers or modify Turso.

The detail guard compares complete numeric values (including compound number words, signs and decimals) and case-normalized name tokens. It remains a heuristic alongside model verification. Final filters execute before the retry decision. Each document has one inline citation button; its passage selector preserves quote highlights, and the Sources list exposes each stored passage.

The importer uses `scripts/video-titles.json` and retains an existing real video title when the Markdown heading is an ID placeholder. Cached metadata is applied even when the source content is unchanged. Migration also preserves real titles already in Turso across document versions when the incoming title is a placeholder, even without the cache. A malformed cache stops the import rather than being silently ignored.

### Live regression audit
`node scripts/regression-audit.cjs` runs the ten cases with live Turso retrieval and the configured AI provider, recording writer/checker outputs and guard decisions under ignored `.sites-runtime/`. It substitutes only authentication and usage accounting in the harness, so it does not write production usage records. This is a pipeline test, not a browser or authentication test. Set `LP_AI_SPACING_MS=7000` to pace calls, `LP_AUDIT_CASES` to a comma-separated subset, and `LP_AUDIT_FILE` to a local output path. Running this sends selected library passages to the configured provider. Quota blocks, service errors and behavioural failures are recorded separately.

The detail guard receives the same title, heading, collection and page metadata as the writer; source IDs are excluded from numeric evidence. Ordinary sentence-opening Medical is not treated as a proper name. A narrow conflict check withholds the combined keto low-carbohydrate/low-fat restriction claim when the cited text explicitly contradicts it. Personal-medication filtering also withholds as-needed schedules and medication-change instructions. These checks still do not establish clinical correctness.

Clarification regression checks: `node tests/clarification.cjs`, `node tests/citations.cjs`, `node tests/quote-normalization.cjs`, and `node --experimental-strip-types tests/plant-based.mjs` use synthetic fixtures and do not call AI providers. The explicitly authorized live test is `node scripts/clarification-http-check.mjs`; it sends selected passages for the Weight loss and Blood sugar follow-ups to the configured provider. `--clarification-only` checks the original ambiguity response without an AI call.


### Optional backup Gemini credential

Set `GEMINI_API_KEY_BACKUP` as a server-only secret alongside `GEMINI_API_KEY`. Never add it to public JavaScript, a `NEXT_PUBLIC_` setting or source control. In Vercel, add it under this project's Settings → Environment Variables for Production, then redeploy to load the value. Locally use ignored `.env.local` and restart the server.

On an explicit Gemini 429 quota/rate-limit response, the current structured request may try the distinct backup key once, using the identical model, instructions, evidence payload and schema. All writer/checker/guard/citation requirements remain active. Duplicate key values are deduplicated. Invalid credentials, missing models and other errors do not silently rotate keys. Both exhausted keys return AI_QUOTA without an infinite retry loop. Provider retries and key failover share one 45-second deadline per structured request. Warm-process cooldowns honor returned retry delays, use at least 60 seconds by default and at least 15 minutes for a reported daily quota; they are not durable or shared across serverless instances. This does not increase Google's project quota: keys in the same project share limits. Availability of quota for another project must be confirmed in AI Studio.

Credential logic is covered by `node tests/gemini-backup.cjs` and `node tests/provider-retry.cjs` using synthetic keys and mocked network responses. No real backup key has been entered or live-tested yet.
