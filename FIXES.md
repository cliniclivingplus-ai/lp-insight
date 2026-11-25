# LP Insight – Fixes and Status

> Historical milestone notes below contain superseded status and test counts. See [PROJECT-RECORD.md](PROJECT-RECORD.md) for the consolidated current deployment, testing and semantic-indexing record.

This is a progress record, not a completion report. Items are marked by where they exist: **local code**, **deployed**, or **shared database**.

## Where each change lives

| Change | Local code | Deployed (Vercel) | Shared Turso database |
|---|---|---|---|
| Answer agent, safety rules, evidence checks | Yes | **No** | – |
| Per-session and team limits (`lp_answer_usage` table is created on first use) | Yes | **No** | Table created in the local-dev database, which is the same shared Turso database |
| Number/name guard (`lib/guard.ts`) | Yes | **No** | – |
| Source grouping and per-passage access (`public/app.js`) | Yes | **No** | – |
| Real video titles | – | – | **Yes** – 5,926 `lp_documents.title` rows updated |
| Importer keeps real video titles (`scripts/turso-migrate.cjs`, `scripts/video-titles.json`) | Yes | n/a (local tool) | Applies on next import |

Nothing has been committed or deployed. Local dev runs against the shared production Turso database.

## How answers work
1. The question is rewritten into search queries (spelling fixed, synonyms added, split into topics).
2. Matching passages are retrieved from the library by keyword search.
3. A model drafts sentences with supporting quotes, using only the retrieved passages.
4. A second model pass checks each sentence against its quote.
5. A deterministic guard checks that numbers and proper names appear in the cited source.
6. Sentences that pass the checks are shown with citations. **The checks reduce unsupported claims but can still miss errors**, so the interface tells users to verify against the cited passages.

## What was changed

| # | Problem | Change | Notes / limits |
|---|---------|--------|----------------|
| 1 | A personal dose from a video was returned to a patient-style question | Personal medical questions are detected (planner flag plus pattern match). Writer and checker are told not to state doses or start/stop instructions; a code filter drops dose-like sentences; a clinician note is added, including on refusals. | Detection is heuristic and can miss phrasings. Needs more test phrasings. |
| 2 | Refusals listed unrelated "related passages" | Refusals return no passages. | – |
| 3 | Videos shown as `Video transcript: <id>` | Titles and channels fetched from YouTube's public oEmbed lookup and written to Turso. Importer now applies them from `scripts/video-titles.json`. | Fetched once; new videos need fetching. Titles come from YouTube, not from the transcripts. |
| 4 | Same source listed repeatedly | Sources grouped per document; each passage in a grouped source has its own button (page or passage number). | Previously a grouped source opened only its first passage; fixed. |
| 5 | Vague attribution ("the transcript…") | Writer must name sources by title; checker rejects generic attribution. | Model-dependent; occasionally shortens long titles. |
| 6 | One shared limit for everyone | Per-session limit plus team 10-minute and daily limits, enforced in one atomic insert. | Sessions come from a shared password, so one person can still open several sessions. |
| 7 | Details could slip past the model checker | Guard in `lib/guard.ts`: whole-number matching (2 no longer matches 20), spelled-out numbers (including "twenty five"), and checks for capitalised names and acronyms such as LDL or HIIT, including sentence-initial names. 13 unit cases in `scripts/guard-test.mjs`. | Heuristic. It checks tokens, not meaning, so it does not prove a sentence is correct. It is stricter and now rejects more sentences, which lowers answer length. |
| 8 | Retry was skipped when final filters removed every sentence | The guard and dose filter now run inside the retry loop, so an emptied draft gets the retry. | One retry only. |
| 9 | "Not in library" wording overstated a failed search | Messages now say search did not find sufficient evidence, and that this does not prove the information is absent. | – |

## Tests
- Unit: `node --experimental-strip-types scripts/guard-test.mjs` – 13 cases pass.
- Behaviour: `scripts/regression-cases.json` holds 10 repeatable questions (answered, refusal, medication, injection). Run with `node --env-file=.env scripts/regression.mjs` while the dev server is up.
- Last manual run of 6 cases: fasting, diet comparison, sleep and medication behaved as intended (answers shorter after the stricter guard, medication returned no dose). The weather and prompt-injection cases hit the Gemini free-tier quota, so they were **not re-verified after the latest changes**. Earlier runs of those two refused correctly.
- These are individual runs, not evidence of consistent reliability. Run the regression set repeatedly and extend it, especially with medication phrasings.

## Known limits
- **Keyword retrieval.** Differently worded questions can fail to retrieve the right passages. This is a retrieval limit, not proof the library lacks the information.
- **Free Gemini tier.** It throttles under concurrency, and the retry doubles calls. Several users will hit quota errors. A paid key or lower call volume is needed for wider use.
- **Shared password.** No individual accounts or per-user history.
- **Unreviewed sources.** Library content has not been reviewed; the app says so.

## Semantic search – evaluation, not a commitment
- Library size: 63,172 passages, about 218 million characters, roughly 50 million tokens.
- A probe with this project's free Gemini key succeeded for one batch of 50 passages, then returned a quota error. That shows the free key cannot embed the library in reasonable time. It does not show that paid Gemini is the only option.
- Cost and time are estimates until checked against current provider pricing and limits; a paid Gemini run was estimated at a few to ten dollars, one to two hours.
- Alternatives to evaluate: a local open embedding model (free, slower, needs query-time hosting), embedding only the start of each passage, or embedding only books and videos.
- Turso supports vector search (confirmed by a test query). Storing vectors would be a write to the shared database.

## Suggested order of work
1. Run the regression set repeatedly after the free-tier quota resets, and extend medication and unsupported-request cases.
2. Review how often the stricter guard rejects correct sentences, and tune.
3. Re-run the importer path once to confirm real video titles survive.
4. Evaluate semantic search options with measured retrieval quality on real questions.
