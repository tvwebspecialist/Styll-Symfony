# Final Security Regression Report

**Date:** 2026-07-08  
**Scope:** Next.js app, Supabase, RLS, Storage, RPC, Server Actions, Edge Functions, PWA login, email/OTP, admin/shadow mode  
**Mode:** fresh review from current code only, ignoring prior reports

## Verdict

**PASS**

No **confirmed remaining P0/P1** issues were identified in the current application path after re-auditing the codebase and re-running the current E2E security regression suite.

## Method

1. Static review of the current code across:
   - XSS / public browser surface / PWA
   - auth/session / server actions / admin / shadow mode
   - multi-tenant isolation / RLS / Storage / RPC / Edge Functions
2. Cross-check of the current security hardening in code and migrations.
3. Full regression execution of the current Playwright security suite on the branch state under review.

## Scope Result Summary

| Area | Result | Notes |
| --- | --- | --- |
| XSS / public browser surface | PASS | No remaining exploitable P0/P1 XSS sink confirmed. |
| Auth / session / admin / shadow mode | PASS | No remaining server-side authz bypass or admin/shadow escalation confirmed. |
| Multi-tenant isolation / RLS | PASS | Current migrations remove prior broad public reads and replace them with tenant-scoped policies. |
| Storage | PASS | `portfolio` bucket is private and tenant-path scoped. |
| RPC / SECURITY DEFINER | PASS | Sensitive RPCs are revoked from `anon` / `authenticated` and constrained to `service_role` or internal-only use. |
| Edge Functions | PASS | `loyalty-annual-reset` is no longer user-invocable; no currently deployed app path depends on the legacy optional guest-booking function. |
| Email / OTP / PWA login | PASS | Public send flow is throttled and cooled down; public PWA login no longer leaks account existence. |

## Key Controls Re-Verified

### 1. JSON-LD XSS hardening remains in place

- JSON-LD is serialized through a dedicated escaping helper that neutralizes `<`, `>`, `&`, `U+2028`, and `U+2029`, preventing `</script>` breakout and HTML/script injection in the structured-data sink.  
  **Evidence:** `apps/web/src/lib/security/json-ld.ts:1-26`, `apps/web/src/app/tenant/landing/[slug]/layout.tsx:112-132`

### 2. Public PWA email flow is no longer enumerable

- The public email form always sends the same OTP flow first, without a global `profiles` existence check changing the visible UX.  
- The “new client” branch now happens only **after** OTP verification, when the app can safely determine whether a tenant client record must be completed/created.  
  **Evidence:** `apps/web/src/components/pwa/auth/EmailOtpForm.tsx:121-136,183-229,232-257,609-612,694-697,803-817`, `apps/web/src/lib/actions/pwa-auth.ts:356-369,372-507,509-547`

### 3. Public email verification send flow is throttled and no longer rotates OTPs on cooldown

- The public `/api/email-verification/send` route now enforces per-email and per-IP rate limits.  
- The OTP sender now preserves a still-valid token during cooldown, reuses it after cooldown, and no-ops for unknown / already verified addresses instead of acting as a spam relay.  
  **Evidence:** `apps/web/src/app/api/email-verification/send/route.ts:12-102`, `apps/web/src/lib/email-verification.ts:38-169`

### 4. Global loyalty reset is no longer invocable by normal authenticated users

- `loyalty-annual-reset` now runs with `verify_jwt = false` and requires an explicit server-side secret; user JWTs are not sufficient.  
  **Evidence:** `supabase/config.toml:52-53`, `supabase/functions/loyalty-annual-reset/index.ts:14-18,32-45`, `supabase/functions/loyalty-annual-reset/handler.ts:90-121,123-186`

### 5. Admin shadow mode remains actor-bound and validated

- The shadow cookie is `httpOnly`, actor-bound (`actorId:tenantId`), and revalidated against the authenticated user plus `profiles.is_superadmin` before use.  
- Tenant resolution and shadow-profile resolution both re-check the cookie on the server side.  
  **Evidence:** `apps/web/src/lib/admin-shadow-cookie.ts:20-29,75-110`, `apps/web/src/lib/tenant-context.ts:186-205,268-317`

### 6. Public PWA-era broad RLS exposure is removed in current migrations

- The old broad public read policies, including the public appointments slot policy, are explicitly dropped.  
- The current appointment/client/loyalty support reads are tenant- or self-scoped.  
  **Evidence:** `supabase/migrations/20260705000001_tighten_public_pwa_rls.sql:10-24`, `supabase/migrations/20260706193000_harden_booking_pwa_rls_and_realtime.sql:16-44,118-223,237-361`

### 7. Sensitive RPC and Storage paths remain hardened

- Sensitive SECURITY DEFINER RPCs are revoked from `public`, `anon`, and `authenticated`, with only intended helpers remaining callable.  
- `portfolio` storage is private and limited to `tenants/{tenant_id}/...` paths owned by active staff in that tenant.  
  **Evidence:** `supabase/migrations/20260706184500_harden_security_definer_rpcs.sql:53-87`, `supabase/migrations/20260706181000_lock_portfolio_storage_by_tenant.sql:13-113`

## Not Promoted to P0/P1

### Legacy optional `create-guest-booking` Edge Function

I did **not** promote `supabase/functions/create-guest-booking/index.ts` to a live P0/P1 finding for the **current application path**.

Why:

- The repository explicitly documents this function as **optional** and only for **external / non-Next.js** clients.  
  **Evidence:** `docs/test-client-pwa.md:44-50,183-187`
- The function itself says the **Next.js PWA uses Server Actions instead**.  
  **Evidence:** `supabase/functions/create-guest-booking/index.ts:7-11`
- The in-app booking flow goes through the current server action path, not this function.  
  **Evidence:** `apps/web/src/lib/actions/create-booking.ts:80-110,183-239`

So it remains a **latent optional-risk if someone manually deploys/exposes it**, but not a confirmed P0/P1 in the current application path reviewed here.

## Regression Validation

- Full current Playwright suite completed successfully: **52 passed**
- This included current regression coverage for:
  - JSON-LD / XSS
  - loyalty reset authz
  - email verification send protections
  - PWA anti-enumeration
  - booking token isolation
  - notification isolation
  - realtime tenant isolation
  - storage isolation
  - RPC privilege hardening
  - admin/shadow hygiene

## Final Conclusion

On the current branch state, after re-reviewing the application from scratch, I found **no confirmed residual P0/P1 issues** across the requested categories.

**Final verdict: PASS**
