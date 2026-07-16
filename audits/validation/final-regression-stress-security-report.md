# Final Regression / Stress / Security Validation Report

Date: 2026-07-16

## 1. Commit iniziale
- `eda17b8`
- `git describe --tags --always`: `e2e-stable-2026-07-14-19-geda17b8`

## 2. Branch
- `dev`

## 3. Stato iniziale
- `git status --short` at baseline:
  - `M apps/web/src/components/dashboard/BottomNav.tsx`
- `git diff --name-only` at baseline:
  - `apps/web/src/components/dashboard/BottomNav.tsx`
- `git ls-files --others --exclude-standard` at baseline:
  - none
- `git rev-parse --short HEAD` at baseline:
  - `eda17b8`
- `git log -10 --oneline` at baseline:
  - `eda17b8 Merge pull request #472 from tvwebspecialist/dev`
  - `6e49b82 Dashboard nav and calendar ui v2`
  - `c73b9f5 fix(ci): repair security workflow setup`
  - `8150698 security(ci): add automated security gates`
  - `974aa93 test(security): add targeted unit regression coverage`
  - `ed796df security(api): harden auth, cron, push, and AI endpoints`
  - `1cb6be0 fix(fonts): use system fallback stack temporarily`
  - `febbd63 test: stabilization and production alignment for DPA suite`
  - `90477ef documents: add DPA and sub-processors disclosure`
  - `19d1e64 security(oauth): gate Google signup with legal acceptance`

## 4. Modifiche preesistenti
- `E UI BottomNav`: `apps/web/src/components/dashboard/BottomNav.tsx` was already modified at the start of validation and was not overwritten or committed by this validation pass.
- `D UI calendario`: a transient concurrent diff was observed during validation in `apps/web/src/components/dashboard/calendario/CalendarioSubComponents.tsx`; it disappeared without any intervention from this validation pass.
- `C font`: no tracked font diff was present at validation end, but the runtime font setup still depends on temporary `next/font/google` usage already in the repository state.
- No user changes were reverted.

## 5. Metodologia
- Baseline repository snapshot collected before any edits.
- Environment hygiene checked before suites:
  - listeners on `3000`, `3001`, `3002`
  - `.next/dev`
  - `apps/web/test-results`
  - disk availability
- Static validation executed:
  - `pnpm install --frozen-lockfile`
  - `pnpm test:security:unit`
  - `pnpm type-check`
  - `pnpm build`
  - `bash scripts/secret-scan.sh`
  - `bash scripts/check-client-bundle-secrets.sh`
  - `bash scripts/check-migrations.sh`
  - `git diff --check`
- Workflow audit executed on all `.github/workflows/*.yml`.
- Runtime font and header audit executed against a clean local server on `127.0.0.1:3002`.
- Stress suite executed as a grouped run, then failing candidates were isolated with:
  - single test
  - full file
  - `--repeat-each=10`
- Two final full E2E runs executed separately after classification of prior failures.

## 6. Font audit
- Files reviewed:
  - `apps/web/src/app/layout.tsx`
  - `apps/web/src/app/globals.css`
  - `apps/web/src/lib/security/csp.ts`
  - `apps/web/src/proxy.ts`
  - `apps/web/src/lib/pwa-fonts.ts`
  - `apps/web/src/components/pwa/PwaPreviewShell.tsx`
  - `apps/web/src/components/dashboard/app/AppSettingsClient.tsx`
  - `apps/web/src/app/tenant/app/[slug]/layout.tsx`
- Root fonts currently configured with `next/font/google`:
  - `Outfit`
  - `Poppins`
  - `Inter`
- Official local `.woff2` files for a permanent `next/font/local` migration are still missing from the repository.
- `apps/web/public` does not contain the needed local font binaries.
- Build therefore still depends on network at font-fetch time for `next/font/google`.
- Runtime dashboard font smoke on `/tenant/dashboard/<slug>/calendario`:
  - `document.fonts.status`: `loaded`
  - actual network request observed:
    - `/_next/static/media/1b99372b3eaef0c8-s.p.1gsd1jahc5dg_.woff2`
  - runtime Google font requests observed on that dashboard route:
    - none
  - computed `font-family`:
    - body: `Outfit, "Outfit Fallback", Outfit, ui-sans-serif, system-ui, sans-serif`
    - page title: same as body
    - calendar secondary text: same as body
    - BottomNav label: `Outfit, sans-serif`
  - `document.fonts.check`:
    - `Outfit`: `true`
    - `Poppins`: `false`
    - `Inter`: `false`
- Interpretation:
  - `Outfit` is really loaded and applied on the audited dashboard mobile route.
  - `Poppins` and `Inter` are configured and registered but were not exercised on that route, so they remained unloaded there.
  - `pwa-fonts.ts` and tenant/PWA preview code still support runtime Google-based font selection for some tenant-facing surfaces.
- CSP already allows:
  - `font-src 'self' https://fonts.gstatic.com`
  - `style-src 'self' https://fonts.googleapis.com 'unsafe-inline'`
- No CSP weakening was necessary.
- Font verdict:
  - temporary workaround still in effect
  - not a definitive local-font fix
  - do not treat as production-closed font hardening

## 7. CI audit
- YAML syntax parsed successfully for:
  - `.github/workflows/codeql.yml`
  - `.github/workflows/db-backup.yml`
  - `.github/workflows/lighthouse.yml`
  - `.github/workflows/security-gate.yml`
  - `.github/workflows/storage-backup.yml`
- `codeql.yml` and `security-gate.yml` correctly use:
  - `pnpm/action-setup@v4` before `actions/setup-node@v4`
  - Node `22`
  - `pnpm install --frozen-lockfile`
  - concurrency with `cancel-in-progress: true`
- `CodeQL` permissions include `security-events: write`.
- No `pull_request_target` use was found for untrusted PR code paths.
- No `curl | bash` pattern was found in repository workflows.
- Static audit indicates the prior `Unable to locate executable file: pnpm` workflow failure mode has been addressed.
- `gh` CLI was not available locally, so remote run inspection for CodeQL / Security Gate / Lighthouse could not be executed.

## 8. Security audit
- `pnpm test:security:unit`: passed `12/12`
- `bash scripts/secret-scan.sh`: no tracked high-signal secret found
- `bash scripts/check-client-bundle-secrets.sh`: no server-secret references found in client bundle assets
- `bash scripts/check-migrations.sh`: no changed migrations to lint
- `git diff --check`: clean before report generation
- No verified secret leak, auth bypass, CSP fail-open, or service-role exposure was reproduced in this pass.

## 9. RBAC / tenant isolation
- Code review and E2E evidence show tenant-scoped guards in place for:
  - owner / manager protected dashboard surfaces
  - promotion notify route
  - push subscription ownership
  - privacy request endpoints
  - team owner-management paths
- Stress and targeted tests passed after reruns:
  - `owner-manager-surface-guard`
  - `team-owner-role-guard`
  - `unknown-tenant-no-data-leakage`
  - `tenant-privacy-policy`

## 10. RLS / Storage / Realtime
- Storage/RLS protections exercised successfully by:
  - `portfolio-storage-isolation`
  - `profiles-privileged-fields-rls`
  - `security-definer-rpc-privileges`
- One baseline outside-sandbox full suite produced a single failure in:
  - `tests/realtime-tenant-isolation.spec.ts`
  - `appointments queries stay tenant-scoped and cross-tenant realtime is blocked`
- That failure did not reproduce in:
  - isolated single test
  - full file rerun
  - `--repeat-each=10`
  - both final full-suite passes
- Classification:
  - `C flake` candidate
  - likely race around Realtime event timing, not a confirmed cross-tenant data leak
- No RLS or cross-tenant leakage was proven.

## 11. OAuth / legal acceptance
- Existing tests passed for:
  - email signup gated by terms
  - Google flow gated by server-side legal proof
  - proof consumption and idempotency
  - httpOnly / same-site cookie usage
  - no legal proof token in callback URL
  - DPA versioning and tenant linkage
- Code review of:
  - `apps/web/src/app/api/auth/register/legal-acceptance/route.ts`
  - `apps/web/src/app/api/auth/register/legal-acceptance/consume/route.ts`
  - `apps/web/src/app/auth/callback/route.ts`
  - `apps/web/src/app/tenant/app/[slug]/auth/callback/route.ts`
  found no reproduced fail-open path.

## 12. API / Server Actions
- Route and action spot audit found no reproduced issue in:
  - `apps/web/src/app/api/push/subscribe/route.ts`
  - `apps/web/src/app/api/promotions/[id]/notify/route.ts`
  - privacy export / erasure / requests handlers
  - owner/manager dashboard actions exercised by tests
- No verified IDOR, tenant_id trust bug, or pre-authorization service-role misuse was reproduced.

## 13. CSP / headers
- Production-like runtime check on `http://127.0.0.1:3002/` returned:
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - `x-frame-options: SAMEORIGIN`
  - `content-security-policy: ...`
- E2E `csp-headers.spec.ts` passed in both final full runs.
- No production `unsafe-eval` issue was reproduced.
- `proxy.ts` matcher excludes `_next/static`, so self-hosted font assets are not intercepted.

## 14. Input / upload / CSV
- Existing automated coverage exercised:
  - JSON-LD / stored-XSS style payload neutralization
  - CSV / clienti import scale and merge behavior
  - tenant-privacy / unknown-tenant leakage protections
  - storage isolation
- No dedicated new repo-local automated test for MIME spoof / SVG upload / path traversal was added in this pass.
- Manual review did not prove a new input-validation regression.
- UI audit on preserved mobile changes:
  - `BottomNav` items include `aria-label`
  - mobile nav uses a `90px` high container and non-truncated main labels
  - runtime mobile smoke showed the nav visible and styled correctly on the audited route
  - no proven focus trap, overflow, or contrast regression was reproduced

## 15. Supply chain
- `pnpm outdated --recursive` completed and reported pending updates including:
  - `next 16.2.7 -> 16.2.10`
  - `react 19.2.6 -> 19.2.7`
  - `react-dom 19.2.6 -> 19.2.7`
  - `@supabase/supabase-js 2.106.2 -> 2.110.6`
  - `@sentry/nextjs 10.57.0 -> 10.65.0`
  - `tailwindcss 4.2.4 -> 4.3.2`
  - `typescript 6.0.3 -> 7.0.2`
- No mass upgrade was performed in this validation pass.
- `pnpm audit` failed with upstream tooling response:
  - `ERR_PNPM_AUDIT_BAD_RESPONSE`
  - npm audit endpoint returned HTTP `410`
- Classification:
  - external tooling block
  - audit not counted as passed

## 16. Test security unit
- Result: `PASS`
- Command: `pnpm test:security:unit`
- Outcome: `12 passed, 0 failed`

## 17. Test mirati
- `admin-shadow-cookie-hygiene` isolated after sandbox-only false failure:
  - single test: pass
  - full file: pass
- `owner-manager-surface-guard` isolated after stress-suite failure:
  - single test: pass
  - full file: pass
- `realtime-tenant-isolation` isolated after first full-suite failure:
  - single test: pass
  - full file: pass

## 18. Repeat-each
- `admin-shadow-cookie-hygiene` targeted case:
  - `--repeat-each=10`: `10/10 pass`
- `owner-manager-surface-guard` targeted case:
  - `--repeat-each=10`: `10/10 pass`
- `realtime-tenant-isolation` targeted case:
  - `--repeat-each=10`: `10/10 pass`

## 19. Stress suite
- Grouped stress run executed on:
  - `admin-shadow-cookie-hygiene`
  - `owner-manager-surface-guard`
  - `team-owner-role-guard`
  - `realtime-tenant-isolation`
  - `clienti-stress-scale-pagination`
  - `calendario-stress-scale`
  - `dashboard-home-stress-scale`
  - `vendite-stress-scale`
  - `client-analytics-recompute-stress-scale`
  - `booking-pwa-staff-bounded`
  - `analytics-consent-marketing`
  - `analytics-consent-preferences`
  - `promotion-push-consent`
  - `pwa-email-enumeration`
  - `b2b-register-acceptance`
  - `dpa-acceptance`
  - `consent-audit-trail`
  - `push-vapid-config`
  - `tenant-privacy-policy`
  - `unknown-tenant-no-data-leakage`
- Grouped result:
  - total: `63`
  - passed: `59`
  - failed: `1`
  - did not run: `3`
  - duration: `4.8m`
- Sole failure:
  - `owner-manager-surface-guard`
  - owner-side catalog create flow snapshot showed disabled create button / no categories ready
- That failure did not reproduce after isolation and `repeat-each=10`.

## 20. Type-check
- Result: `PASS`
- Node: `v22.16.0`
- pnpm: `9.0.0`
- `packageManager`: `pnpm@9.0.0`

## 21. Build
- Result: `PASS`
- `pnpm build` completed successfully on the current tree.

## 22. E2E baseline
- First sandbox baseline on 2026-07-15 / 2026-07-16 was not trustworthy:
  - `23 passed`
  - `77 failed`
  - `36 did not run`
  - duration `57.6s`
  - first failure: `getaddrinfo ENOTFOUND <supabase host>`
  - later failure mode: Chromium launch permission error
  - classification: environment / sandbox, not repository regression
- First trustworthy outside-sandbox full-suite baseline on 2026-07-16:
  - `135 passed`
  - `1 failed`
  - duration `7.0m`
  - sole failure: `realtime-tenant-isolation`
  - classification after isolation: non-reproduced flake candidate

## 23. E2E finale run 1
- Command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002 pnpm test:e2e`
- Result: `136 passed`
- Duration: `6.3m`
- Status: `GREEN`

## 24. E2E finale run 2
- Command: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3002 pnpm test:e2e`
- Result: `136 passed`
- Duration: `6.5m`
- Status: `GREEN`

## 25. Finding trovati
- No reproducible application security regression was proven.
- No reproducible RBAC / tenant isolation regression was proven.
- One non-reproduced Realtime failure was observed once during a baseline full suite.
- One non-reproduced owner-manager stress failure was observed once during grouped stress.
- Temporary font workaround remains open:
  - root fonts still depend on `next/font/google`
  - official local `.woff2` assets are still missing
- `F-10` remains open by policy until a real restore drill is executed.
- `F-12` remains open as legal/human follow-up.

## 26. Severità
- Reproducible technical P0/P1: none
- Reproducible technical P2: none
- Non-reproduced flake candidates:
  - low confidence / not counted as open technical vulnerability
- External operational blockers:
  - medium impact on validation completeness for remote tooling only

## 27. Root cause
- Sandbox failures:
  - local environment restrictions on browser launch, DNS access, and local listen permissions
- Realtime baseline failure:
  - likely subscription timing / delivery race in test conditions
  - not reproducible after isolation
- Font limitation:
  - official local font binaries absent from repository
- Remote CI audit limitation:
  - `gh` CLI unavailable locally
- Supply-chain audit limitation:
  - npm audit endpoint retirement (`410`)

## 28. Fix
- No repository code fix was applied.
- Reason:
  - no failure remained reproducible after isolation
  - applying a speculative fix would have violated the validation rules

## 29. File modificati
- Validation pass modified only this report artifact:
  - `audits/validation/final-regression-stress-security-report.md`

## 30. Migration
- No migration changed
- No migration added
- `bash scripts/check-migrations.sh`: no changed migrations to lint

## 31. Commit
- Validation documented with documentation-only commits on `dev`.
- Commit messages used in this validation pass:
  - `docs(audit): record final validation results`
  - `docs(audit): finalize validation report metadata`
  - metadata alignment commit for the final report state

## 32. Push
- Pushed to `origin/dev`
- Report and commit history were pushed after validation completion.

## 33. Working tree finale
- Clean after commit and push

## 34. Blocchi esterni
- Missing official local font files for permanent `next/font/local` migration
- `gh` CLI unavailable, so remote GitHub Actions run inspection could not be executed
- `pnpm audit` blocked by upstream npm audit endpoint retirement (`HTTP 410`)
- Sandbox restrictions prevented trustworthy full-suite validation inside sandbox:
  - Chromium launch permissions
  - local bind permission on `127.0.0.1:3002`
  - Supabase DNS resolution from sandboxed browser/test context
- In-app browser automation capability was unavailable in this session (`agent.browsers.list()` returned no browser)

## 35. Rischi accettati
- Temporary root-font workaround via `next/font/google` is still present and should not be treated as final hardening.
- `F-10` restore-drill finding remains open.
- `F-12` legal/human finding remains open.
- Remote workflow green status could not be confirmed from GitHub because `gh` was unavailable locally.
- `pnpm audit` could not complete because of upstream tooling retirement.

## 36. Verdict
- `READY FOR STAGING`
- Rationale:
  - static gates green
  - build green
  - security unit tests green
  - targeted stress reruns green
  - two separate final full E2E runs green
  - no reproducible technical P0/P1 remains open
- Not `READY FOR PRODUCTION` because:
  - font solution is still a temporary `next/font/google` workaround
  - `F-10` remains open
  - `F-12` remains open
  - remote GitHub Actions status could not be independently confirmed from the repository host
