# MedlinePlus keyword search — 19 October 2026

Deployed 19 October 2026: `dpl_H91JWAkt8oZ2oQExNE75HDL4bHKY` at https://lp-insight-ten.vercel.app/. Final live verification is recorded below.

## What changed

- Ask retrieves MedlinePlus health-topic summaries alongside PubMed abstracts, selected NIH excerpts and the private library, using the existing planner's general topic queries. There is no extra AI planning or checking stage.
- Research has a provider selector for PubMed or MedlinePlus. Searching and previewing records never calls `/api/answer` or an AI provider.
- Every returned summary retains the canonical MedlinePlus.gov link, provider attribution, retrieval timestamp and `health_topic_summary` evidence label. Only FullSummary fields are used as answer evidence; snippets without summaries are excluded. External linked pages are not fetched.
- The writer is instructed to explain supported concepts and actions with their reasons, while the independent checker and quote/name/number, plant-based, population and medical safeguards remain. Summaries are educational content, not primary studies or clinical practice guidelines. More sources do not guarantee that a requested treatment is supported.
- Inline citations reuse the exact-quote popup. Saved chats retain metadata and supporting quotes. A cold source lookup searches by stored title and requires the canonical path-derived ID to match; if the record is unavailable or changed, existing saved-quote fallback remains.
- Fixed provider disclosure: a negative source ID alone no longer means PubMed. NIH excerpts, MedlinePlus summaries and PubMed abstracts have distinct labels.

## Retrieval and storage bounds

Server endpoint is fixed to `https://wsearch.nlm.nih.gov/ws/query`, database `healthTopics`, `rettype=brief`, three results per query. At most two planner-derived keyword queries run per question. Generic research suffixes are removed from these terms, without adding diagnoses or patient details. Email addresses, URLs and long numeric identifiers are rejected by the query validator. Queries should remain general scientific terms; names and identifying narratives must not be supplied.

Fixed HTTPS origin, redirect rejection, ten-second network timeout, streamed 700 KB response cap, XML validation, DTD/entity declaration rejection, canonical root-level MedlinePlus HTML page allowlist, duplicate removal, and a 6,000-character summary limit bound handling. Remote text is rendered with textContent, never executable HTML. A reserved hashed numeric namespace distinguishes MedlinePlus sources from library IDs, PubMed PMIDs and selected NIH excerpt IDs.

The existing external-evidence cap stays at four sources / 12,000 characters, within 48,000 total retrieved characters. Round-robin selection preserves representation from available PubMed, MedlinePlus and selected NIH sources. Library-only requests and source-inventory requests skip external lookup. Provider failure leaves other evidence available, with status returned separately.

Memory cache: twelve-hour TTL, at most 64 query entries, at most sixteen pending distinct queries, in-flight deduplication, serialized request spacing, and a 50-request/minute per-process cap. Research API requires sign-in and same-origin POSTs, with eight searches/minute/session per process. These are per-process controls, not a global counter across Vercel instances; NLM may still rate-limit shared-IP traffic. NLM documents 85 requests/minute/IP and recommends 12–24-hour caching: https://medlineplus.gov/about/developers/webservices/.

No bulk import, embeddings, schema change, or Turso cache writes. Existing saved answers still use the existing guarded chat-storage budget. New lookup data only lives in bounded process memory; ordinary future saved answers retain their existing compact metadata/quote storage.

Read-only Turso page allocation before and after: **3,553,603,584 bytes**. Headroom: **446,396,416 bytes below 4 GB**, **1,446,396,416 bytes below the recorded 5 GB free allowance**. The 64 MB saved-chat safety margin and 4 GB ceiling remain unchanged. This is database allocation, not a refreshed organization-wide billing usage reading.

## Configuration

No new API key, subscription or registration is required. `LP_MEDLINEPLUS_ENABLED=false` disables MedlinePlus keyword retrieval; enabled by default. PubMed configuration remains separate. Disabling PubMed does not disable MedlinePlus or selected NIH excerpts.

## Verification

Live service-only check: pancreatitis, bloating and sleep returned canonical health-topic summaries. Cache reuse and cold reopening were checked. The final service-only check used five requests, including cold reopening for pancreatitis and bloating; zero AI calls and zero database writes. `scripts/medlineplus-check.cjs`, proof `.sites-runtime/medlineplus-live-retrieval-proof.json`.

Offline tests: XML mixed/escaped text, invalid/oversized responses, DTD/entity rejection, URL/ID validation, snippet-only exclusion, cache isolation/deduplication, provider failures, source reopening, API auth/origin and bounded blending; actual answer-route fixtures for mixed citations, unsupported-claim rejection, MedlinePlus-only fallback and library-only opt-out. Research provider/preview UI checked with fixtures. Existing PubMed, NIH guidance, clinical follow-up, citations, saved chats, scientific explanation, broad guidance, protocols, short replies, doctor conversation and 31 plant-policy cases passed. Fixtures do not establish live model reasoning or clinical accuracy.

Real headless browser with local fixtures at widths 320, 390, 768 and 1280: provider selector, summary preview, canonical original-source link and layout passed. External requests and AI answers were blocked. Screenshots `.sites-runtime/mobile/medlineplus-*.png`; proof `.sites-runtime/mobile/proof.json`.

Proofs also include `.sites-runtime/medlineplus-answer-offline-proof.json`, `medline-storage-before.json` and `medline-storage-after.json`. No Gemini/OpenAI quota was consumed. Generated clinical answers have not been tested with a live model.


Build verification: npm run build completed successfully, including production compilation and TypeScript, with /api/medlineplus present. This was the local pre-deployment build check; subsequent deployment details are below. No AI calls were made by the build or tests.


## 19 October 2026 — MedlinePlus deployed and live browser verification completed

User authorized deployment and live Research/previews/citation checks without Gemini quota. Initial deployment dpl_DCFwQNDEJjzCd9Lp5z3NXezCocVB passed build, but the live test caught query-dependent inline HTML highlighting adding spaces before punctuation when reopening a summary by title. Corrected XML mixed-text concatenation and HTML conversion: block boundaries become spaces, inline tags are removed without inserting spaces. Added raw and escaped inline-markup regression cases. Unit tests and TypeScript passed; live NLM-only cold reopening for pancreatitis and bloating now produces matching content.

Final production: dpl_H91JWAkt8oZ2oQExNE75HDL4bHKY, https://lp-insight-igqjc0m3g-cliniclivingplus.vercel.app, promoted to https://lp-insight-ten.vercel.app/. Cloud compilation, TypeScript and build passed. Vercel inspect of the public URL confirmed this exact Ready deployment. Served public assets matched local source hashes in the deployment smoke check.

Final live authenticated browser checks passed at 1280px and phone-emulated 390px: MedlinePlus Research provider selection; pancreatitis and bloating searches (three records each); exact source preview title/content; health-topic-summary disclosure; canonical original-source link; source-detail endpoint matches; saved-chat reopening and exact inline citation quote highlighting without snapshot fallback; no page errors or horizontal overflow. Existing PubMed provider switching/search also passed. Screenshots reviewed. The saved citation was explicitly a display-only excerpt fixture, not a generated AI answer or clinical evidence verdict. Browser requests to /api/answer and off-origin providers were blocked, with zero attempts; no Gemini/OpenAI quota was consumed. New generated-answer quality was not evaluated live.

Two temporary accounts across the initial and final runs, their chats and display fixtures were removed; chat budget accounting was restored. Final database allocation: 3,553,607,680 bytes, leaving 446,392,320 bytes below the 4 GB safety ceiling and 1,446,392,320 below the recorded 5 GB allowance. No cache table, migration, bulk import or index was added. Guarded saved-chat margin and free-plan settings remain unchanged.

Proof: .sites-runtime/medlineplus/production-ui-proof.json (passed final run); initial-ui-before-normalization-fix.json (initial incomplete run); live-preview-*.png and live-citation-*.png; .sites-runtime/medlineplus-live-retrieval-proof.json; clinical-deployment-no-ai-proof.json. Live checker: scripts/medlineplus-live-ui.cjs. This section supersedes prior local/not-deployed status.
