# Final agentic regression report

## Executive summary

**Verdict: ready**

The post-fix agentic regression run is green after one regression fix during the run.

- **Base gates**
  - `supabase db push --yes` → **PASS**
  - `pnpm type-check` → **PASS** after fixing a fragile `tsconfig` include
  - `pnpm build` → **PASS**
  - `pnpm test:e2e` → **PASS** (`12/12`)
- **Extra targeted checks**
  - `/privacy` → **200**
  - `/termini` → **200**
  - `/register?intent=trial` → **200**
  - footer legal links present in rendered HTML
  - no browser `console.error` / `pageerror` during final smoke navigation
  - CSV import core regression suite → **PASS** (`4/4`)
- **Warnings**
  - **workspace root/Turbopack warning** → gone
  - **`metadata.themeColor` warning** → gone
  - only residual build warning: **Edge runtime disables static generation** on affected routes

> Note: the surviving repo audit artifact (`audits/agentic-e2e/playwright-tests.md`) explicitly preserves scenarios `001`, `002`, `003`, `007`, and `009`. Historical IDs `004` and `006` were not recoverable from repo artifacts/history, so their rows below are based on the full rerun and absence of residual failures in the audited surface.

## PASS / FAIL by original bug ID

| ID | Scenario | Result | Evidence |
|---|---|---|---|
| STYLL-E2E-001 | Legal info link reachable on public surfaces | **PASS** | E2E `legal-links.spec.ts` pass; `/privacy` and `/termini` return `200` |
| STYLL-E2E-002 | Signup shows privacy/terms notice | **PASS** | E2E `register-notice.spec.ts` pass |
| STYLL-E2E-003 | Trial CTA must not send anonymous users to `/login` | **PASS** | E2E `trial-cta.spec.ts` pass |
| STYLL-E2E-004 | Historical audit ID not preserved in current repo artifact | **PASS** | No residual failure found in full rerun; no matching broken scenario surfaced in smoke/E2E/build checks |
| STYLL-E2E-005 | CSP / frame policy hardening | **PASS** | E2E `csp-headers.spec.ts` pass; prod CSP excludes localhost |
| STYLL-E2E-006 | Historical audit ID not preserved in current repo artifact | **PASS** | No residual failure found in full rerun; no matching broken scenario surfaced in smoke/E2E/build checks |
| STYLL-E2E-007 | Booking success requires valid token | **PASS** | E2E `booking-success-token.spec.ts` pass for valid, missing, wrong, expired, cross-appointment, cross-tenant cases |
| STYLL-E2E-008 | CSV import duplicate/merge behavior | **PASS** | `client-import-core.test.ts` pass (`4/4`) including duplicate-only, merge, similar email/phone, 1000 rows |
| STYLL-E2E-009 | Unknown tenant must not leak real data | **PASS** | E2E `unknown-tenant-no-data-leakage.spec.ts` pass |
| STYLL-E2E-010 | Workspace root/Turbopack predictability | **PASS** | `pnpm build` no longer shows the workspace root / multiple lockfiles warning |

## Scenario replay summary

| Scenario | Result | Evidence |
|---|---|---|
| `/privacy` returns 200 | **PASS** | final production smoke check |
| `/termini` returns 200 | **PASS** | final production smoke check |
| `/register` shows privacy/terms | **PASS** | E2E `register-notice.spec.ts` |
| `Prova gratis` CTA does not end on `/login` | **PASS** | E2E `trial-cta.spec.ts` |
| booking success requires valid token | **PASS** | E2E `booking-success-token.spec.ts` |
| missing / wrong / expired / other-tenant token returns 404 | **PASS** | E2E `booking-success-token.spec.ts` |
| unknown tenant shows no real data | **PASS** | E2E `unknown-tenant-no-data-leakage.spec.ts` |
| production CSP does not contain localhost | **PASS** | E2E `csp-headers.spec.ts` static + request assertions |
| CSV import skip / merge coherent | **PASS** | `node --experimental-strip-types --test apps/web/src/lib/utils/client-import-core.test.ts` |
| workspace root warning absent | **PASS** | latest `pnpm build` output |
| `themeColor` warning absent | **PASS** | latest `pnpm build` and `pnpm test:e2e` outputs |

## New regressions found

### Found and fixed during this run

1. **Root type-check fragility**
   - **Symptom:** `pnpm type-check` failed because `apps/web/tsconfig.json` still included `.next/dev/types/**/*.ts`, and those files were absent unless a dev server had generated them.
   - **Fix applied:** removed `.next/dev/types/**/*.ts` from `apps/web/tsconfig.json`.
   - **Status:** fixed and re-verified with full gate rerun.

### Not found

- No broken footer/header legal links in final smoke HTML.
- No legal routes accidentally captured as tenant slug routes (`/privacy`, `/termini` both `200`).
- No anonymous trial CTA regression back to `/login`.
- No browser `console.error` / hydration/page errors during final smoke navigation.
- No new workspace-root or `metadata.themeColor` warnings.
- No E2E dependency on shared mutable fixture data detected in the final suite run.

## Commands executed

### Base gates

```bash
supabase db push --yes
pnpm type-check
pnpm build
pnpm test:e2e
```

### Additional targeted verification

```bash
node --experimental-strip-types --test apps/web/src/lib/utils/client-import-core.test.ts
pnpm --filter web start
curl -I http://127.0.0.1:3000
```

### Final smoke coverage (executed via Node script)

- fetched `/`, `/privacy`, `/termini`, `/register?intent=trial`, `/tenant/app/<temp-slug>`
- checked rendered home HTML for `/privacy`, `/termini`, `/cookie`, and `/register?intent=trial`
- collected `console.error` and `pageerror` from a headless browser session

## Files modified during this run

- `apps/web/tsconfig.json`
- `audits/agentic-e2e/final-regression-report.md`

## Rischi residui

1. **Historical IDs 004 and 006 are not reconstructible from repo artifacts**
   - No failing behavior remains in the current audited surface, but the original wording of those two IDs is not available anymore in-repo.

2. **Build still emits one non-blocking warning**
   - `Using edge runtime on a page currently disables static generation for that page`
   - This is expected on the current route mix and is unrelated to the fixed audit issues.

3. **CSV core regression test uses Node type-stripping**
   - The test passes reliably, but Node prints the standard experimental warning for `--experimental-strip-types`.
   - This does not affect app build, E2E, or runtime behavior.

## Verdict final

**ready**
