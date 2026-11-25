# LP Insight research agent

`POST /api/agent` replaces the fixed plan → retrieve → write → check pipeline of `/api/answer` with a tool-calling loop.
The old route is untouched. Add `?classic` to the page address to use it instead of the agent.

## How it works
- `lib/agent.ts`: the loop. The model chooses tools, can search several times, refines queries and reads more context, then answers (max 7 tool rounds, 170 s budget).
- Tools: `search_library` (hybrid keyword + question vector), `search_pubmed`, `search_medlineplus` (plus selected NIH guidance), `read_source` (neighbouring passages).
- Every source seen gets a `[ref]`. The model must cite with `[ref]`; unknown refs are dropped.
- `lib/agent-format.ts`: post-processing. Builds structured blocks, maps each cited sentence to the best matching literal quote (for the click-to-highlight popup), flags figures that are not in the cited passage (⚠), and enforces two hard policies: plant-based-only recommendations and no personal dose or treatment-change statements.
- `app/api/agent/route.ts`: same auth, origin check, usage budgets and saved-chat persistence as `/api/answer`; streams NDJSON events (`status`, `step`, `step_done`, then `final` or `error`).
- `public/agent.js`: streams research steps into the chat, renders the cited answer, follow-up buttons, "Copy answer with sources" and a "How this was researched" trace.

## Settings (server environment)
| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_API_KEY_BACKUP` | Existing keys; both are tried per model |
| `AGENT_MODEL` | Preferred model (default order: `AGENT_MODEL`, `GEMINI_MODEL`, `gemini-flash-lite-latest`, `gemini-flash-latest`). Quota (429) or an unknown model (404) moves to the next one |
| `AGENT_FALLBACK_MODELS` | Comma-separated extra Gemini models |
| `AGENT_BASE_URL`, `AGENT_API_KEY`, `AGENT_COMPAT_MODEL` | Optional OpenAI-compatible fallback provider (Groq, OpenRouter, OpenAI) with tool calling |
| `NCBI_API_KEY` | Optional. PubMed now works without it at a lower rate limit |
| `LP_ANSWER_LIMIT_*` | Shared with `/api/answer` |

One agent question uses about 3 to 6 model calls. Free-tier rate limits are the main constraint; a second key and a fallback model help.

## Tests
- `node --experimental-strip-types tests/agent-format.mjs`: citations, quotes, flags and policy gates.
- `npx tsc --noEmit` and `npx next build`.
