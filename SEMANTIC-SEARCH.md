# Free hybrid search

The completed index and deployed browser search use the local, quantized BGE-small-en-v1.5 model with 384 dimensions and CLS pooling. Embedding does not send library text to Hugging Face or Gemini; the existing answer pipeline still sends selected passages to the configured Gemini service. A signed-in browser embeds the original question; Turso combines vector matches with existing keyword retrieval. Answers keep the current writer, evidence checks and original-passage citations.

## Storage decision

The supplied Turso dashboard screenshot confirms Free: one database, 618.76 MB used of 5 GB. The read-only database measurement is 618,762,240 bytes. The full tokenizer pass found **285,409 windows** across **63,172 passages**, max 500 model tokens per window.

The safety projection is **3,799,428,520 bytes**, including current database, estimated vector/index pages, 5% growth allowance and another 64 MB buffer. The upload ceiling is **4,000,000,000 bytes**, reserving at least **1 GB** of the account's published allowance. This reservation assumes no new databases are created outside this job; other account writers are outside its control.

The index is built locally first and checked against its measured allocated pages. Every cloud upload batch runs in a write transaction: it checks allocated pages before and after insertion, checks projected remaining growth, and rolls back if unsafe. Cloud readiness stays false on incomplete or stopped uploads. No paid fallback or plan upgrade is implemented.

## Job and commands

- Progress: `.sites-runtime/semantic/status.json` (phase, completed windows, ETA and storage).
- `npm run semantic:plan`: count the current corpus and check budget without embedding/uploading.
- `npm run semantic:build`: resume local embeddings, construct the compressed 16-neighbour index, and measure storage. Default corpus is `../lp-data/library.sqlite`; override with `LP_CORPUS_FILE`.
- `npm run semantic:upload`: resume guarded batches after `local-ready`. Uses only the configured Turso database. It verifies each parent passage against the local content hash and version.
- `node scripts/semantic-finish.mjs`: continues this job from a running local build to guarded upload, then stops. It never enables or deploys the feature. Background log/status are in `.sites-runtime/semantic/finish.log`, `finish-errors.log`, and `finish-job.json`.
- `npm run semantic:assets`: prepare self-hosted browser assets. `npm run build` also runs it. Official public model downloads are used if the local cache is absent; hashes must match the tested files.

Keep the PC powered on and awake for the local job. A stopped build resumes from committed windows. Corpus changes abort the resume instead of mixing snapshots; reconciliation/rebuild of a changed corpus requires a fresh local directory via `LP_SEMANTIC_DIR` and an explicit remote-generation migration. This version does not automatically index future imports.

## Activation and fallback

Keep `LP_SEMANTIC_ENABLED=false` until the upload reports `cloud-ready` and deployment tests pass. Both the environment flag and matching ready state are required. Missing index, database error, absent browser Worker, model failure or timeout retain keyword search. The browser loads roughly 62 MB initially; it can cache the model. Gemini answer-generation quotas remain unchanged.

Source updates/deletions invalidate affected vectors through triggers; unchanged reimports preserve them. Retrieval joins against the live document version and returns full parent passages, preserving citations. Newly imported passages remain searchable through keywords until indexed; any later indexing must repeat storage checks.

## Validation completed

Production build and type check pass. Tests cover vector validation/revision, readiness/authentication, missing-index/outage fallback, hybrid deduplication, complete overlapping windows, storage preflight and post-write rollback. Existing guard, retry, citation and title-import tests pass. The actual new browser worker produced a normalized 384-dimensional vector; a simulated unavailable Worker selected keyword fallback.

Full-library retrieval quality, cloud index latency, final storage and live deployment tests remain pending until indexing/upload finish. Browser performance was checked locally on this Windows PC, not on mobile networks/devices. Future imports and other databases can consume reserved capacity; this is a job budget, not an organization-wide Turso setting.

## Automatic upload recovery — added 15 October 2026

The upload supervisor now retries transient connection/DNS/socket timeouts and temporary 502/503/504 service failures automatically. It waits 15 seconds initially, doubles the delay and caps it at five minutes. Wi-Fi reconnection is detected by successful contact with Turso on a subsequent attempt; no operating-system network settings are changed.

Each retry opens the local completed index, rechecks current cloud storage and corpus/revision identity, and reads the server-confirmed contiguous checkpoint. Only remaining rows are uploaded. A lost response after commit is handled by reading the committed server rows on reconnect, avoiding duplicate uploads. Noncontiguous checkpoints stop for reconciliation. Each batch still checks actual/prospective size inside its transaction and rolls back unsafe growth; the 4 GB ceiling and 1 GB reserve remain unchanged.

Connection waits use the retryable waiting-for-network state. Storage, corpus mismatch, authentication, quota and other validation failures remain terminal; they do not trigger paid fallback or endless unsafe retries. The scheduled monitor stays quiet during expected connection waits and reports terminal outcomes. This reconnect behavior assumes the PC and supervisor remain running; it does not install a Windows startup service.

The waiting supervisor was replaced with the new version (PID 17824 at activation); the existing embedding process was not restarted. Tests passed for connection recovery/backoff, non-retryable safety stops, transactional storage rollback and committed-checkpoint recovery after a simulated lost commit response using a real local libSQL database. Real cloud upload/reconnect validation remains pending until full local indexing finishes. Tests: `node tests/semantic-retry.mjs` and `node tests/semantic.mjs`.

## Free CPU speed optimization — 15 October 2026

A local benchmark compared the same 32 texts, batch size, q8 model and CLS pooling at default, one, two and four CPU threads, while the indexer stayed running. Rates were 2.33 and 2.17 windows/sec for the two default runs, 1.71 for one thread, 2.97 for two and 4.20 for four. The four-thread run was about 1.9x faster than the default average under this contention. Sampled embedding cosine agreement was 1.0. This is a small concurrent benchmark, not a promise of a 1.9x full-job speedup.

The local indexer now uses four intra-operation threads and one inter-operation thread; optional LP_EMBED_THREADS allows 1–12. Model, tokenizer, windowing, precision, dimensions and storage policy are unchanged. Before switching, 37,196 committed windows were recorded with hashes of 40 vectors. After stopping the original process, 37,218 committed windows remained; all 40 hashes were unchanged and PRAGMA quick_check returned ok. The new process (PID 29400 at activation) revalidates the corpus and resumes missing windows, without recomputing committed embeddings. The upload supervisor and automatic reconnect behavior remain running and unchanged.

Evidence: .sites-runtime/semantic/speed-check.json and resume-proof.json. Build output is now in .sites-runtime/semantic/build.log and build-errors.log. The fresh ETA should be assessed after the resumed embedding phase has run long enough; corpus revalidation temporarily reports planning progress. Tests for checkpoint recovery, storage rollback, reconnect retry and TypeScript continue to pass. No paid service, upload or deployment was triggered by this optimization.

## Local database-lock incident and recovery — 15 October 2026

The optimized build stopped at 09:16:37 UTC with SQLITE_BUSY (database locked), shortly after a concurrent integrity check. Its last progress report showed 37,502, but the authoritative saved table contained 37,591 committed vectors. The integrity check was a plausible trigger; it is not a proven sole cause. The waiting supervisor stopped as designed.

The local writer now uses WAL journaling, FULL synchronous durability and a five-second busy timeout. Batch writes retry SQLITE_BUSY/SQLITE_LOCKED up to six times with bounded delay. A failed local connection is closed/reopened before retry to clear native prepared-statement state; the same rolled-back batch arguments/IDs are reused. Non-lock failures are not retried by this helper. Remote storage guards and network recovery are unchanged.

Tests reproduced a real local writer lock and verified recovery with no duplicated rows. They also verified WAL permits writes during a reader snapshot, lock retries are bounded, and unrelated/storage failures are not retried. The previous 40 vector hashes and database integrity passed while the build was stopped. No further full integrity scans are run concurrently with embedding.

The existing job was resumed from 37,591 committed windows, retaining four threads. Recorded recovery process IDs: indexer 27936, supervisor 15276. New logs remain build.log/build-errors.log and finish.log/finish-errors.log under .sites-runtime/semantic. Early speed estimates from before this interruption should not be treated as confirmed acceleration; a fresh rate requires sustained embedding after corpus revalidation. No paid service, storage-ceiling change, upload or deployment occurred during recovery.

## Batched cloud upload optimization — 16 October 2026

The original uploader issued 64 separate INSERT requests inside each guarded 64-vector transaction. It now validates all original parent hashes/versions first, then submits one parameterized multi-row INSERT for those same 64 vectors. Batch size, vector precision, index settings, checkpoint verification, before/after storage measurements, projected-growth guard, rollback, 4 GB ceiling and automatic reconnect behavior are unchanged. No concurrency was added and the final data/index footprint is unchanged.

Tests passed with the real local vector engine for exact vector/metadata preservation, a single INSERT request per batch, idempotent replay after committed progress, rejection of oversized batches, and rollback of the entire batch when allocated storage exceeds the ceiling. Existing checkpoint, network retry and storage tests also pass. Test command: node tests/semantic-upload-batch.mjs.

The existing supervisor/uploader was replaced with the tested version, preserving the server-confirmed prefix of 22,784 vectors (more than the last reported 22,528). Recorded new supervisor PID: 4888. At 03:06:31 UTC, upload had reached 24,576 of 285,409 vectors and Turso allocated storage was 871,370,752 bytes. The first 1,792 vectors after the checkpoint took about 76 seconds (23.4 vectors/sec). At that early pace, remaining upload time projects to roughly three hours; this is not a guarantee, because graph insertion cost, connection interruptions and database load can vary. The previous approximately 20-hour estimate used the slower overall pace including interruptions.

All embeddings and the completed local index were retained. No paid service, plan upgrade, feature activation or deployment was performed. Final cloud verification and production hybrid testing remain pending until upload completes.

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


## Grounded explanation depth and inline source popups — 16 October 2026

Deployed/promoted dpl_CJvDWppz32PbAGhqrW7mDprSAoKS to https://lp-insight-ten.vercel.app/. General planning retrieval now searches complementary requirements, functions and application, with baseline-vs-training context for protein. AI paraphrasing remains limited to supplied evidence; functional-style explanations must not invent root causes, diagnostics or mechanisms. Every factual sentence and practical step now ends with clickable inline document numbers matching Sources at the end, ordered by first appearance. Clicking opens the cited passage with exact quote highlighting; grouped passage access is preserved. Fixed ordinary-word name false positives and quote capitalization matching while retaining rejection of altered words, invented numbers and nonliteral excerpts. Plant-based and medical policies remain active.

Exact protein question passed on the public app: four supported sentences, four citations, all original passage fetches and literal quote checks passed. Actual live response also passed popup/numbering DOM checks; deployed renderer hash matches tested code. Diet, sleep and medication harness cases, focused unit checks, TypeScript and cloud build passed. Temporary Gemini per-minute quota interruption and targeted reruns are documented; no exhaustive clinical or fresh visual/browser validation is claimed. Full report: D:/lp-insight/outputs/LP-Insight-explanation-citation-report.md.


## Clarification and useful next steps — 16 October 2026

Deployed/promoted dpl_AZ8EtPwhHb9pkCyUHYRvovnX5hvY (https://lp-insight-cdnwi2quo-cliniclivingplus.vercel.app) to the public app. The exact keto-not-working patient question now asks which outcome is not improving. Replies retain the original intent in retrieval and embeddings. A patient blood-sugar goal without scope/condition gets another clarification, not an assumed diagnosis. General plant-based weight-loss next steps passed live citation checks.

Action answers now require both a direct answer and supported practical steps after filters and whole-request review. One targeted evidence refresh/retry is allowed; remaining gaps return a clear message rather than a risk-only fragment. Clarified requests remain one goal. Added patient causal-inference protection, fixed the Lower/lowering guard false positive, and preserved inline citation/source popups. UI reset, older-card context, multi-stage clarification, request-fit, medical, plant, quote, guard and TypeScript/build tests passed. Final public original-question, weight-loss and blood-sugar-scope tests passed. Earlier provider 503/timeouts, insufficient responses and superseded clinical wording are documented; no clinical correctness or exhaustive case coverage is claimed.

Full report: D:/lp-insight/outputs/LP-Insight-clarification-deployment-report.md. No reindexing, storage-budget change or paid upgrade. Older deployment and test statements below/above are historical snapshots.
