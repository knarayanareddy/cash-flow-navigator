# cash-flow-navigator review

## Scope and verdict

Static review of the implementation snapshot pinned to `ab1186d42b55f16e097017b6537b75a5089b909c`.

- **Stage:** implementation
- **Sampled code/docs:** `README.md`, `package.json`, `src/server.ts`, `src/hooks/useAuth.ts`, `src/routes/index.tsx` (sampled through line 220 only), `src/components/cftm/AuthModal.tsx`, `src/integrations/supabase/auth-attacher.ts`, `src/integrations/supabase/auth-middleware.ts`, `src/integrations/supabase/client.server.ts`, `src/components/ui/aspect-ratio.tsx`
- **Known tree paths not inspected as source bodies:** `src/lib/scenarios.ts`, `src/lib/cashflow.ts`, `src/lib/monteCarlo.ts`, `src/lib/pdfExport.ts`, `src/lib/narrative.functions.ts`, `supabase/config.toml`, `supabase/migrations/*.sql`, `wrangler.jsonc`
- **Runtime:** **NOT RUN** — no install, build, browser session, Supabase access, migration, deployment, or financial-model verification

Verdict: revise before relying on autosave correctness or claiming production readiness. The sampled autosave path has a concrete stale-write risk and silent failure path; broader financial accuracy, deployment safety, privacy posture, and database policy enforcement remain unverified.

## Architecture and product boundary

[README.md:3-15](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/README.md#L3-L15) frames the product as an interactive forecasting dashboard with Monte Carlo simulation, AI narrative generation, PDF export, Supabase auth/autosave, keyboard shortcuts, and offline/cache recovery: "financial scenario builder", "Monte Carlo simulations", "AI-powered narratives", and "Auto-saving, user authentication". The sampled route file is the visible orchestration point: [`src/routes/index.tsx:21-27`](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/routes/index.tsx#L21-L27) imports `upsertScenario`, auth, online status, and Supabase client wiring into the main page. [`src/server.ts:12-18`](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/server.ts#L12-L18) wraps the TanStack server entry.

Important boundary limits:

- `src/lib/scenarios.ts` is present in the snapshot tree (`snapshot.json:108`) and imported by `src/routes/index.tsx`, but its body was not sampled here, so persistence internals were not inspected.
- The tree also contains `wrangler.jsonc`, `supabase/config.toml`, and two migration files (`snapshot.json:121-126`), but those config/database artifacts were not sampled, so this review cannot confirm actual deploy target wiring, migration ordering, restore safety, RLS policy text, or rollback compatibility.
- No sampled file proves the AI narrative, Monte Carlo math, PDF output, or generated Supabase types are correct.

## Findings ledger

- **CF-1 — High, confirmed static:** [`src/routes/index.tsx:177-186`](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/routes/index.tsx#L177-L186) sends the mutable ref payload — `"levers: leversRef.current"` — then, after awaiting the save, records `"lastSavedLevers.current = JSON.stringify(leversRef.current)"` and sets `"dirtyRef.current = false"`. If a user edits between request start and response completion, the server can persist the older snapshot while the UI marks newer edits clean. Impact: financial scenarios can appear saved when the last visible edits were never persisted. Recommended correction: capture an immutable/versioned payload at request start and clear dirty state only when the acknowledged version still matches current UI state.
- **CF-2 — Medium, confirmed static:** [`src/routes/index.tsx:187-189`](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/routes/index.tsx#L187-L189) suppresses errors with `"/* silent autosave failure */"`. Impact: users get no signal that financial changes failed to persist, which is especially risky for planning data. Recommended correction: surface a retryable save error, preserve dirty state, and record a user-visible failure state without leaking sensitive payloads.
- **CF-3 — Medium, unverified risk:** [`src/hooks/useAuth.ts:15-22`](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/hooks/useAuth.ts#L15-L22) first subscribes with `"onAuthStateChange"`, then separately hydrates with `"supabase.auth.getSession().then(...)"`, and both callbacks call `"setState(...)"` unconditionally. Impact: if provider responses arrive out of order, an older hydration result could overwrite a newer auth event. Recommended correction: reproduce with controlled promises; if confirmed, add stale-result guards or monotonic sequencing around auth hydration.
- **CF-4 — High, unverified risk:** [`src/integrations/supabase/client.server.ts:2-4`](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/integrations/supabase/client.server.ts#L2-L4) states `"service role key - bypasses RLS"` and [`src/integrations/supabase/client.server.ts:33-35`](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/integrations/supabase/client.server.ts#L33-L35) warns `"never expose to client code"`. Impact: any accidental client bundling or over-broad server use would bypass row-level security for scenario data. Recommended correction: trace every import/call site, prove server-only boundaries in built artifacts, and verify cross-user reads/writes fail under intended authorization.
- **CF-5 — Medium, confirmed static plus historical CI metadata:** [`package.json:6-12`](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/package.json#L6-L12) shows `"build": "vite build"`, `"lint": "eslint ."`, and no `"test"` script in the sampled manifest. Separately, the captured snapshot metadata records `snapshot.json:200-201` as `"recent_runs": []` and `"runs_error": null`, so this evidence bundle contains no historical Actions runs for the reviewed SHA. Impact: the sampled evidence shows no verified behavioral automation and no captured CI history to lean on. Recommended correction: add behavior-focused tests and CI gates instead of treating build/lint as proof of forecast correctness or persistence safety.

## Five-discipline assessment

- **Correctness / code review:** CF-1 and CF-2 are concrete static defects in the sampled autosave path. Forecast formulas, simulation math, and persistence internals in `src/lib/scenarios.ts` were not inspected.
- **Automation / testing:** the sampled manifest exposes build/lint/format only, not a test entry. That does **not** prove the whole repo lacks tests elsewhere; it does prove this review did not see a verified behavioral test command.
- **DevOps / operations:** the tree shows `wrangler.jsonc` plus Supabase config/migrations, but their bodies were not sampled. Release steps, schema rollout ordering, restore drills, and rollback compatibility remain unobserved.
- **Security / OWASP:** [`src/integrations/supabase/auth-middleware.ts:63-76`](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/integrations/supabase/auth-middleware.ts#L63-L76) validates claims and passes `userId` in middleware context, but call-site authorization, service-role usage, secret handling, retention, and client/server boundary enforcement were not proven. The tracked `.env` file exists in the tree and was not inspected.
- **UI/UX / accessibility:** sampled UI evidence shows an auth modal and autosave status interactions, but no browser verification was performed. Save failure visibility, stale-banner recovery, keyboard workflows, and accessible alternatives for charts/PDF outputs remain to be observed. The app also needs explicit uncertainty/disclaimer handling so AI narrative output is not mistaken for financial advice.

## Production blockers and owner questions

1. Which deployment path is authoritative: Cloudflare via `wrangler.jsonc`, another platform, or multiple targets? The tree suggests Cloudflare/Supabase artifacts exist, but the deployment config bodies were not inspected.
2. Which server functions import `supabaseAdmin` or `upsertScenario`, and are those call sites covered by RLS-safe ownership checks?
3. What is the intended conflict policy for concurrent edits: last-write-wins, version rejection, merge, or explicit user prompt?
4. What forecast error bounds, disclaimer language, and human-review requirements are acceptable before users rely on results?
5. What is the owner-approved policy for key rotation, retention, export/deletion, and backup/restore of saved financial scenarios?

## Evidence inventory and limitations

Personally inspected numbered-source ranges: `README.md:1-72`, `package.json:1-92`, `src/server.ts:1-80`, `src/hooks/useAuth.ts:1-27`, `src/routes/index.tsx:1-220`, `src/components/cftm/AuthModal.tsx:1-132`, `src/integrations/supabase/auth-attacher.ts:1-15`, `src/integrations/supabase/auth-middleware.ts:1-80`, `src/integrations/supabase/client.server.ts:1-41`, and `src/components/ui/aspect-ratio.tsx:1-5`. I also inspected snapshot metadata for tree entries and run metadata at `snapshot.json:16-127,200-201`.

Not run and therefore not evidenced here: installs, builds, tests, browser/UI sessions, Supabase auth, database migrations, RLS checks, cross-user access tests, Pages/deployment verification, backup/restore drills, or financial-model accuracy checks. Presence in the snapshot tree means only that a path existed at the pinned SHA, not that its body was inspected in this review. See [plan](REMEDIATION_PLAN.md).
