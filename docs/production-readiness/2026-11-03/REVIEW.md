# cash-flow-navigator review

## Scope and verdict

Static review of implementation at `ab1186d42b55f16e097017b6537b75a5089b909c`. Builds, tests, live Supabase, browser and financial calculations were **not run**. The autosave path has an identifiable race and hides failure; financial outputs must not be assumed reliable or persisted until verified.

## Architecture and product boundary

[README:3-15](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/README.md#L3-L15) describes a forecasting dashboard with Monte Carlo, AI narratives, PDF and Supabase saves. The sampled `src/routes/index.tsx` combines scenario state and persistence; `src/server.ts` wraps the TanStack server entry. External Supabase authorization and database policies were not inspected; simulations, AI functions, PDF and generated SQL types were not independently validated.

## Findings ledger

- **CF-1 — High, confirmed static:** [index.tsx:174-186](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/routes/index.tsx#L174-L186) sends `leversRef.current`, awaits the save, then marks the *current* ref as saved and clears dirty state. If the user edits during the request, the server receives the earlier snapshot but the newer edits can be marked clean and not saved. Capture a versioned payload and only clear dirty if it still matches the acknowledged version.
- **CF-2 — Medium, confirmed static:** [index.tsx:185-189](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/routes/index.tsx#L185-L189) catches autosave errors silently. Users lack evidence that their financial changes are not persisted. Surface failure, retain dirty state and permit safe retry.
- **CF-3 — Medium, unverified risk:** [useAuth.ts:14-22](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/hooks/useAuth.ts#L14-L22) subscribes before an asynchronous `getSession()` then unconditionally applies the result. An older hydration result could overwrite a newer event if the provider returns responses out of order. Reproduce with controlled promises and guard stale results if confirmed.
- **CF-4 — High, unverified risk:** [client.server.ts:1-4,22-28](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/integrations/supabase/client.server.ts#L1-L28) explicitly creates an RLS-bypassing service-role client. That is not evidence of misuse: its imports, server-only boundary and authorization must be checked. Prove the key never appears in browser bundles and cross-user access fails.
- **CF-5 — Medium, confirmed static:** [package.json:6-12](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/package.json#L6-L12) defines build and lint but no test script; the snapshot returns no Actions runs. Define behavioral automation rather than treating a build as proof of forecast accuracy.

## Five-discipline assessment

**Code:** save races and error handling are concrete; forecast formulas and Monte Carlo assumptions remain unreviewed. **Automation:** no test script is declared in the sampled manifest; absence of a script does not prove no tests exist elsewhere. **Operations:** releases, RLS migrations, conflict recovery and database restores need observed drills. **Security/OWASP:** the auth middleware validates claims ([auth-middleware.ts:63-75](https://github.com/knarayanareddy/cash-flow-navigator/blob/ab1186d42b55f16e097017b6537b75a5089b909c/src/integrations/supabase/auth-middleware.ts#L63-L75)), but call-site enforcement and ownership are unverified. Review injection, CSRF/session behavior, secrets, dependency lock integrity and financial data retention. **UI/UX:** saving, conflicts, error visibility, keyboard use and accessible chart alternatives require real browser tests. AI forecasts must disclose uncertainty and not imply financial advice.

## Blockers and owner questions

Confirm Supabase project access, RLS and admin-key ownership, retention, deployment platform, model provider and acceptable forecast error. Decide how concurrent edits resolve and who approves financial assumptions. The tracked `.env` was not inspected and must not be assumed secret-free; investigate privately and rotate exposed credentials if applicable.

## Evidence and limitations

Sampled README 1-72, package 1-92, server 1-80, auth hook 1-27, index 1-220/472, auth modal 1-132, auth-attacher 1-15, auth middleware 1-80, server client 1-41 and aspect-ratio component 1-5. The rest of the application and database are outside scope. No historical runs returned; no runtime checks were executed. See [plan](REMEDIATION_PLAN.md).
