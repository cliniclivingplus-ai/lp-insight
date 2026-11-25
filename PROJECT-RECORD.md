# LP Insight — consolidated project documentation

Updated 18 October 2026. This consolidated record distinguishes completed production work from older historical milestones. Hybrid search and the clearer answer style are now deployed; the full index/upload is complete.

## 1. Current status

| Area | Status |
|---|---|
| Hosted application | https://lp-insight-ten.vercel.app/ |
| Grounded answers, evidence checks, guard/retry/citation fixes | Deployed and production-tested in the earlier deployment record |
| Last recorded production deployment | `dpl_2LwumHDKBJn6Mjy5uRNaAYsE6BPc`, 18 October 2026 |
| Production deployment URL | https://lp-insight-6o0cv703s-cliniclivingplus.vercel.app |
| Individual accounts and private chat history | Deployed; two-user live sign-in/save/reopen/isolation tests passed 17 October 2026 |
| Real video titles | 5,926 titles updated in the shared Turso library |
| Importer title preservation | Implemented and tested locally; unchanged imports preserve real titles |
| Free hybrid retrieval | Enabled; current clarification, next-step and source-access checks pass; older regression snapshots are retained |
| Full-library embeddings | Complete: 285,409 windows |
| Semantic upload | Complete and independently verified 16 October 2026; 285,409 vectors, ready=1, 3.55 GB total |
| Semantic activation/deployment | Deployed and enabled 16 October 2026; ready index retained |

Indexing and upload are complete. The hosted app no longer needs this PC running for library searches; the question embedding model loads in each user’s browser. Historical job progress and checkpoints remain under `.sites-runtime/semantic`.

## 2. Purpose and library

LP Insight is a private Living Plus library assistant. It searches imported books, websites and video transcripts, then answers using selected passages with inspectable citations. It does not browse the internet to fill gaps in an answer. Source material remains unreviewed; an answer passing evidence checks is not a guarantee of correctness or clinical suitability.

| Collection | Documents | Parent passages |
|---|---:|---:|
| Books | 23 | 7,880 |
| NutritionFacts | 5,664 | 11,178 |
| PCRM | 4,828 | 6,509 |
| Videos | 5,926 | 37,605 |
| Total | 16,441 | 63,172 |

The text contains about 218.5 million characters. A separate tokenizer audit counted 52,147,001 cl100k tokens; this is not BGE's tokenizer count. Original Markdown is retained. Inspection found 357 duplicate-body groups, with 371 additional duplicate files; originals were not automatically deleted. Missing video timestamps are not invented.

Main working repository: `D:/lp-insight/work/lp-insight`. Local corpus index: `D:/lp-insight/work/lp-data/library.sqlite`. Original source folder: `D:/Nutritionalist/nutritionfacts/nutrition_scraper/scarping/books_video_website_scraped`.

## 3. Answer pipeline

1. A shared pilot password creates a signed HttpOnly session. Authenticated API routes enforce access; answer requests also enforce same-origin checks and usage limits.
2. The configured AI provider rewrites the question into short search queries, correcting spelling and adding synonyms. Up to three independent topics are supported. Rewrites are search aids, not evidence.
3. Current production retrieves keyword matches, balances source diversity and topics, and adds adjacent passages within a 48,000-character context budget.
4. The model drafts source-based sentences with exact supporting quotes and source IDs. No outside factual knowledge is permitted.
5. A separate checker pass assesses each sentence's evidence, relevance, population, qualifications, causality and source attribution.
6. Code validates source IDs and contiguous quotes, then applies number/name and personal-medical filters. One retry is available when the draft has no surviving sentences, including when final filters empty it.
7. Surviving sentences appear with clickable document citations. The interface discloses partial answers and tells readers to verify against the original passages.

Gemini is selected when its key is configured; OpenAI is an optional explicitly configured provider. There is no automatic provider fallback. For answer generation, the selected question/passages go to that configured provider. For the new embeddings, the library stays local during model inference: no hosted Hugging Face inference or paid embedding API is used.

## 4. Reliability and usability fixes

| Problem | Implemented change |
|---|---|
| Number `2` accepted against `20` | Complete numeric matching rather than substring matching |
| Digits rejected against spelled-out numbers | Normalization for number words, compound values, signs and decimals |
| Acronyms and initial names missed | Checks include acronyms and sentence-initial names; guard context includes supplied title, heading, collection and page |
| Guard falsely rejected NutritionFacts or ordinary initial Medical | Metadata context and focused name-rule fixes, backed by captured/live reruns |
| Source IDs accidentally usable as numeric evidence | Source IDs excluded from guard evidence |
| Final filters removed every sentence without a retry | Guard and medical filters moved inside the bounded retry loop |
| Personal medication doses/schedules appeared | Planner/pattern detection, writer/checker safety instructions, deterministic dose/change/as-needed filters, clinician note including refusals |
| Diet arms or contradictory transcript details were merged | Stronger source/arm attribution and a narrow contradictory ketogenic restriction check |
| Generic “the transcript” attribution | Writer/checker require supplied source titles; names must not come from memory |
| Duplicate source entries / inaccessible later passages | One inline citation per document; passage selector, individual passage buttons and quote highlighting |
| Unrelated sources shown on refusal | Refusals return no unrelated passages |
| “Not in library” overstated failed retrieval | Wording distinguishes insufficient retrieved evidence from actual absence |
| “Only verified sentences” overstated reliability | Interface states that evidence checks can still miss errors |
| Shared usage limit locked out the whole team | Atomic per-session and team limits |
| Video IDs shown as titles / reimport overwrote titles | Public title/channel metadata cache plus local and Turso migration preservation rules |

The guard remains heuristic: matching names/numbers does not prove the relationship between them. The narrow contradiction check is not a general contradiction detector. Personal-medical detection can miss unfamiliar phrasing.

## 5. Tests and production evidence

The earlier authenticated production run exercised real login, usage accounting, Turso and Gemini. All ten cases ultimately passed across the initial run and targeted reruns; it was not one uninterrupted error-free run. Provider/quota errors occurred, and a comparison issue was fixed and redeployed.

| Regression case | Final recorded production behavior |
|---|---|
| Intermittent fasting | Answered |
| Low-carb versus Mediterranean | Answered with source-specific comparison |
| Sleep and blood sugar | Answered |
| Misspelled gut health/inflammation | Answered |
| Cortisol source discovery | Answered with real titles |
| Exact metformin dose for me | Withheld; no dose |
| Stop insulin for fasting | General clinician guidance; no treatment-change instruction |
| Mumbai weather | Refused without unrelated passages |
| Ignore rules / capital of France | Refused |
| Cricket world cup | Refused |

The combined cortisol/vitamin D browser check returned a source-by-source answer. A Circadian Code citation opened page 200 with its supporting quote highlighted. Original source/video links were present.

Latest local checks for the semantic implementation passed: 30 guard cases, answer retry/filter behavior, citation access, title import preservation, TypeScript and production build. New tests cover vector dimension/norm/revision checks, authentication and readiness, missing-index/network fallback, fusion/deduplication, complete overlapping windows, preflight budget checks, transaction rollback after excessive growth, and vector invalidation on changed/deleted sources while unchanged imports preserve vectors.

The actual new browser worker produced a normalized 384-dimensional vector. A simulated unavailable Worker selected keyword fallback. These checks do not establish full-library retrieval quality or clinical correctness. Final cloud latency, final size and live hybrid answers remain untested until the job finishes and the feature is deployed.

## 6. Why free local embeddings were selected

The free Gemini embedding probe returned 768-dimensional embeddings for 50 passages, then hit quota on the next batch. This showed a throughput problem for that key. Paid Gemini, partial indexing, local models and retaining keywords were evaluated. The user chose the free local route.

The pilot used `Xenova/bge-small-en-v1.5`, q8 ONNX, 384 dimensions, normalized CLS pooling, Transformers.js 4.3.1. Query prefix: `Represent this sentence for searching relevant passages: `. Model/tokenizer files are hash-checked against the tested assets. Node/browser use the same model and pooling.

Pilot: 343 parent passages, 1,152 windows and 14 questions across seven topics. The sample included 320 deterministic random passages and 23 known-positive/topic-enriched passages. Known-positive labels were incomplete.

| Retrieval method | Known-positive mean coverage in top 5 |
|---|---:|
| Raw keyword | 84.6% |
| Expanded keyword | 91.7% |
| Semantic alone | 74.9% |
| Hybrid | 94.8% |

The modest hybrid gain justified retaining keywords. Semantic-only search sometimes ranked references or newsletter material above useful evidence. These are small-sample diagnostic metrics, not full-library accuracy.

Browser pilot on this Windows laptop: warm question embeddings about 89 ms median, 106 ms empirical p95; local initialization 2.43–5.41 seconds. The actual application-worker smoke test took 11.42 seconds including initialization while indexing was running. These are different measurements. First use requires roughly 62 MB of model/runtime assets; browser caching helps later visits. Mobile and real internet-download speeds were not measured.

## 7. Full index and storage safety

The user-provided dashboard confirms Turso Free with one database, 618.76 MB used of 5 GB. Read-only SQLite page measurement: 618,762,240 bytes. No plan upgrade or paid embedding fallback was configured.

Long parent passages must be split because the model input limit is 512 tokens. Full planning produced **285,409 windows**, normally 180 words with 30-word overlap, each checked with the actual tokenizer; maximum 500 tokens. Parent IDs, document versions, content hashes and character offsets are retained. Original passages supply answer evidence and citations.

The local pilot tested a real libSQL vector index. Sixteen neighbours with float8 neighbour compression used roughly 10.3 KB per vector including table/index pages; default settings were much larger. Full planning conservatively budgets 10,400 bytes/vector, adds 5% growth and another 64 MB buffer.

| Budget | Bytes / decimal GB |
|---|---:|
| Existing Turso database | 618,762,240 / 0.619 GB |
| Projected total including safety allowances | 3,799,428,520 / 3.80 GB |
| Upload ceiling | 4,000,000,000 / 4 GB |
| Reserve against the 5 GB allowance | At least 1 GB |

Safety sequence:

1. Count the full corpus and reject a projected total above the ceiling before embedding.
2. Commit embeddings locally in resumable batches; check local disk reserve.
3. Construct the compressed index locally and measure actual allocated pages. Stop if it will not fit with allowances.
4. Upload only after this succeeds. Each write transaction checks storage before insertion, verifies original content hashes/versions, inserts a small batch, checks actual growth and projected remaining growth, and rolls back if unsafe.
5. Leave cloud readiness false until the expected count and final storage checks succeed.

The 4 GB ceiling is enforced by this job, not an organization-wide setting. It assumes the supplied account snapshot remains applicable; external imports or new databases can consume allowance. Future imports need fresh budget checks. A later account-wide dashboard check remains useful because the configured database token cannot inspect other databases.

Initial timing estimates were revised from 1–3 hours to about 23 hours based on the pilot. The current job's ETA is recalculated from actual throughput; it excludes index construction and upload. No completion time is guaranteed.

## 8. Running job, monitoring and completion

The embedding job is already running. `scripts/semantic-finish.mjs` is also running in the background (recorded PID 19200 at this snapshot). It waits for `local-ready`, executes the guarded upload, and stops. It never deploys or enables the feature. Storage/quota/network failures leave a stopped state for review rather than switching to a paid service.

Primary files under `.sites-runtime/semantic/`:

- `status.json`: current stage, counts, ETA, storage estimates, completion/error information.
- `index.db`: local embeddings and compressed index.
- `plan.json`: full-corpus planning result and source fingerprint.
- `finish-job.json`: continuation-process state.
- `finish.log` and `finish-errors.log`: upload/continuation output and errors.

The active thread follow-up is LP Insight indexing and upload (automation ID: lp-insight-indexing-and-upload). It checks every 30 minutes, remains quiet during normal progress, and notifies on complete indexing/upload, storage stop, other error or a dead/stalled process. On completion it performs a read-only Turso count/storage check and updates this document and its output copy. It does not deploy, enable the feature, change the budget, upgrade the plan or restart a stopped job. After reporting a terminal outcome it pauses to avoid repeated notifications. Scheduled checks require the Codex app/host to be available; notification timing can therefore be later than the job event.

After upload completes: perform a read-only storage/count check, inspect full-library retrieval on the main questions, then enable and deploy hybrid search and exercise authenticated browser answers/citations. Those deployment steps are not part of the running background process and are not complete yet.

## 9. Operation and settings

Run local app: `npm install`, `npm run dev` (port 5174). Build: `npm run build`; browser assets are prepared by its prebuild step. Type check: `npm run typecheck`.

Required private server settings: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, `LP_ACCESS_PASSWORD`. Optional AI settings: `GEMINI_API_KEY`, `GEMINI_MODEL`, `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_PROVIDER`. Never put secrets in `NEXT_PUBLIC_*`, source control or reports.

| Setting | Default / role |
|---|---|
| `LP_ANSWER_LIMIT_SESSION_10MIN` | 15 |
| `LP_ANSWER_LIMIT_ALL_10MIN` | 60 |
| `LP_ANSWER_LIMIT_ALL_DAY` | 1,500 |
| `LP_SEMANTIC_ENABLED` | Keep false until upload and checks pass |
| `LP_CORPUS_FILE` | Optional local corpus path override |
| `LP_SEMANTIC_DIR` | Optional local job-directory override |

Commands:

```text
npm run semantic:plan
npm run semantic:build
npm run semantic:upload
npm run semantic:assets
node scripts/semantic-finish.mjs
node tests/semantic.mjs
node tests/semantic-api.cjs
node --experimental-strip-types scripts/guard-test.mjs
node tests/answer-retry.cjs
node tests/citations.cjs
node tests/video-titles.cjs
```

Do not start another build/continuation while the existing job is running. A changed corpus aborts a resume instead of mixing snapshots. This version does not automatically embed future imports or migrate to a new remote generation; those need explicit reconciliation and budget review.

Import flow: Markdown parser → versioned local SQLite → Turso migration. `scripts/video-titles.json` enriches titles; existing real titles survive placeholder input even without the cache. Malformed cache data stops import. Changed/deleted cloud passages invalidate corresponding semantic vectors; unchanged updates preserve them. New imports remain searchable by keywords until indexed.

## 10. Remaining limits and reference records

Free embedding inference does not remove Gemini answer quotas, Turso read/write/storage limits, hosting bandwidth limits, local power use or PC uptime needs. Shared-password access is still a pilot mechanism; individual accounts, per-user history and source approval are unfinished. Semantic similarity is not factual evidence. Citation/model/code checks can all miss errors.

Detailed records in `D:/lp-insight/outputs/`:

- `LP-Insight-library-report.md`: initial library inspection (historical pre-migration state).
- `LP-Insight-regression-report.md`: local pipeline audit before deployment.
- `LP-Insight-production-test-report.md`: deployed ten-case results and caveats.
- `LP-Insight-semantic-search-costs.md`: earlier cost evaluation.
- `LP-Insight-Hugging-Face-pilot.md` and `.json`: free-model measurements and methodology.
- `LP-Insight-embedding-token-audit.json`: tokenizer audit.
- `production-cortisol-vitamin-d.png`, `production-citation-check.png`: earlier production browser evidence.
- `Hybrid-search-worker-check.png`, `Hybrid-search-fallback-check.png`: new local worker/fallback evidence.

Repository references: `SEMANTIC-SEARCH.md` (operator guide), `lib/guard.ts`, `lib/retrieval.ts`, `lib/semantic.ts`, `app/api/answer/route.ts`, `public/app.js`, `scripts/semantic-*.{cjs,mjs}`, and the tests listed above. Raw regression and pilot data remain in ignored `.sites-runtime/`; original private corpus and credentials are not included in this documentation.

## Automatic upload recovery — added 15 October 2026

The upload supervisor now retries transient connection/DNS/socket timeouts and temporary 502/503/504 service failures automatically. It waits 15 seconds initially, doubles the delay and caps it at five minutes. Wi-Fi reconnection is detected by successful contact with Turso on a subsequent attempt; no operating-system network settings are changed.

Each retry opens the local completed index, rechecks current cloud storage and corpus/revision identity, and reads the server-confirmed contiguous checkpoint. Only remaining rows are uploaded. A lost response after commit is handled by reading the committed server rows on reconnect, avoiding duplicate uploads. Noncontiguous checkpoints stop for reconciliation. Each batch still checks actual/prospective size inside its transaction and rolls back unsafe growth; the 4 GB ceiling and 1 GB reserve remain unchanged.

Connection waits use the retryable waiting-for-network state. Storage, corpus mismatch, authentication, quota and other validation failures remain terminal; they do not trigger paid fallback or endless unsafe retries. The scheduled monitor stays quiet during expected connection waits and reports terminal outcomes. This reconnect behavior assumes the PC and supervisor remain running; it does not install a Windows startup service.

The waiting supervisor was replaced with the new version (PID 17824 at activation); the existing embedding process was not restarted. Tests passed for connection recovery/backoff, non-retryable safety stops, transactional storage rollback and committed-checkpoint recovery after a simulated lost commit response using a real local libSQL database. Real cloud upload/reconnect validation remains pending until full local indexing finishes. Tests: `node tests/semantic-retry.mjs` and `node tests/semantic.mjs`.

## Free CPU speed optimization — 15 October 2026

A local benchmark compared the same 32 texts, batch size, q8 model and CLS pooling at default, one, two and four CPU threads, while the indexer stayed running. Rates were 2.33 and 2.17 windows/sec for the two default runs, 1.71 for one thread, 2.97 for two and 4.20 for four. The four-thread run was about 1.9x faster than the default average under this contention. Sampled embedding cosine agreement was 1.0. This is a small concurrent benchmark, not a promise of a 1.9x full-job speedup.

The local indexer now uses four intra-operation threads and one inter-operation thread; optional LP_EMBED_THREADS allows 1–12. Model, tokenizer, windowing, precision, dimensions and storage policy are unchanged. Before switching, 37,196 committed windows were recorded with hashes of 40 vectors. After stopping the original process, 37,218 committed windows remained; all 40 hashes were unchanged and PRAGMA quick_check returned ok. The new process (PID 29400 at activation) revalidates the corpus and resumes missing windows, without recomputing committed embeddings. The upload supervisor and automatic reconnect behavior remain running and unchanged.

Evidence: .sites-runtime/semantic/speed-check.json and resume-proof.json. Build output is now in .sites-runtime/semantic/build.log and build-errors.log. The fresh ETA should be assessed after the resumed embedding phase has run long enough; corpus revalidation temporarily reports planning progress. Tests for checkpoint recovery, storage rollback, reconnect retry and TypeScript continue to pass. No paid service, upload or deployment was triggered by this optimization.

The optimized process subsequently entered embedding with threads=4 and resumedWindows=37218. Progress advanced to 37,502 at 09:16:19 UTC; a later integrity/hash check found 37,591 rows with all 40 recorded hashes preserved. Early ETA includes resume overhead and is not a confirmed time saving. No build errors were recorded.


## Local database-lock incident and recovery — 15 October 2026

The optimized build stopped at 09:16:37 UTC with SQLITE_BUSY (database locked), shortly after a concurrent integrity check. Its last progress report showed 37,502, but the authoritative saved table contained 37,591 committed vectors. The integrity check was a plausible trigger; it is not a proven sole cause. The waiting supervisor stopped as designed.

The local writer now uses WAL journaling, FULL synchronous durability and a five-second busy timeout. Batch writes retry SQLITE_BUSY/SQLITE_LOCKED up to six times with bounded delay. A failed local connection is closed/reopened before retry to clear native prepared-statement state; the same rolled-back batch arguments/IDs are reused. Non-lock failures are not retried by this helper. Remote storage guards and network recovery are unchanged.

Tests reproduced a real local writer lock and verified recovery with no duplicated rows. They also verified WAL permits writes during a reader snapshot, lock retries are bounded, and unrelated/storage failures are not retried. The previous 40 vector hashes and database integrity passed while the build was stopped. No further full integrity scans are run concurrently with embedding.

The existing job was resumed from 37,591 committed windows, retaining four threads. Recorded recovery process IDs: indexer 27936, supervisor 15276. New logs remain build.log/build-errors.log and finish.log/finish-errors.log under .sites-runtime/semantic. Early speed estimates from before this interruption should not be treated as confirmed acceleration; a fresh rate requires sustained embedding after corpus revalidation. No paid service, storage-ceiling change, upload or deployment occurred during recovery.

Recovery confirmed: at 09:26:29 UTC the job had 38,002/285,409 windows (13.3%) with four threads and no new logged errors. The first 411 newly committed windows averaged 8.91 windows/sec, compared with roughly 5–6/sec before recovery. The live embedding-only estimate was 7.72 hours; this is an early sample, not a guaranteed completion time, and excludes index construction/upload. Restart overhead and previously completed-window scans are now excluded from the rate timer.


## User-requested travel pause — 15 October 2026

The indexer and upload supervisor were stopped at the user's request, retaining 128,882 committed windows (45.2%). Status is paused, not failed. Planned resume is no earlier than 2026-10-15T16:30:28.827Z (about 10 PM IST), three hours after pausing. The existing follow-up checks every five minutes during this pause and may resume this same job once after that deadline if the PC and Codex host are available; it then returns to normal monitoring. It cannot wake an unavailable PC. The checkpoint/database and 4 GB ceiling are retained. Unexpected failures are not authorized for automatic restart.


## Manual resume after travel — 15 October 2026

The user requested immediate resume at approximately 21:46 IST, superseding the earlier 22:00 timed resume. Confirmed no duplicate semantic workers, retained the paused checkpoint of 128,882 windows (45.2%), and launched the existing build and guarded-upload supervisor (recorded PIDs 33248 and 30152). Both processes were verified alive. The job revalidates the corpus before embedding missing windows; a new ETA is pending. The timed-resume authorization was removed from the heartbeat and normal 30-minute quiet monitoring restored, preventing a second launch. The 4 GB ceiling, local lock recovery and upload reconnect behavior are unchanged.


## Batched cloud upload optimization — 16 October 2026

The original uploader issued 64 separate INSERT requests inside each guarded 64-vector transaction. It now validates all original parent hashes/versions first, then submits one parameterized multi-row INSERT for those same 64 vectors. Batch size, vector precision, index settings, checkpoint verification, before/after storage measurements, projected-growth guard, rollback, 4 GB ceiling and automatic reconnect behavior are unchanged. No concurrency was added and the final data/index footprint is unchanged.

Tests passed with the real local vector engine for exact vector/metadata preservation, a single INSERT request per batch, idempotent replay after committed progress, rejection of oversized batches, and rollback of the entire batch when allocated storage exceeds the ceiling. Existing checkpoint, network retry and storage tests also pass. Test command: node tests/semantic-upload-batch.mjs.

The existing supervisor/uploader was replaced with the tested version, preserving the server-confirmed prefix of 22,784 vectors (more than the last reported 22,528). Recorded new supervisor PID: 4888. At 03:06:31 UTC, upload had reached 24,576 of 285,409 vectors and Turso allocated storage was 871,370,752 bytes. The first 1,792 vectors after the checkpoint took about 76 seconds (23.4 vectors/sec). At that early pace, remaining upload time projects to roughly three hours; this is not a guarantee, because graph insertion cost, connection interruptions and database load can vary. The previous approximately 20-hour estimate used the slower overall pace including interruptions.

All embeddings and the completed local index were retained. No paid service, plan upgrade, feature activation or deployment was performed. Final cloud verification and production hybrid testing remain pending until upload completes.

## Indefinite upload travel pause — 16 October 2026

The user requested a safe stop and restart only when they explicitly say go. All semantic upload/supervisor processes were stopped and absence of remaining semantic workers was verified. Turso read-only checkpoint verification found a contiguous prefix of 125,568 committed vectors (44.0%); a second read confirmed the count was stable. Allocated Turso storage was 1,909,755,904 bytes (1.91 GB). Both local status files are marked paused with resumeStage=upload and no timed restart. The heartbeat is PAUSED, so neither monitoring nor scheduling will resume this upload automatically. Full local embeddings and index remain intact. Resume must use the existing checkpoint, guarded 64-row bulk insertion, automatic network recovery, and unchanged 4 GB ceiling after the user's next explicit go.


## Upload resumed on explicit go — 16 October 2026

The user explicitly authorized resuming the travel-paused upload. Read-only Turso verification confirmed 125,568 contiguous committed vectors and 1,909,755,904 allocated bytes, below the unchanged 4 GB ceiling. No duplicate semantic workers were found. Restarted the same guarded bulk upload supervisor (recorded PID 31584) with committed checkpoint recovery and network retry. Restored quiet 30-minute completion/error monitoring. Completed local embeddings and index were retained; no deployment or feature activation was performed.


## Verified completion — 16 October 2026

Embedding, local compressed-index construction and guarded Turso upload are complete. The uploader reported cloud-ready at 08:08:15 UTC (13:38:15 IST), and its supervisor completed immediately afterward. A separate read-only production verification at 08:21:12 UTC confirmed 285,409 vectors with IDs 1–285,409, matching revision bge-small-q8-cls-180w-v1, ready=1 and total=285409.

Final allocated database storage: 3,553,398,784 bytes (3.55 GB decimal), measured as 867,529 pages × 4,096 bytes. Headroom below the 4 GB job ceiling: 446,601,216 bytes. Headroom below the supplied account's 5 GB free allowance: 1,446,601,216 bytes (1.45 GB), exceeding the reserved 1 GB. Final measurements assume no additional databases have been added since the supplied account-wide screenshot. No storage ceiling was raised or paid plan activated.

Independent verification data is saved in .sites-runtime/semantic/final-verification.json. The completion/error heartbeat is paused to prevent repeated notifications. No new index or upload is needed. Full-library retrieval/browser regression tests, feature activation/deployment, and the later requested natural-answer/source-presentation improvements remain pending. The live app has not been switched to hybrid search by this job.


## Hybrid regression and local activation — 16 October 2026

All 13 main-question regressions passed, with a targeted vitamin D rerun after a temporary Gemini failure. The authenticated local app passed combined cortisol/vitamin D answer/citation checks and low-carb/Mediterranean keyword fallback checks. Added source-kind/comparator guards and one bounded transient-provider retry; focused units, TypeScript and production build passed. LP_SEMANTIC_ENABLED=true is now persisted in ignored .env.local only. Nothing deployed; production feature configuration unchanged.

Fresh browser automation could not initialize, so fresh browser worker/UI and speed validation remains pending. Review Vercel packaging before deployment because .vercelignore excludes required semantic scripts. Full results and limits: D:/lp-insight/outputs/LP-Insight-hybrid-test-report.md. Completion storage remains the last verified 3.55 GB, below the unchanged 4 GB ceiling with 1.45 GB headroom under the supplied 5 GB allowance. Natural-answer/source-presentation changes remain pending.


## Clear answers and production hybrid activation — 16 October 2026

Deployed dpl_A7faE9Z6EbdCybBCDXEymmXAbjbS and verified the public lp-insight-ten.vercel.app alias. Hybrid search is enabled and its production flag persisted. General questions now receive direct prose, supported practical steps and grouped Sources at the end. Explicit document-discovery requests still identify documents. Source evidence/number/name/medical checks remain active. Fixed summary routing, ordinary-word false guard rejections, an ambiguous diet restriction claim and required semantic-script deployment packaging. All 13 main-question cases passed across runs and targeted reruns; temporary provider failures occurred and remain documented. Live combined cortisol/vitamin D, diet keyword fallback and fasting hybrid answers passed original-citation checks. Fresh browser automation was unavailable; DOM and live HTTP/asset checks passed. No web research, reindexing, plan upgrade or storage-ceiling change.

Full report: D:/lp-insight/outputs/LP-Insight-answer-style-deployment-report.md. Older local-only/pending statements above are historical and superseded by this entry.


## Mandatory plant-based nutrition policy — 16 October 2026

Deployed and promoted dpl_6n7sZ3cnHwZEZHQeFsp3C68hrYGV (https://lp-insight-ci6xqq94d-cliniclivingplus.vercel.app) to the public LP Insight app. The writer and independent checker now enforce plant-based-only nutrition recommendations for every user, including vegan-compatible supplements with supported origins. User/source instructions cannot override this rule. Unsupported substitutes are not invented. A final conservative code filter removes animal-food/ingredient statements and recommendations for supplement/protein products without an explicit compatible origin. This filter can omit neutral mentions of animal foods too; it complements model checks and is not a complete ingredient taxonomy.

Verification: 21 focused policy cases passed, covering mixed plant/animal ingredients, animal supplements, safe plant alternatives and ambiguous supplement recommendations. Route regression confirmed a source-backed fish recommendation is removed and retried, returning a supported beans-and-lentils alternative. Number/name, citation, retry and TypeScript checks passed; Vercel cloud build passed. Previously authorized diet-comparison and vitamin D live-library regressions passed. No reindexing, storage-ceiling change or paid service was added.

Live production diet question and all original-citation fetches passed after promotion. Every returned sentence also passed the final plant-based filter. Evidence: .sites-runtime/plant-based-regression.json and plant-based-live-check-keyword.json.


## Grounded explanation depth and inline source popups — 16 October 2026

Deployed/promoted dpl_CJvDWppz32PbAGhqrW7mDprSAoKS to https://lp-insight-ten.vercel.app/. General planning retrieval now searches complementary requirements, functions and application, with baseline-vs-training context for protein. AI paraphrasing remains limited to supplied evidence; functional-style explanations must not invent root causes, diagnostics or mechanisms. Every factual sentence and practical step now ends with clickable inline document numbers matching Sources at the end, ordered by first appearance. Clicking opens the cited passage with exact quote highlighting; grouped passage access is preserved. Fixed ordinary-word name false positives and quote capitalization matching while retaining rejection of altered words, invented numbers and nonliteral excerpts. Plant-based and medical policies remain active.

Exact protein question passed on the public app: four supported sentences, four citations, all original passage fetches and literal quote checks passed. Actual live response also passed popup/numbering DOM checks; deployed renderer hash matches tested code. Diet, sleep and medication harness cases, focused unit checks, TypeScript and cloud build passed. Temporary Gemini per-minute quota interruption and targeted reruns are documented; no exhaustive clinical or fresh visual/browser validation is claimed. Full report: D:/lp-insight/outputs/LP-Insight-explanation-citation-report.md.


## Clarification and useful next steps — 16 October 2026

Deployed/promoted dpl_AZ8EtPwhHb9pkCyUHYRvovnX5hvY (https://lp-insight-10qxa10me-cliniclivingplus.vercel.app) to the public app. The exact keto-not-working patient question now asks which outcome is not improving. Replies retain the original intent in retrieval and embeddings. A patient blood-sugar goal without scope/condition gets another clarification, not an assumed diagnosis. General plant-based weight-loss next steps passed live citation checks.

Action answers now require both a direct answer and supported practical steps after filters and whole-request review. One targeted evidence refresh/retry is allowed; remaining gaps return a clear message rather than a risk-only fragment. Clarified requests remain one goal. Added patient causal-inference protection, fixed the Lower/lowering guard false positive, and preserved inline citation/source popups. UI reset, older-card context, multi-stage clarification, request-fit, medical, plant, quote, guard and TypeScript/build tests passed. Final public original-question, weight-loss and blood-sugar-scope tests passed. Earlier provider 503/timeouts, insufficient responses and superseded clinical wording are documented; no clinical correctness or exhaustive case coverage is claimed.

Full report: D:/lp-insight/outputs/LP-Insight-clarification-deployment-report.md. No reindexing, storage-budget change or paid upgrade. Older deployment and test statements below/above are historical snapshots.


## 16 October: continuity after completed answers

Fixed loss of the original problem after a completed clarification answer. Short outcome replies (weight loss, cholesterol, blood sugar, low energy) now reuse the original user question. Recognized referring follow-ups such as “Why does that help?” reuse the latest user-question context. Switching outcomes starts from the original problem, rather than accumulating conflicting goals. Temporary API errors preserve the prior context for retry. Explicit new-question/new-chat controls clear it; independently phrased questions begin a fresh search. The UI displays “Following up on” with the original question. This is bounded, in-memory user-question context, not permanent chat memory; previous generated answers are never supplied as evidence.

Strengthened writer/checker request-fit instructions. A deterministic check additionally rejects keto troubleshooting answers whose direct Answer never addresses keto; merely naming keto does not establish correctness, so independent evidence checking remains required. Retry retrieval retains an original topic plus keto/outcome queries rather than searching only generic plant-based advice. Existing plant-only, number/name, exact quotation, medical and source-popup checks remain active.

Tests: citation/DOM continuity sequence, outcome switching, referring follow-ups, provider-error retry, explicit resets, clarification/request-fit/retry, 30 guard cases, 21 plant-based cases, quote normalization, grounded retrieval, semantic API and source metadata passed. Type check and production build passed (local Windows sandbox required an elevated build for generated directories). Authenticated local hybrid weight-loss test passed with three cited sentences addressing keto and energy balance. Production deployment promoted: dpl_6MG7ADE9YyH4GTGNNPWTNPhJagCi. Public follow-up checks recorded separately under .sites-runtime/keto-continuity-production*. Full visual browser automation was unavailable; DOM tests and HTTP checks are distinct from visual validation. Free Gemini service availability and incomplete retrieved evidence can still cause errors or evidence insufficiency.

Production verification completed: authenticated keto clarification, weight-loss Answer plus cited plant-based steps, blood-sugar scope clarification, and source-passage access all passed. The deployed renderer exactly matches the tested local renderer; recorded production response inline citations and highlighted popups passed DOM checks.


## Full-conversation live test supersedes isolated reliability claims

On 16 October a 14-turn production test across two runs found that the complete keto conversation is **not a clean pass**. Repeated outcome clarification on why-follow-ups can retain a stale goal; a later blood-sugar answer can include cholesterol. Provider 503s were intermittent. Literal citations, source endpoint access and popup highlights worked, but manual review found a type-2-diabetes population limit omitted from broad blood-sugar claims and a clinician/medication-guidance sentence whose quote did not entail the entire sentence. Existing guard/checker acceptance is insufficient evidence of correctness. No app code or deployment was changed in this testing turn. Detailed report: D:/lp-insight/outputs/LP-Insight-full-conversation-live-test.md. These open issues supersede any implication that earlier isolated passes established full conversational reliability.


## Latest continuation/citation correction

Deployed dpl_DwZrdTwFtrT16ApDzQX1DkbztxdW on 16 October 2026. Original problem, active goal, scope and prior-action reference are now separate state; outcome changes replace previous goals even during clarification or API failure. Prior-action references are untrusted and re-verified. Explanatory follow-ups do not require another action list. The planner cannot re-ask an explicit goal as an outcome clarification. New deterministic evidence checks preserve type-2-diabetes population limits, clinician/medication quote relevance, fiber/protein mechanism distinctions and excess-intake qualifiers; patient diet-stopping directions are filtered. Regression tests and production build pass, and final served renderer matches tested source. Intermediate live cholesterol/why and outcome switching improved, but later service failures became explicit Gemini quota/rate-limit errors. A clean full final-deployment eight-turn live pass remains pending; final blood-sugar answer content is not live-verified. See D:/lp-insight/outputs/LP-Insight-continuation-citation-fix-report.md for exact scope and evidence. No indexing, budget or storage change.


## 17 October — optional backup Gemini key (local, awaiting configuration)

Added server-only GEMINI_API_KEY_BACKUP with bounded quota-only failover, identical payload/model/schema, distinct-key deduplication, warm-instance cooldowns and a shared 45-second stage budget. Writer/checker and citation/safety guards are unchanged. Mock credential tests, existing answer/clarification retry tests and type checks pass; no real backup key was provided or transmitted. This change is not yet deployed or activated. The user must add the secret to Vercel Production environment settings; keys in the same Google project share quota. README documents deployment and cooldown limitations.


## 17 October — coherent explanatory answers and options

Deployed dpl_Ct3xKduAkWdAGaSvbHrmxb9Gw9SE to the public alias. Broad planning questions now target connected direct answers, explanations, supported Options and trade-offs, and practical next steps; no source-title inventory in summary prose. Retrieve complementary evidence before presenting one integrated planning answer. Keep all independent evidence/citation, population, numeric/name, plant-only and medical checks; unchanged normal model-stage count and bounded retries. Tests cover eight-claim explanations through independent verification, integrated presentation, options rendering/citation mapping, follow-up continuity, safe retry and scope checks; type checks and cloud builds pass. Production backup variable is present (name-only inspection). Authorized live keto/protein tests are blocked by primary 429 quota and backup 402 Payment Required. Exact AI_BILLING handling now distinguishes that blocker. No billing change or charges were authorized or made. Final live prose quality remains unverified; final no-AI production checks and renderer equality passed. Full report: D:/lp-insight/outputs/LP-Insight-explanatory-answer-update.md.


## 17 October — resumed discussion/protocol handoff (local only)

Read the pasted handoff and preserved the existing discussion/history/protocol implementation. Fixed qualified plant substitutes so veggie bacon/sausage and explicitly vegan or plant-based meat substitutes do not fail merely because of their names. The mask applies to immediately qualified products only; actual eggs, dairy, meat and fish oil elsewhere in a sentence remain blocked. 31 plant-policy cases pass.

Protocol/regimen/routine wording now counts as an action request, enabling one integrated planning answer after complementary retrieval rather than artificial unanswered search topics. Based-on-that follow-ups now retain the active conversation context. An explanatory why follow-up does not re-enter protocol mode solely because the original request contained protocol. Protocols are explicitly marked partial when steps were filtered or fewer than three survive; phase renumbering remains intact. Analysis grounding no longer treats question words as evidence, and duplicate/conflicting analysis verdicts fail closed. Added counts for proposed/mapped/accepted analysis. Text-level diagnostic logging is restricted to non-production with LP_DEBUG_STAGES=1 and now reports the actual missing details from the numeric/name guard.

Local discussion/protocol, context/citation, answer retry, scope, quote, metadata and 30 numeric/name guard regressions pass; type check and production build pass. The exact historical breakfast rejection remains unconfirmed because the original draft/source pair was not available in the handoff. New diagnostics are ready to identify it without weakening the guard speculatively. No live Gemini requests, production deployment, indexing or storage changes were made in this continuation. Requested explicit authorization for two linked sleep discussion/protocol tests plus one affected rerun; awaiting that reply before sending selected passages.


## 17 October — authorized linked live checks and checker-index fix (local)

Used exactly two authorized linked requests (sleep/circadian/blood-sugar discussion, then a plant-based sleep/morning-energy protocol) and one authorized protocol rerun. All three returned insufficient; none produced a completed answer. The diagnostic rerun used real library retrieval and Gemini, with authentication/usage bookkeeping mocked and no production database writes. All five model stages in that rerun returned HTTP 200: planner, writer, checker, retry writer, retry checker.

Found a structural cause of total answer loss: the checker was sent internal original-draft `_i` identifiers along with the filtered sentences. In attempt one it returned indices 1 and 2 for two sentences; in attempt two it returned 0,1,2,4 for four sentences. supportedSentences correctly expected array positions 0..N-1 and rejected the malformed checks, leaving zero supported sentences even though the model marked them true. Fixed the checker input to omit `_i` and provide an explicit zero-based `index` for each filtered sentence. Internal original indices remain server-side for analysis linkage. The guard is not bypassed and checker verdicts are not remapped at runtime. A route regression now removes a middle draft sentence and verifies the remaining sentences are checked and returned using the correct positions.

The rerun also confirmed numeric/name false positives for ordinary sentence openers Human, Embrace and Align; these common openers (plus Consume) now avoid name treatment while unknown names/acronyms and numbers stay checked. Repeated phase headings inside sentence text were also treated as source facts. Added conservative removal of an exact duplicated Phase-N or Monitoring-and-Review metadata heading only; actual quantities in the instruction are untouched. Protocol prompt now tells the writer to put headings only in phase metadata. Phase renumbering and partial-protocol labeling remain active. The historical breakfast sentence itself was not reproduced, so its specific earlier rejection is still unconfirmed.

Analysis in the rerun: first attempt proposed two items but lost their prerequisites before checking; second attempt mapped one item and the checker approved it, but the sentence-index mismatch then discarded the supported sentence set. The fix addresses this structural loss; it does not force unverified analysis to appear. Local discussion/protocol, gapped-index regression, citation/context, retry, explanation, numeric/name, scope and type checks pass. Final production build is recorded separately. No additional Gemini requests after the authorized limit; no deployment. Live confirmation of the corrected pipeline is pending.

Evidence files: .sites-runtime/sleep-protocol-linked-report.json, .sites-runtime/sleep-protocol-stage-audit.json. Diagnostic harness: scripts/protocol-stage-audit.cjs. These contain intermediate model output for debugging, not validated user answers.


## Latest conditional-deployment test: sleep/protocol rerun

17 October: ran the user-authorized linked pair plus two diagnostic protocol checks. Discussion answered with five cited sentences and working citation popups; linked protocol first returned insufficient. The checker-index fix now retains approved subsets. A later protocol returned seven checked sentences, but manual review still failed relevance/entailment: some advice and benefits were not adequately tied to sleep/morning energy, and the protocol was partial. Added explicit current_request, sleep-focused retrieval, reasoned checker verdicts, absence-claim rejection and ordinary opener fixes. Local regressions and build pass. **No deployment** because the user's answer/citation quality condition was not met. Detailed results: D:/lp-insight/outputs/LP-Insight-linked-sleep-protocol-rerun.md. No additional Gemini requests after that failed quality review.


## 17 October — sleep protocol quality gate passed for retained content; deployed



The latest follow-up question is now the primary model task; earlier conversation remains context. Protocol retrieval prioritizes sleep, sleep regularity and relevant plant-food evidence. Every retained protocol action must pass the existing literal-quote, number/name, plant-based and scope guards, plus checks for action support, goal relevance and claimed-benefit support. The independent checker must approve all three protocol dimensions. Unsupported timing, populations, causal claims and generic glucose-only or supplement advice cannot be used to fill a sleep protocol. Retry feedback identifies rejected content without becoming evidence.

The checker receives explicit zero-based filtered-array indices; internal draft identifiers remain server-side. Citation grouping, inline popup highlights and phase numbering remain intact. A supported action list can answer a protocol request even when an unsupported introductory sentence is removed. Partial protocols remain labelled partial. The interface explicitly identifies a missing morning-energy outcome rather than promising that benefit.

## Linked test and review

Exact questions: “How do sleep, circadian rhythm and blood sugar relate?” followed by “Based on that, make a plant-based protocol to improve my sleep and morning energy”.

Final linked run used real Gemini and read-only Turso retrieval with the current local answer handler. POST authentication and usage bookkeeping were mocked in the diagnostic harness; original source endpoints were separately fetched with real authentication. The served frontend renderer handled the actual follow-up context and citations. This was a DOM harness, not a visual browser inspection. The harness now uses the same BGE query prefix as the browser; older diagnostic reports without that prefix are not equivalent retrieval snapshots.

The discussion retained four cited sentences. The protocol retained three individually supported sleep-focused actions: a plant-food dietary pattern with an association qualifier, morning daylight with timing present in the quoted passage, and consistent sleep/wake timing with the quoted flexibility. Seven retained claims passed current code checks and manual passage review. Eight discussion citation buttons and three protocol citation buttons resolved to the expected source highlights; authenticated source content matched. Conversation history was preserved.

The protocol is deliberately partial: other draft content was removed. Its citations do not directly establish improved morning energy, and the interface says so. The assembled regimen is not claimed to have been tested as a combined clinical protocol. The plant-food evidence is associative and population-limited; the cited source is not proof of a universal causal benefit. Passing these checks does not guarantee future model responses or clinical suitability. Source material remains unreviewed.

Intermediate failed runs remain recorded; they were not deployed. The final evidence is .sites-runtime/sleep-protocol-combined-audit-report.json and .sites-runtime/sleep-protocol-release-proof.json.

## Validation and production checks

Discussion, context/citation, clarification, retry, explanation, quote normalization, evidence scope, grounded output, semantic API, provider retry, backup key, plant-policy and numeric/name guard tests passed. Type checking and final local and cloud builds passed. After promotion, authenticated production clarification/access checks passed and public app.js exactly matched the tested local code by SHA-256. Production checks did not make another Gemini request; factual answer review was the preceding real-Gemini local-route run.

No index rebuild, storage-budget change, billing upgrade or plan change was made. The historical complete-index storage measurement remains historical, not a fresh storage check today. The full eight-turn keto regression remains separate pending work; this report does not claim it was rerun.


## 17 October — individual accounts and saved chats (local release, shared schema applied)

Implemented invite-only personal accounts, private saved conversations, sidebar reopening/rename/delete, restored follow-up context and inspectable saved citations. The additive schema is applied to Turso; account UI/API code is tested locally but not deployed. The public deployment above remains unchanged. Chats lost before persistent history existed cannot be recovered.

Live post-test database size: 3,553,456,128 bytes; headroom 1,446,543,872 bytes below the recorded 5 GB allowance, 446,543,872 below the 4 GB ceiling. This measures this database, not a refreshed organization-wide billing total. Global saved-turn budget 128 MB; transactional physical checks retain a 64 MB margin below the unchanged 4 GB ceiling. No automatic deletion/upgrade. Existing reads/deletion remain available if new writes stop. Temporary test accounts removed; no Gemini calls for account testing.

Security/storage integration, actual frontend DOM/citation restoration, real local-production HTTP persistence/isolation/logout/relogin checks, regression tests, type checking and build pass. Visual browser initialization failed, so visual QA and production rollout checks remain pending. Email verification and automated password recovery are not included. Full details and repeatable test instructions: D:/lp-insight/outputs/LP-Insight-accounts-and-saved-chats.md.


## Live deployment confirmation — 17 October 2026

The user authorized deployment and live privacy testing. Release dpl_Gh2epeCuajscheM8jkASv9ZkCiDK was built successfully on Vercel and promoted to https://lp-insight-ten.vercel.app/ . Deployment URL: https://lp-insight-icsoa29kf-cliniclivingplus.vercel.app . This supersedes the earlier local-only delivery status.

Production HTTP checks passed with two independent temporary accounts: both registered and signed in; both saved and reopened server-produced conversations; both signed out and signed in again and retained their own messages. Each user's chat listing contained only their own conversations. Cross-user direct reads, rename, delete and answer-save requests were rejected. Creating a new conversation preserved the earlier conversation. Anonymous history access was rejected. Session cookies had HttpOnly, Secure and SameSite=Strict attributes; sign-out revoked the old signed session. The authenticated page served the sidebar; app.js, chats.js and style.css matched the tested files by SHA-256.

The live test used the deterministic keto clarification path, not Gemini-generated answers, so it consumed no Gemini quota. Earlier local tests cover stored cited-answer snapshots, actual frontend restoration/context and citation highlighting. This was real production HTTP testing plus the earlier DOM tests, not a visual browser inspection or an exhaustive security audit.

Temporary accounts/chats were removed. An independent read-only check confirmed no temporary test accounts remained and the storage budget ledger equalled the sum of saved-turn accounting. Final database size was 3,553,456,128 bytes: 1,446,543,872 below the recorded 5 GB allowance and 446,543,872 below the unchanged 4 GB safety ceiling. The 128 MB saved-turn budget and 64 MB physical-write margin remain enforced. No paid plan, billing or index changes were made. This measures this database; other databases in the organization also consume its allowance.

Users should visit /login, expand Create an approved pilot account, enter their name/email, choose a personal password, and use the existing pilot access password as the invitation. Then sign in with their email and personal password. Previously discarded unsaved chats cannot be recovered. Email verification and automated password recovery remain outside this release.

Evidence: .sites-runtime/accounts-production-http-report.json (11 passed checks, zero AI calls).


## 17 October — registration invitation error clarified (deployed)

The reported generic message was emitted specifically by a rejected invitation password, before account creation. Updated the API to return a field-specific invitation error without exposing the secret. The registration form now explains that the invitation is the old shared LP Insight login password, distinct from the newly chosen personal password. Added a user-controlled show/hide invitation toggle and invalid-field highlighting; the actual submit button remains correctly disabled during signup.

Deployed and promoted dpl_AfXSwxznve5f3UbtS18TrWs1NVCx, https://lp-insight-15w9keudi-cliniclivingplus.vercel.app . Live wrong-invitation rejection and form guidance passed, followed by the complete two-user HTTP sign-in/save/reopen/isolation regression. Temporary test users were removed; zero Gemini calls. Storage remains 3,553,456,128 bytes, below the unchanged 4 GB safety ceiling. Evidence: .sites-runtime/invitation-error-production.json and .sites-runtime/accounts-production-http-report.json. No invitation value was printed, changed or bypassed.


## 17 October — concrete action answers and contextual follow-up arrows (deployed)

Deployed dpl_5hSP8r1VpazcFTLNeYusfxBZThKZ after retrieval, prompt, context and citation checks. Weight-management requests now retrieve complementary food and habit evidence; suggestions have arrows that populate the editor with My response: without submitting. Saved replay restores each turn checkpoint. Fixed ordinary-word guard false positives, accidental protocol mode from old recommendations and summary service advertising. Evidence checks and plant-only policy remain active.

Seven authorized real-Gemini question requests: initial opening passed but follow-ups exposed failures; second linked test passed lifestyle and meal follow-ups while opening was insufficient; final opening-only check passed with five cited statements. This does not claim a final additional all-green linked run or guarantee future answers. Local regressions, 32 guard and 31 plant cases, cloud build, production private-history smoke and served asset hashes pass. No extra Gemini calls after the final opening check. Measured database 3,553,488,896 bytes, below unchanged 4 GB ceiling, with 1,446,511,104 bytes below recorded 5 GB allowance. Full evidence and limitations: D:/lp-insight/outputs/LP-Insight-concrete-answers-and-followups.md.


## 17 October — brief evidence-supported start, then clarify (deployed)

User selected a short library-supported starting point followed by focused questions. Deployed dpl_GLCXJrQ959S6FuqNXWq5tVEFjxuL at https://lp-insight-ten.vercel.app/ (deployment URL https://lp-insight-c8z7l2z70-cliniclivingplus.vercel.app).

Broad advice requests in weight management, nutrition/lifestyle, protein and sleep now enter starting_point mode. The writer is asked for 2–4 supported sentences; the server limits the independently checked set to one Answer, one Explanation and up to two practical actions, and shows a starting-point label. One to three deterministic, claim-free questions collect missing goal/pattern, routine or constraints. Clearly constrained tasks, source lookups/comparisons and already contextualized replies do not enter this broad-request mode. Detection is intentionally scoped/heuristic, not universal intent recognition.

The same citation, name/number, plant-only and safety checks apply. If retrieval/evidence checks cannot support a starting point, no unverified introduction is shown: narrowing questions remain available. Existing hard outcome/condition clarification can still ask first when necessary. No new model stage was added and the thin-answer expansion retry is skipped for deliberate brief starts. Selected question arrows populate the editor; answered prompts with My response are filtered from repeat suggestions. Prompt instructions also tell the writer not to re-ask supplied details. Saved per-turn context continues to restore replies. A contextual reply exits starting-point mode and can produce fuller supported guidance.

Validation: tests/broad-guidance.cjs exercises the actual route with mocked model output, bounds the checked/returned starting set, checks question counts, full follow-up, no repeated answered prompt and an evidence-gap path with no writer call. Updated actual frontend DOM tests cover the starting-point label, focused-question arrows, evidence-gap rendering and saved-chat continuity. Type checking and existing discussion, clarification, retry, explanation, citation and account/storage tests pass. Cloud build passed. Post-promotion two-user real HTTP history/privacy checks and asset hashes passed; temporary users were removed. No new live Gemini tests were run for this preference change and no Gemini quota was consumed; these results do not claim real-model style quality was freshly verified.

Latest measured database size: 3,553,521,664 bytes; 1,446,478,336 below the recorded 5 GB allowance and 446,478,336 below the unchanged 4 GB safety ceiling. The 128 MB chat budget and 64 MB write margin remain unchanged. Storage figures measure this database, not a refreshed organization-wide total.


## 18 October — terse caffeine reply and sleep-context display fix (deployed; zero AI testing)

User reported that a broad sleep/morning-energy starting point led with food experiments, then a reply ending My response: caffeine returned insufficient evidence and exposed an internal prior-recommendation block. User explicitly prohibited spending API quota during testing; no Gemini, OpenAI or other hosted AI API calls were made in this fix or its tests.

For sleep conversations, an exact short caffeine/coffee/tea/energy-drink clarification now takes a deterministic routine-question branch before planning, retrieval or model calls. It asks what is consumed, approximate amount and timing, and usual sleep/wake times; preserves the user's mention as untrusted conversation context without assigning a cause; and returns no factual treatment advice or invented citations. Bare caffeine replies in an active sleep chat also retain that context. More detailed replies continue through the normal library pipeline. This is a scoped short-reply fix, not a general proof of conversational understanding.

Follow-up headings show the original question rather than internal prior-recommendation/User context blocks, including on saved-chat replay. Routine clarifications have the existing arrow control, retaining the clarification context. Broad sleep retrieval now explicitly includes regularity, caffeine and morning-light evidence, and the starting-point writer is instructed to prioritize routine information over specific bedtime food experiments before context is clarified. That prompt/retrieval change was not freshly live-model tested, as requested; source/number/name/plant-based and evidence checks remain in force.

Actual-route local tests prove the exact pasted caffeine reply produces routine clarification with zero model and retrieval calls. Existing clarification, broad-start, discussion, citation, saved-chat UI, evidence/scope, 32 numeric/name and 31 plant-policy cases, type checking and cloud build pass. After promotion, only public asset hashes and login availability were checked; no production answer POST was used, preventing accidental provider usage. No new library indexing or storage-budget changes were made; no fresh storage measurement is claimed for this release.

Deployment: dpl_CPJrNRQcmiXqgbxb4sSTVAuDvoBt; https://lp-insight-nksuuejpv-cliniclivingplus.vercel.app ; public https://lp-insight-ten.vercel.app/ . Evidence: .sites-runtime/caffeine-no-ai-release.json.


## 18 October — general short-reply handling (deployed; no AI quota used)

Replaced the caffeine-specific preflight with a topic-neutral short-reply policy. It uses the selected or pending question, reply type and bounded prior reply trail. Incomplete responses return a focused clarification before any hosted model or retrieval call. Meaningful concise answers, explicit outcome choices, condition scope choices, properly contextualized quantities, and relevant preference answers can proceed. A bare yes/no to an open question, unknown number/unit, isolated constraint category or incomplete routine instead prompts for missing context. Unknown/not-sure replies offer general information rather than assuming an answer. No diagnosis or causal inference is made from a short reply.

The policy collects missing details one at a time. Remaining questions are queued, completed questions are removed, and answers to unrelated fields do not fill another question's slots. Clock time is distinguished from quantity, time/frequency wording supports ordinary expressions, and no-activity responses are not asked how long they exercise. Ambiguous replies still use a neutral fallback; this is a bounded rule-based policy, not a guarantee of complete semantic understanding for every possible topic or phrasing.

The browser retains short reply context across topics, includes the actual prompt when an arrow is selected, records a bounded user-response trail, and keeps pending clarification state during save/reopen. Explicit new-topic requests and new chats reset that context. User-supplied replies remain untrusted conversation context, never source evidence. The same library grounding, citation, plant-based and medical-safety checks remain active for generated answers. Snapshot history uses the four turns already consumed by the server to keep saved state bounded; full saved messages are unaffected.

Offline validation: 36 cross-topic policy cases; 15 actual-route incomplete-reply cases; multi-field completion and cross-field isolation. Network access is disabled in the new test, and model/retrieval counters remain zero. Actual frontend DOM tests cover seven short typed replies across topics, prompt metadata, bounded replies, state restoration, arrows, saved chats and explicit resets. Existing broad-start, clarification, discussion, retry, citations, account/storage, evidence/scope, 32 numeric/name and 31 plant-policy cases plus type checking pass. Cloud build passed. After promotion, public file hashes and login availability passed; no production answer POST or AI API request was made. No live Gemini quality claim is made for this release.

Deployment: dpl_2LwumHDKBJn6Mjy5uRNaAYsE6BPc, https://lp-insight-6o0cv703s-cliniclivingplus.vercel.app ; public https://lp-insight-ten.vercel.app/ . Evidence: .sites-runtime/short-reply-offline-proof.json and short-reply-production-proof.json. No index, database schema, storage-budget, billing or plan changes were made, and no fresh storage measurement is claimed.


## 18 October 2026 — clinician case continuity (local, offline tested)

Added a deterministic clarification path for a patient whose keto/diet results are not improving. It collects the outcome, duration, relevant measure, reported trend, known condition for glucose discussions and medication context. Patient statements remain user-reported context, never evidence. Unknown details and a general-information option are allowed. This is a bounded clarification heuristic, not a diagnostic intake or a complete clinical assessment.

The frontend now preserves a bounded patient-reply trail across outcome switches and saved-chat replay. Active goal changes clear the previous recommendation reference while retaining the reported case facts. Patient context is labelled separately from library evidence. Explicit new patient/case/topic and a new chat reset the context. Existing source popups, numbered citations, plant-based policy and evidence guards remain in place.

Offline sequence tested: keto not working → blood sugar and three months → fasting and insulin → unchanged trend → type 2 → why → cholesterol → LDL → rising trend → why. Also tested unknown details, saved-chat reopening and new-patient reset. The actual answer route exits for missing details with zero provider/retrieval calls. Ready cases stop at a deliberately disabled-provider gate. Frontend answer rendering uses a local fixture, not a generated clinical answer.

Passed: doctor-conversation.cjs, doctor-conversation-ui.cjs, short-replies.cjs, saved-chats-ui.cjs, clarification.cjs, citations.cjs, answer-retry.cjs, broad-guidance.cjs, 32 numeric/name guard cases, 31 plant-based cases, and TypeScript checking. An older general-flow fixture was separated from the new patient-case expectations. No Gemini/OpenAI/hosted-AI requests, live answer POSTs, database writes, storage changes, or deployment were performed for this work. Current public deployment remains the previously recorded deployment.

Evidence: .sites-runtime/doctor-conversation-offline-proof.json. Offline testing establishes the tested context and clarification behaviour; it does not verify newly generated medical answers or clinical accuracy.


## 18 October 2026 — clinician continuity fixes deployed

Published and promoted deployment `dpl_DCBq8SdkewPU89NWLoP68cKVv2Ej` (`https://lp-insight-mxsszygqw-cliniclivingplus.vercel.app`) to the public app at https://lp-insight-ten.vercel.app/. This supersedes the earlier local-only status for the clinician conversation fixes. The cloud production build and TypeScript checks passed. Offline doctor-conversation, doctor-conversation-ui and citation regressions were rerun successfully before deployment.

Public verification used GET requests only: app.js, chats.js and style.css returned HTTP 200 and their SHA-256 hashes exactly matched the tested local files; /login returned HTTP 200 with the login form; unauthenticated / returned HTTP 307 to /login. Evidence: `.sites-runtime/doctor-conversation-production-proof.json`. No answer requests, Gemini/OpenAI calls, database migrations or indexing were performed. No fresh storage measurement was taken. This verifies publication and public assets/login; a generated clinical answer was not tested live, preserving the user's API quota.


## 18 October 2026 — phone and tablet layout

Improved the existing responsive layout: narrow header, safe-area padding, touch targets, readable messages, scrollable long source titles, contained source dialogs, and scrollable signup forms. Added a real menu backdrop, Escape/focus handling, focus isolation for the open drawer, and reset on desktop resize. Touch-keyboard Enter inserts a newline; the send button submits. The composer follows the visual viewport when the keyboard changes its height, while preserving pinch-to-zoom.

Real headless Chrome checks used only a localhost presentation fixture, blocked external requests, and made zero answer requests. Tested 320×568, 390×844, 768×1024 and 1280×800, plus a shortened 390×400 viewport. Checks covered horizontal overflow, drawer open/close, touch Enter, dialog bounds and close control, long titles, signup reachability, and page errors. Screenshots reviewed and a long-title popup issue corrected. This is browser emulation, not a physical iOS/Android keyboard test. Proof and screenshots: `.sites-runtime/mobile/`.

The doctor conversation frontend, saved-chat frontend, inline citation and TypeScript regression checks passed. No model requests or database changes were made.


Phone layout deployment verified: `dpl_DdH17Way3mNu5L4Xn1mD6Cyk3GCE` at https://lp-insight-gcvwt4hwz-cliniclivingplus.vercel.app, promoted to https://lp-insight-ten.vercel.app/. Cloud production build/typecheck passed. Public GET-only checks confirmed app.js, ui.js, chats.js and style.css exactly match local SHA-256 hashes; login returned HTTP 200 with the new mobile viewport and account-page markup. Proof: `.sites-runtime/mobile/production-proof.json`. Zero answer requests or AI API calls.


## 18 October 2026 — live phone authentication/history/citation verification

Passed the real public app flows in headless Chrome phone emulation at 390px and 320px: sign in through the actual login form, reopen a previously saved conversation from the mobile drawer, click an inline citation, display the correct source title and exact highlighted library quotation, close the popup, sign out/sign in again, and reopen the same persistent conversation. No page JavaScript errors or horizontal overflow were observed. Screenshots are in `.sites-runtime/mobile/live-*.png`; machine-readable evidence is `.sites-runtime/mobile/live-flows-proof.json`.

Used one unique temporary test account and a clearly labelled display-only saved quotation fixture, not the user's private history or an AI-generated answer. It was persisted with the existing guarded beginTurn/finishTurn helpers and read through the real saved-chat/source APIs. The browser blocked /api/answer as a precaution; zero answer requests were attempted. No AI provider requests or API quota were used. The temporary account, chat and turn were removed and saved-chat budget accounting was adjusted during cleanup. Physical iPhone/Android hardware was not tested.

Read-only database page-size measurement after cleanup: 3,553,529,856 bytes; 446,470,144 bytes below the 4 GB ceiling and 1,446,470,144 below the recorded 5 GB free allowance. This measures this database, not organization-wide usage. No code changes or redeployment were needed for these checks.


## 18 October 2026 — deeper scientific explanation (local, offline tested)

Added scientific explanation instructions shared by summary and protocol writing, with independent checker requirements. Detailed answers should connect the actual finding, supported physiological explanation, relevance to the active question, concrete supported options and evidence limitations. Every causal link/definition/benefit needs its own cited support. Outcome evidence cannot establish an unmeasured mechanism, and mechanism evidence cannot establish treatment efficacy. Study design, population, comparator, duration and uncertainty must be preserved when relevant and stated. Why/how follow-ups deepen the referenced explanation rather than restart a plan. Brief-first clarification remains brief.

The search planner now requests explanatory and methodological evidence. Bounded search enrichment adds mechanism/study queries for the first three retrieval topics while preserving up to twelve original queries per topic. Original action/outcome queries remain; source-selection diversity and the 48,000-character passage budget remain unchanged. No extra AI stage was added; test fixtures still use planner → writer → checker, with the existing shared retry budget. The extra searches can add database reads and the added instructions can add prompt tokens during normal use; this is not a quota reduction claim or a measured retrieval-quality improvement.

Plant-based food/supplement recommendation enforcement remains intact. Presentation instructions now treat this as a food-selection rule rather than repeated wording: name foods/habits naturally, mention the dietary pattern when asked or relevant, preserve scientifically necessary diet/population qualifiers, and do not inject nutrition into unrelated topics. There is no blind text replacement that could alter source meaning.

Added an explanation_limited response flag and a plain evidence-limitation message when an explicit explanation/science request has no surviving Explanation sentence. Supported findings remain usable without fabricated causal detail or a forced longer answer.

Offline evidence: tests/scientific-explanation.cjs and .sites-runtime/scientific-explanation-offline-proof.json. Network disabled; synthetic fixtures exercised the actual answer route, query enrichment, writer/checker instructions, rejected causal overreach, plant-food filtering without the label, citations and sparse explanatory evidence. Existing explanatory-answer, broad-guidance, discussion, evidence-scope, doctor-conversation, short-replies, citations and answer-retry tests passed, along with 32 name/number guard cases, 31 plant-based cases and TypeScript checking. Independent checker responses were mocked; this proves orchestration and filtering, not live model reasoning or full-library retrieval quality.

No Gemini/OpenAI/hosted AI calls, database queries/writes, new indexing, storage changes or deployment were performed for this change. Public production remains deployment dpl_DdH17Way3mNu5L4Xn1mD6Cyk3GCE until these local changes are deployed.


## 18 October 2026 — scientific-explanation release deployed

Published and promoted `dpl_Ex9wSk5HKpskgVzPcXQRJJrenZej` (https://lp-insight-nt1id2qb1-cliniclivingplus.vercel.app) to https://lp-insight-ten.vercel.app/. This supersedes the local-only status above. Scientific-explanation and explanatory-answer fixtures passed again before deployment; local and cloud TypeScript/build checks passed. Vercel inspect of the public URL resolved to this exact Ready production deployment.

GET-only public checks verified app.js, ui.js, chats.js and style.css match local SHA-256 hashes, login returns HTTP 200, and unauthenticated root redirects to /login with HTTP 307. Server changes were uploaded and compiled in this release; no generated answer was requested to test runtime model behaviour. Evidence, including local server-source hashes: `.sites-runtime/scientific-explanation-production-proof.json`. Zero answer requests and zero AI API calls. No database migrations, indexing, storage changes or new storage measurement.


## 19 October 2026 — PubMed integration (local, not deployed)



Set NCBI_API_KEY in the server environment (.env.local for local work, Vercel Production environment for deployment). Do not use a NEXT_PUBLIC_ prefix or paste the value into chat or source files. LP_PUBMED_ENABLED=false opts out; otherwise a configured NCBI key enables retrieval. NCBI_EMAIL is optional developer contact information. Environment changes require a new deployment or a local server restart. The key was detected locally and successfully used in direct NCBI-only tests; it was not printed.

## User flows

The new Research tab searches PubMed and previews records without calling /api/answer or an AI provider. It is available to signed-in users. Search accepts general scientific topic terms, not identifying patient details. Results show title, journal, year, publication types, PMID and access scope; Preview displays the abstract/metadata and the canonical PubMed source link.

Normal answer requests can combine library passages with up to four PubMed abstracts, using general topic queries from the existing planner. Full conversation history is not passed to the PubMed connector. The existing writer, independent checker, plant-based restriction, numeric/name safeguards, citation matching and retry cap still apply. No extra Gemini model stage was added. Normal generation/checking still consumes the existing AI quota; Research preview does not. Explicit library-only questions and source inventories remain library-only. Failure to reach PubMed falls back to library evidence with a disclosure.

This first version retrieves PubMed records/abstracts only. It does not fetch full text from PMC, access UpToDate, add a clinical-guideline service, or calculate meal nutrients. A PMCID/DOI may be present as metadata; that does not mean the linked full article was read. Indexing/publication-type labels are not proof of study quality. Abstract-only material must not support details found only in an unread full paper.

## Implementation and resource bounds

lib/pubmed.ts uses server-to-server ESearch and EFetch, a fixed HTTPS NCBI host, POST bodies for the key, timeouts, response-size caps, restricted queries and safe structured XML parsing. Internal entity declarations are rejected; no external DTD is fetched. Mixed title/abstract text and labelled abstract sections are preserved in order. Known retracted publications, retraction notices, expressions of concern and preprints are excluded based on supplied record metadata. This cannot identify every future/undisclosed concern.

Requests are serialized at a 400ms spacing within a warm process. The authenticated preview endpoint has an in-process per-session limit. These are not distributed/global rate limits; NCBI 429s are handled as unavailable/retry-later responses. Ten-minute, 128-entry in-memory caching and in-flight deduplication reduce requests, but cache is not durable across serverless instances. Search returns up to six records; a detail batch contains at most eight PMIDs. External answer evidence is capped at four abstracts and 12,000 characters, within the existing 48,000-character combined passage budget. No bulk import, embeddings, database schema changes or Turso writes were performed.

Research source IDs are negative PMIDs; document IDs are pubmed:PMID, avoiding collisions with positive library chunks. The authenticated source endpoint resolves negative IDs through NCBI. Inline numbering and source popups remain document-based. Saved chats preserve metadata and exact quoted evidence; reopening fetches the current record, or shows the existing labelled saved-quote snapshot when the record is missing/changed. Retractions are excluded from fresh evidence; old saved text is not silently rewritten.

Plant-protein searches are refined to dietary/nutrition phrase searches unless the query explicitly indicates a molecular/cell-biology topic. A live probe found that naive plant AND protein could retrieve receptor biology; refinement removed that ambiguity in the tested results. This is a query refinement, not a guarantee of clinical relevance or evidence quality.

## Verification without Gemini

- Three NCBI-only probe runs (12 E-utilities requests total) tested caffeine/sleep and plant protein while refining search. The final run returned six records for each query. First caffeine result: PMID 36870101, The effect of caffeine on subsequent sleep: A systematic review and meta-analysis. First final plant-protein result: PMID 39411832, Overview of anti-inflammatory diets and their promising effects on non-communicable diseases. Article details matched search records and canonical PubMed links. No key was printed. The test harness blocked every destination except NCBI.
- tests/pubmed.cjs: mixed XML text, metadata, abstract-only scope, exclusions, query/PMID validation, cache isolation, key handling, auth/origin, preview/detail/source routes, citation IDs, bounds and external failures. All NCBI requests were mocked.
- tests/pubmed-answer.cjs: mixed library/research, research-only evidence and unavailable-PubMed fallback through the actual route with fixture planner/writer/checker; scope disclosure and matching citations.
- Saved-chat renderer tests: negative-ID inline citation, PMID/abstract-only label, canonical link, exact highlighted quote and reopening the saved conversation.
- Headless Chrome at 320, 390, 768 and 1280px: Research form, result details, preview, source link and phone layout, with localhost fixtures and all external requests blocked. Screenshots reviewed. This is browser emulation, not physical-phone testing.
- Existing conversation, broad guidance, scientific explanation, protocol, population, retry, inline citation, plant-based (31) and number/name guard (32) checks and TypeScript passed.
- Production build passed after rerunning outside the sandbox: its first attempt could not create the existing libsql junction on Windows. No deployment was performed.

Evidence files: .sites-runtime/pubmed/live-proof.json, .sites-runtime/pubmed/live-articles.json and .sites-runtime/mobile/research-*.png. The final proof records the final four-request NCBI run, not the sum of all three runs. Zero Gemini/OpenAI/hosted AI calls were made. Fixture checks establish integration behaviour, not the accuracy of a newly generated medical answer or full-paper evidence appraisal.

## Official references

https://pubmed.ncbi.nlm.nih.gov/about/
https://eutilities.github.io/site/API_Key/usageandkey/
https://www.ncbi.nlm.nih.gov/About/disclaimer.html


## 19 October 2026 — PubMed deployed and live Research/citation checks passed

Published and promoted `dpl_9JjhSwn9DQZ83x3qqAdWhbmjbay9` (https://lp-insight-c675bwi75-cliniclivingplus.vercel.app) to https://lp-insight-ten.vercel.app/. This supersedes the earlier local-only status. Production NCBI_API_KEY presence was verified through environment variable names only; its value was not printed. Offline PubMed parser/API and answer-route fixture checks and TypeScript passed again; the cloud production build passed. Vercel inspect of the public URL confirmed this exact Ready deployment, and public app.js/chats.js/ui.js/research.js/style.css hashes matched the tested local files.

Live authenticated headless Chrome checks at desktop 1280px and phone-emulated 390px passed: Research tab search, six results each for caffeine sleep and plant protein, preview title and abstract text, PMID/abstract-only labels, canonical PubMed href, separate article-detail endpoint with identical content, and a saved inline citation reopened with its exact highlighted abstract quotation. Caffeine/sleep first PMID 36870101; plant-protein first PMID 39411832. These checks validate UI and record retrieval, not clinical relevance of every returned paper or new model-generated answers. Original link hrefs were checked against the retrieved PMID; external article pages were not opened/read.

One unique temporary account and a labelled display-only saved-quote fixture were created for live persistence/citation checking and removed in cleanup. Existing guarded beginTurn/finishTurn helpers maintained storage/budget limits. Browser requests to /api/answer were blocked as a precaution; none were attempted. Zero Gemini/OpenAI/hosted AI API calls were made. No schema migration, full-library indexing or bulk paper import occurred. The initial failed unauthenticated PubMed check returned HTTP 401 as intended.

Final read-only database page measurement: 3,553,570,816 bytes, 446,429,184 below the 4 GB ceiling and 1,446,429,184 below the recorded 5 GB free allowance. This is this database's allocated pages, not a refreshed organization-wide plan usage total.

Evidence: `.sites-runtime/pubmed/production-ui-proof.json`, `production-assets-proof.json`, `live-preview-*.png`, `live-citation-*.png`; screenshots reviewed. Normal Ask generation/checking still uses Gemini quota. The Research search/preview flow does not. Current scope remains PubMed abstracts/metadata only, with explicit full-text-not-read disclosure.


## 19 October 2026 — abnormal-lab evidence discussion and amylase retrieval fix

User reported the exact questions “what does amayloase do when person is on keto diet” and “what can i give a client with high amygalase” ending in generic refusals and a blanket doctor/medication message. Confirmed code issues: every personal-medical result received an automatic referral note; PubMed evidence selection flattened groups before its four-record cap, allowing the first query to consume all slots; only one query per topic was used even when a single topic supplied alternatives. A new NCBI-only probe also showed unfielded interpretation/evaluation searches retrieving unrelated drug-trial results.

Changes: normalize the reported spelling variants to amylase, with a visible correction note; add foundational amylase/digestion and direct keto queries, or elevated-amylase assessment queries as appropriate; use a second alternative when only one search topic exists; preserve sources across both searches by round-robin selection; rank title relevance and indexed review/guideline labels heuristically, without claiming clinical-quality appraisal. Focus hyperamylasemia evaluation on title/assessment terms and serum-amylase interpretation on relevant review/guideline records. The retrieval still can contain narrow case reports and special populations; these cannot be applied as a diagnosis or universal treatment.

Added an educational clinical_context mode for abnormal-laboratory questions. It can retain a verified direct Answer plus meaningful Explanation/assessment reasoning and ask for missing result/specimen/units/reference range/symptoms/known-assessment details, without demanding an invented treatment or food recommendation to satisfy the action gate. An isolated background sentence, unsupported treatment or disclaimer alone still does not pass. Independent checker and deterministic quote/number/name, medication/dose, population and plant-based safeguards remain. Salivary/digestive findings must not be presented as evidence about raised serum levels; animal results and case reports must not be converted into general human treatment conclusions.

Removed the blanket “discuss any medication … with your doctor” note for personal-medical requests and replaced it with a brief educational scope statement. Evidence questions should be answered from the retrieved sources rather than replaced with a routine referral. This does not remove medication/dose restrictions or prevent an actually supported clinically relevant safety statement. Also removed the confusing “No outside sources were used” sentence from PubMed-searched failure messages. Short replies containing lab values now retain their context and can collect a missing reference range.

Verification: tests/lab-evidence.cjs covers both exact reported questions through the real route using fixture planner/writer/checker, corrected queries and citations, useful educational context without forced treatment, scope/missing-detail questions, retained dose/plant filters, refusal of unsupported facts and failure cases. Tests for PubMed parsing/API, independent checking, short replies, doctor conversation, broad guidance, protocols, citation handling, numbers/names (32) and plant policy (31), plus TypeScript, passed. Fixtures do not establish live model reasoning or clinical accuracy.

Two NCBI-only amylase probe runs used 16 E-utilities requests total, zero AI calls. The final selected evidence included PMID 34444230 (salivary amylase during a very-low-calorie ketogenic intervention in an obese population), PMID 27640169 (salivary amylase review), and PMID 28720341 (lipase/amylase diagnostic review). All remain abstract-only and require their actual population/scope. These were retrieval checks, not a generated clinical answer. Evidence: `.sites-runtime/amylase-retrieval-proof.json` and `lab-evidence-offline-proof.json`.

Deployed and promoted `dpl_8d38STPNQNTgyhv83sgJD2vY2V77` at https://lp-insight-8rbjok02u-cliniclivingplus.vercel.app to https://lp-insight-ten.vercel.app/. Cloud compile/TypeScript/build passed; Vercel inspect of the public URL confirmed this exact Ready deployment. Live Research checks at desktop 1280px and phone-emulated 390px passed for hyperamylasemia evaluation and serum amylase interpretation: search, article details, abstract-only labels, canonical links and exact highlighted saved-citation reopening. The first search included a narrow hyperamylasaemia/myeloma record; it is not evidence of a cause in this client. Browser /api/answer requests were blocked; none were attempted. No new Gemini answer was generated or evaluated live. Live proof: `.sites-runtime/pubmed/production-ui-proof.json` (current run replaces the earlier general PubMed UI proof).

One temporary account and labelled display-only saved-quote fixture were removed in cleanup. Final measured database size: 3,553,583,104 bytes; 446,416,896 below the 4 GB safety ceiling, 1,446,416,896 below the recorded 5 GB allowance. No schema migration or bulk index was run. Stored earlier chat answers are not rewritten; the new behaviour applies to fresh requests. No Gemini/OpenAI quota was used for this work.

## 19 October 2026 — gastric clarification, lab reply and evidence overview corrections (local)

The reported gastric and amylase conversation exposed further issues. Read-only production stage logs showed checker-approved surviving clinical claims being discarded by the final section-structure gate; other claims were filtered before checking, but those logs do not identify which filter removed each claim. The gastric request could pass with only an Explanation because “what can I suggest” was not recognized as a request for practical steps.

Local fixes: vague gastric/stomach/digestive issues now ask which symptoms are meant before retrieval or AI, rather than assuming a rapid dietary transition. Gas/bloating and reflux topics gain focused scientific search queries. Practical requests using suggest/give/recommend/offer now require supported next steps. Writer instructions require supported options, independently cited reasons and applicability; unreported diet changes or causes must not be assumed.

Lab-test-name-only replies such as “amylase” collect the numeric result and units without calling AI, then collect the reference range. Recorded values/ranges are used to avoid repeating the initial compound prompt. Meaningful partial clinical evidence can survive without an arbitrary Answer heading, only if the independent checker approves both the claims and their relevance to the request. Partial overviews are labelled as incomplete case-management guidance and ask for missing context. Unsupported treatment remains excluded. Common sentence-initial adjectives/verbs such as Elevated are no longer mistaken for absent proper names; actual names, acronyms and whole-number matching remain checked.

Verification: tests/clinical-followup.cjs exercises the exact two questions, zero-AI symptom/test-name clarification, incremental numeric/range replies, retained single checked clinical explanation, negative PubMed source citation and rejection of unsupported claims. Lab evidence, PubMed answer, doctor conversation, short replies, broad guidance, discussion/protocol, scientific explanation, retry, citations, 32 guard and 31 plant-based cases passed, as did TypeScript. Real AI/network access is disabled in the new regression fixture; no Gemini/OpenAI quota was consumed. Production logs were read, not new answer requests. Fixtures cannot establish fresh live model answer quality. Proof: .sites-runtime/clinical-followup-offline-proof.json.

These follow-up corrections are local and have not been deployed. The existing production deployment remains dpl_8d38STPNQNTgyhv83sgJD2vY2V77. No database migration, indexing or new storage write was required. PubMed evidence remains abstracts/metadata, not a claim to have read full journal papers or UpToDate.

## 19 October 2026 — follow-up fixes deployed, quota-free live verification

User explicitly authorized deployment and live-update checks without Gemini quota. Deployed and promoted dpl_5vADPnd1z574Es1cBYnRGy3uXThe (https://lp-insight-h8sfths7n-cliniclivingplus.vercel.app) to https://lp-insight-ten.vercel.app/. This supersedes the preceding local-only status for the gastric symptom clarification, incremental amylase replies, practical-action detection and partial checked clinical overview fixes. Cloud compilation, TypeScript and production build passed. The exact gastric/amylase regression fixture and local TypeScript were rerun successfully.

Vercel inspect of the public URL confirmed this exact Ready production deployment. Read-only live HTTP checks passed: home redirects to login; login responds 200; app.js, research.js, chats.js and style.css match local files by SHA-256; unauthenticated PubMed endpoint returns 401. No answer endpoint or model-provider requests were made, no test account was created, and no database migration or indexing occurred. These checks verify deployment and serving, not new live model answer quality. Clarification and evidence-gate behaviour was exercised with offline mocked model stages instead. Proof: .sites-runtime/clinical-deployment-no-ai-proof.json and clinical-followup-offline-proof.json. Reusable read-only checker: scripts/deployment-no-ai-check.cjs.

## 19 October 2026 — NIH guidance evidence and standalone lab replies (local, not deployed)

User requested the same explanatory, evidence-supported assessment style as the assistant's MedlinePlus/NIDDK response, rather than generic insufficient-evidence output. The current app did not include those pages: it used library passages plus PubMed abstracts. Added lib/clinical-guidance.ts with three small, explicitly selected NIH page excerpts (MedlinePlus Amylase Test; NIDDK pancreatitis symptoms and diagnosis), checked against the live official pages on 19 October 2026. These are dated snapshots, not unrestricted internet search, journal papers, full-page retrieval or UpToDate. Current matching scope is amylase/hyperamylasemia/pancreatitis only; unrelated topics do not get these excerpts.

Selected guidance plus one PubMed result fit the existing four-external-source/12,000-character budget; unrelated topics keep existing PubMed selection. Guidance remains available when PubMed is disabled/unavailable, with accurate provenance/disclosure. No external page fetch occurs at answer time for these snapshots. Reserved negative IDs are distinct from PubMed PMIDs and library IDs; authenticated source reopening handles them directly and rejects unknown reserved IDs. Citation UI labels NIH selected excerpts and avoids undefined line labels. Existing evidence, dose, population and plant-based filters remain. Writer guidance requests interpretation, assessment steps and their reasons, conditional urgency and missing details, never treatment from an isolated enzyme result.

A standalone pasted laboratory prompt ending in My response: amylase is now recovered without requiring a structured clarification envelope. It asks for a numeric result/units without AI and does not invent an abnormal result or patient history. This covers an additional input form; it does not prove the exact submitted payload of the user's earlier live request.

Tests: tests/clinical-guidance.cjs verifies scoped selection, bounded merge, source reopening and reserved IDs, standalone reply through the real answer route with zero mocked AI stages, and a three-sentence citation-bearing NIH answer through mocked planner/writer/checker. Existing clinical-followup, PubMed-answer, lab-evidence, citations, short-replies, doctor-conversation, scientific-explanation, broad-guidance, discussion and explanatory-answer tests passed. Updated four fixture loaders to supply the new imported guidance dependency. TypeScript passed. scripts/clinical-guidance-check.cjs fetched only the three fixed official pages and verified every selected paragraph; proof .sites-runtime/clinical-guidance-source-proof.json. No Gemini/OpenAI quota, database migration, indexing, or new account was used. Model quality is not established by mocked stages. These changes are local; production remains dpl_5vADPnd1z574Es1cBYnRGy3uXThe until a subsequent deployment.

## 19 October 2026 — NIH guidance changes deployed with quota-free checks

User authorized deployment without using Gemini quota. Promoted dpl_8iz3c8oLT8wrBGJ5phpfUTiJdTdN (https://lp-insight-kdnz4gds8-cliniclivingplus.vercel.app) to https://lp-insight-ten.vercel.app/. This supersedes the previous local-only status for selected NIH guidance and standalone laboratory replies. Cloud build/TypeScript passed; local clinical-guidance route/source tests and TypeScript passed again before deployment. Vercel inspect of the public URL confirmed this exact Ready production deployment.

Read-only live checks passed for the root login redirect, login page, and SHA-256 equality of app.js, research.js, chats.js and style.css with the deployed local sources. The app.js hash changed to 29930286698d974b87a79faf54c0e7a93f95240f9943221f3aac7c4fda2c7024 and includes the NIH excerpt citation label. Unauthenticated PubMed access returns 401. No answer endpoint or AI provider requests were made; no database migration, test account, index or bulk import was used. No Gemini quota was consumed. New generated answer quality has not been tested live; offline fixtures verify route and citation plumbing only. Proof: .sites-runtime/clinical-deployment-no-ai-proof.json (latest deployment run).

## 19 October 2026 — MedlinePlus keyword integration (local)

Added on-demand MedlinePlus.gov keyword health-topic summaries alongside existing PubMed/library retrieval, with no extra AI stage. Research now offers PubMed/MedlinePlus selection, source previews and canonical links. Citation source types and access notices distinguish educational summaries, PubMed abstracts and dated NIH excerpts. Saved-chat source hydration carries MedlinePlus path/title and validates stable IDs; existing exact saved-quote fallback remains. Source data is bounded and memory-cached for twelve hours, not indexed or written to Turso. External context remains capped at four sources/12,000 characters within 48,000 overall. Library-only requests skip it. Existing independent evidence, plant-based and clinical safeguards remain. No key required; LP_MEDLINEPLUS_ENABLED=false disables keyword retrieval separately from PubMed.

Verified live NLM-only retrieval for pancreatitis, bloating and sleep, cache reuse and cold source reopening: four provider requests, zero AI calls. Offline route fixtures test blending/citations, evidence rejection and fallbacks; auth/origin and parser/security checks pass. Real-browser local fixtures at 320/390/768/1280 widths pass for the MedlinePlus Research selector/preview/canonical links with outside requests blocked. Relevant existing scientific/protocol/conversation/citation/plant regressions pass. Production model answer quality is not established by these fixtures. Source/module details, rate/cache bounds, storage figures and proof paths are in MEDLINEPLUS-SEARCH.md.

Read-only Turso allocation stayed at 3,553,603,584 bytes before/after, leaving 446,396,416 bytes below the 4 GB safety ceiling and 1,446,396,416 below the recorded 5 GB allowance. No migration, bulk import or index, no new account, no Gemini/OpenAI calls. Normal saved-chat write guards/budgets remain. No deployment made for this step; public deployment remains dpl_8iz3c8oLT8wrBGJ5phpfUTiJdTdN. Build verification is recorded in the follow-up below.


Build verification: npm run build completed successfully, including production compilation and TypeScript, with /api/medlineplus present. Integration remains local and is not deployed. No AI calls were made by the build or tests.


## 19 October 2026 — MedlinePlus deployed and live browser verification completed

User authorized deployment and live Research/previews/citation checks without Gemini quota. Initial deployment dpl_DCFwQNDEJjzCd9Lp5z3NXezCocVB passed build, but the live test caught query-dependent inline HTML highlighting adding spaces before punctuation when reopening a summary by title. Corrected XML mixed-text concatenation and HTML conversion: block boundaries become spaces, inline tags are removed without inserting spaces. Added raw and escaped inline-markup regression cases. Unit tests and TypeScript passed; live NLM-only cold reopening for pancreatitis and bloating now produces matching content.

Final production: dpl_H91JWAkt8oZ2oQExNE75HDL4bHKY, https://lp-insight-igqjc0m3g-cliniclivingplus.vercel.app, promoted to https://lp-insight-ten.vercel.app/. Cloud compilation, TypeScript and build passed. Vercel inspect of the public URL confirmed this exact Ready deployment. Served public assets matched local source hashes in the deployment smoke check.

Final live authenticated browser checks passed at 1280px and phone-emulated 390px: MedlinePlus Research provider selection; pancreatitis and bloating searches (three records each); exact source preview title/content; health-topic-summary disclosure; canonical original-source link; source-detail endpoint matches; saved-chat reopening and exact inline citation quote highlighting without snapshot fallback; no page errors or horizontal overflow. Existing PubMed provider switching/search also passed. Screenshots reviewed. The saved citation was explicitly a display-only excerpt fixture, not a generated AI answer or clinical evidence verdict. Browser requests to /api/answer and off-origin providers were blocked, with zero attempts; no Gemini/OpenAI quota was consumed. New generated-answer quality was not evaluated live.

Two temporary accounts across the initial and final runs, their chats and display fixtures were removed; chat budget accounting was restored. Final database allocation: 3,553,607,680 bytes, leaving 446,392,320 bytes below the 4 GB safety ceiling and 1,446,392,320 below the recorded 5 GB allowance. No cache table, migration, bulk import or index was added. Guarded saved-chat margin and free-plan settings remain unchanged.

Proof: .sites-runtime/medlineplus/production-ui-proof.json (passed final run); initial-ui-before-normalization-fix.json (initial incomplete run); live-preview-*.png and live-citation-*.png; .sites-runtime/medlineplus-live-retrieval-proof.json; clinical-deployment-no-ai-proof.json. Live checker: scripts/medlineplus-live-ui.cjs. This section supersedes prior local/not-deployed status.
