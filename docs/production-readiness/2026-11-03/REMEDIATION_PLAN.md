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
Prerequisite: isolated Supabase fixture and controlled requests; observed `src/routes/index.tsx`, `src/hooks/useAuth.ts`.
1. Capture the submitted payload, pending response, dirty indicator and local edits using synthetic values.
2. Delay an autosave, edit again, complete the older request and inspect both database and UI state.
3. Force a rejected save and interleave auth hydration with a sign-out event; record whether the UI hides or overwrites state.
Deliverable: deterministic regression cases and independently verified baseline. Verification: repeat each interleaving without production financial data.
- [ ] Old acknowledgement cannot be mistaken for the newer edit.
- [ ] Failure and auth ordering are recorded separately.

### CF-T2 — Version saves and expose failure (CF-1, CF-2)
Prerequisite: CF-T1 and owner conflict policy; observed `src/routes/index.tsx` and `src/lib/scenarios.ts`.
1. Capture an immutable payload and version when a save starts; serialize or version concurrent writes.
2. Mark only the acknowledged version saved, preserve newer dirty edits and resolve server conflicts explicitly.
3. Show recoverable failure and retry status without disclosing financial payloads in logs.
Deliverable: reliable save state and conflict handling. Verification: with delayed responses, edits, retries and two sessions, assert final stored values and visible state independently.
- [ ] New edits remain dirty after an older response.
- [ ] Failed saves remain actionable and do not claim success.

### CF-T3 — Verify identity and data protection (CF-3, CF-4)
Prerequisite: CF-T1, approved isolated Supabase project; observed auth and server-client files.
1. Trace every server function, service-role import and RLS policy to an authenticated user and authorized scenario.
2. Guard stale auth hydration if the controlled race reproduces; test sign-out and user switching.
3. Scan artifacts with synthetic canary credentials, inspect `.env` privately, and establish key rotation, data retention and export/deletion policy.
Deliverable: security evidence and corrected trust boundaries. Verification: two users attempt each other's reads/writes, expired tokens and malformed requests; inspect built client artifacts for the canary.
- [ ] Cross-user operations fail at the server/database boundary.
- [ ] No privileged key appears in client artifacts or logs.

### CF-T4 — Forecast, UX and CI gates (CF-5)
Prerequisite: CF-T2 and CF-T3; observed manifest and interface components.
1. Define a proposed test script and independent financial fixtures for deterministic cashflow and seeded simulation edge cases.
2. Add browser scenarios for save failure, conflicts, auth changes, chart alternatives and keyboard navigation.
3. Run existing build and lint scripts in CI alongside new tests and review AI/PDF disclaimers and assumptions.
Deliverable: independent behavior tests and accessible, honest outputs. Verification: intentionally break save versioning and one financial calculation; corresponding tests must fail.
- [ ] Numerical expectations come from independent fixtures, not copied code.
- [ ] Error, accessibility and uncertainty behavior is observed in browser.

### CF-T5 — Release and restore (preventive)
Prerequisite: CF-T4 and owner approval; observed deployment and database integration.
1. Specify release artifact, RLS migration and environment ownership.
2. Back up synthetic scenarios and restore into an isolated project, checking ownership and saved values.
3. Rehearse rollback of app and compatible schema, then obtain independent review.
Deliverable: release checklist and observed recovery record. Verification: compare restored rows and test access using two accounts.
- [ ] Restore and rollback are observed and timed.
- [ ] Owner approves credentials, RLS, assumptions and rollout.

## Production acceptance

- [ ] Save concurrency, calculation fixtures, auth isolation, UX and privacy reviews pass without weakening thresholds.
- [ ] For rollback, stop writes, restore a compatible verified artifact and database snapshot if needed, reconcile pending user changes, then reopen under owner approval.
