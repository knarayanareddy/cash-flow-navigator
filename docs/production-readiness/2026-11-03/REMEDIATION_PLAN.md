# cash-flow-navigator remediation plan

Planned work only. Owner approval is required for production access, financial assumptions, migrations, retention and any credential rotation.

## Phase dependencies

| Phase | Entry | Exit |
|---|---|---|
| Baseline | Synthetic accounts and data | CF-T1 reproduces save ordering and reports |
| Correctness | CF-T1 | CF-T2 resolves CF-1/2 |
| Security | CF-T1 and project access | CF-T3 verifies user isolation and secrets |
| Automation and UX | CF-T2 and CF-T3 | CF-T4 protects forecast, conflict and accessibility paths |
| Operations and acceptance | CF-T4 | CF-T5 observes rollback and restore |

### CF-T1 — Reproduce persistence behavior (CF-1–CF-3)
Prerequisite: isolated Supabase fixture and controlled requests.

- **Observed paths:** `src/routes/index.tsx`, `src/hooks/useAuth.ts`
- **Proposed paths:** none

1. Capture the submitted payload, pending response, dirty indicator and local edits using synthetic values.
2. Delay an autosave, edit again, complete the older request and inspect both database and UI state.
3. Force a rejected save and interleave auth hydration with a sign-out event; record whether the UI hides or overwrites state.
Deliverable: deterministic regression cases and independently verified baseline. Verification: repeat each interleaving without production financial data.
- [ ] Old acknowledgement cannot be mistaken for the newer edit.
- [ ] Failure and auth ordering are recorded separately.

### CF-T2 — Version saves and expose failure (CF-1, CF-2)
Prerequisite: CF-T1 and owner conflict policy.

- **Observed paths:** `src/routes/index.tsx`
- **Proposed path present in tree but not inspected here:** `src/lib/scenarios.ts` (`snapshot.json:108`)

1. Capture an immutable payload and version when a save starts; serialize or version concurrent writes.
2. Mark only the acknowledged version saved, preserve newer dirty edits and resolve server conflicts explicitly.
3. Show recoverable failure and retry status without disclosing financial payloads in logs.
Deliverable: reliable save state and conflict handling. Verification: with delayed responses, edits, retries and two sessions, assert final stored values and visible state independently.
- [ ] New edits remain dirty after an older response.
- [ ] Failed saves remain actionable and do not claim success.

### CF-T3 — Verify identity and data protection (CF-3, CF-4)
Prerequisite: CF-T1 and an approved isolated Supabase project.

- **Observed paths:** `src/hooks/useAuth.ts`, `src/integrations/supabase/auth-attacher.ts`, `src/integrations/supabase/auth-middleware.ts`, `src/integrations/supabase/client.server.ts`
- **Proposed or tree-only paths to inspect during execution:** `src/lib/scenarios.ts`, `supabase/config.toml`, `supabase/migrations/20260520124616_0099dc61-444e-4912-96f5-1509aa888ec2.sql`, `supabase/migrations/20260520124629_5ed72d7c-e7c5-4ff3-8b5e-8d10b2735323.sql`, `.env`

1. Trace every server function, service-role import and RLS policy to an authenticated user and authorized scenario.
2. Guard stale auth hydration if the controlled race reproduces; test sign-out and user switching.
3. Scan artifacts with synthetic canary credentials, inspect `.env` privately, and establish key rotation, data retention and export/deletion policy.
Deliverable: security evidence and corrected trust boundaries. Verification: two users attempt each other's reads/writes, expired tokens and malformed requests; inspect built client artifacts for the canary.
- [ ] Cross-user operations fail at the server/database boundary.
- [ ] No privileged key appears in client artifacts or logs.

### CF-T4 — Forecast, UX and CI gates (CF-5)
Prerequisite: CF-T2 and CF-T3.

- **Observed paths:** `package.json`, `README.md`, `src/routes/index.tsx`, `src/components/cftm/AuthModal.tsx`
- **Proposed paths:** owner-chosen test locations for financial fixtures/browser checks and owner-chosen CI config path (no workflow file body was sampled in this review)

1. Define a proposed test script and independent financial fixtures for deterministic cashflow and seeded simulation edge cases.
2. Add browser scenarios for save failure, conflicts, auth changes, chart alternatives and keyboard navigation.
3. Run the existing observed scripts `build` and `lint` plus the new test command in CI, and review AI/PDF disclaimers and assumptions.
Deliverable: independent behavior tests and accessible, honest outputs. Verification: intentionally break save versioning and one financial calculation; corresponding tests must fail.
- [ ] Numerical expectations come from independent fixtures, not copied code.
- [ ] Error, accessibility and uncertainty behavior is observed in browser.

### CF-T5 — Release and restore (preventive)
Prerequisite: CF-T4 and owner approval.

- **Observed tree metadata only, not inspected bodies:** `wrangler.jsonc`, `supabase/config.toml`, `supabase/migrations/20260520124616_0099dc61-444e-4912-96f5-1509aa888ec2.sql`, `supabase/migrations/20260520124629_5ed72d7c-e7c5-4ff3-8b5e-8d10b2735323.sql`
- **Proposed path:** `docs/runbooks/release-and-restore.md` or equivalent owner-approved runbook location

1. Specify the release artifact, actual deployment target, schema/RLS migration order, and environment ownership instead of inferring them from tree names alone.
2. Back up synthetic scenarios and restore into an isolated project, checking ownership and saved values.
3. Rehearse rollback of app and compatible schema, then obtain independent review.
Deliverable: release checklist and observed recovery record. Verification: compare restored rows and test access using two accounts.
- [ ] Restore and rollback are observed and timed.
- [ ] Owner approves credentials, RLS, assumptions and rollout.

## Task dependency map

| Task | Depends on | Blocks | Notes |
|---|---|---|---|
| CF-T1 | Owner provides isolated fixture data and repro scope | CF-T2, CF-T3 | Baseline for autosave/auth race evidence |
| CF-T2 | CF-T1, owner conflict policy | CF-T4, CF-T5 | Fixes confirmed save-state behavior before broader test automation |
| CF-T3 | CF-T1, isolated Supabase access, owner privacy/key policy | CF-T4, CF-T5 | Security and data-protection proof before release planning |
| CF-T4 | CF-T2, CF-T3 | CF-T5 | Adds independent tests and UX/accessibility gates |
| CF-T5 | CF-T4, owner deployment approval | Production acceptance | Release/restore only after correctness and security evidence exist |

## Changes requiring owner approval

- Access to Supabase projects, `.env`, secrets, and any production-like data
- Final conflict-resolution policy for concurrent scenario edits
- Financial-model assumptions, disclaimer text, and acceptable forecast-error thresholds
- Migration sequencing, retention period, export/deletion policy, and credential rotation timing
- Deployment target, release window, rollback authority, and any downtime/write-freeze decision

## Production acceptance checklist

- [ ] Save concurrency, calculation fixtures, auth isolation, UX and privacy reviews pass without weakening thresholds.
- [ ] A repeatable behavioral test command exists in the manifest and fails when save versioning or one independent financial expectation is intentionally broken.
- [ ] Cross-user reads/writes fail at the intended server/database boundary in an isolated project.
- [ ] Browser verification covers save failure, stale-session/concurrent-edit messaging, keyboard use, and accessible chart/report alternatives.
- [ ] Release artifact, migration order, retention, and restore evidence are documented in an owner-approved runbook.

## Release and rollback policy

1. **Release prerequisites:** do not ship from this plan alone. Require owner approval, a documented deployment target, passing observed `build` and `lint` scripts plus the new behavioral test command from CF-T4, and a synthetic-data restore rehearsal.
2. **Database policy:** because this review saw only tree metadata for `supabase/config.toml` and migration files, treat schema/RLS changes as unverified until their bodies are inspected and a forward/rollback sequence is written down. Do not assume migrations are reversible.
3. **Rollback policy:** for any release touching persistence or auth, stop writes first, restore a compatible app artifact and verified database snapshot if needed, validate ownership with two isolated accounts, reconcile unsaved/pending scenario edits, then reopen under owner approval.
4. **Independent acceptance:** rollback/restore counts only after observed execution in an isolated environment; checklist completion or static docs alone is not enough.
