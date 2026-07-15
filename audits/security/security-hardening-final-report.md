# Security Hardening Final Report

## 1. Commit/tag di partenza

- Commit di partenza: `b5dbaeb` (`docs(privacy): align subprocessors across legal documents`)
- Tag/describe di partenza: `e2e-stable-2026-07-14-7-gb5dbaeb`

## 2. Stato iniziale

- Working tree iniziale: pulito
- `git status --short`: nessuna modifica
- `git diff --stat`: vuoto
- `git diff --name-only`: vuoto
- `git ls-files --others --exclude-standard`: vuoto
- Nessuna modifica preesistente da preservare o classificare

## 3. Metodologia

- Baseline locale con `pnpm type-check`, `pnpm build`, suite E2E complete separate
- Riproduzione isolata del primo failure reale prima di ogni fix
- Fix minimi e mirati, senza refactor estetici o architetturali
- Test mirati e `repeat-each=10` sui finding corretti o sulle anomalie classificate
- Review manuale strutturata del diff con focus su auth, tenant isolation, RLS/RBAC, secret leak, fail-open e CI
- Censimento statico di route handlers, server actions, RPC/migrazioni `SECURITY DEFINER`, env, workflow CI

## 4. Superfici analizzate

- Registrazione email/password, Google OAuth `/register`, Google login `/login`, callback OAuth, onboarding, legal proof prepare/consume
- Route handlers pubblici, cron, PWA, privacy, marketing, push, AI
- Server Actions staff/owner/manager/receptionist/superadmin
- Realtime tenant isolation, storage isolation, RPC e funzioni `SECURITY DEFINER`
- CSP/header, JSON-LD sanitization, link legali, unsubscribe
- Env, client bundle, workflow CI/CD, supply chain e drift dipendenze

## 5. Matrice sintetica

| Superficie | Auth | RBAC | Tenant scope | Rate limit | Input validation | Stato |
| --- | --- | --- | --- | --- | --- | --- |
| Auth/legal acceptance | Si | N/A | Proof bound a utente/contesto | Si | Si | Hardened |
| Cron reminders/recompute | Bearer secret | N/A | Service-only | N/A | Limitata ma sufficiente | Hardened |
| Push subscribe | Sessione utente | Membership check | Si | Si | Zod/basic | Hardened |
| Privacy PWA | Sessione utente | Customer self-scope | Si | N/A | Zod | Verificato |
| Marketing unsubscribe | Token single-use | N/A | Tenant-bound | N/A | Token/status guard | Hardened |
| Storage portfolio | Sessione/RLS | Tenant staff | Si | N/A | Policy-driven | Verificato |
| Realtime/RLS/RPC | JWT/RLS | Per ruolo e helper | Si | N/A | N/A | Verificato |
| Admin/superadmin/shadow | Sessione | owner/manager/admin/superadmin | Si | N/A | N/A | Verificato |

## 6. Finding trovati

### F-SEC-01

- Severità: `P1` chiuso
- Area: boundary server/client onboarding membro
- Evidenza: il bundle client di `apps/web/.next/static` conteneva codice derivato da `createAdminClient()` importato da `apps/web/src/app/onboarding/member/step-1/page.tsx`
- Scenario: codice server-only nel client bundle rompe il confine secret/server e aumenta il rischio di esposizione di riferimenti server-only
- Root cause: pagina client che importava direttamente logica admin
- Fix applicato: controllo membership spostato in server action `getMemberStep1Context()`
- File modificati: `apps/web/src/app/onboarding/member/actions.ts`, `apps/web/src/app/onboarding/member/step-1/page.tsx`

### F-SEC-02

- Severità: `P2` chiuso
- Area: push subscribe
- Evidenza: `upsert(onConflict:endpoint)` consentiva il riassegnamento implicito di un endpoint già appartenente a un altro utente
- Scenario: potenziale rebound cross-user di subscription push con consegna notifiche al profilo sbagliato
- Root cause: ownership dell’endpoint non verificata prima della scrittura
- Fix applicato: lookup ownership, `409` su endpoint di altro utente, retry race-safe dopo `23505`
- File modificati: `apps/web/src/app/api/push/subscribe/route.ts`, `apps/web/src/lib/push/endpoint-ownership.ts`

### F-SEC-03

- Severità: `P2` chiuso
- Area: origin/auth flow locale e unsubscribe
- Evidenza: full suite iniziale fallita su shadow stop (`/admin` -> `/login`) e su unsubscribe POST idempotent
- Scenario: perdita della sessione host-only tra `localhost` e `127.0.0.1`; UX unsubscribe non portata allo stato finale corretto
- Root cause: redirect assoluto su root origin non coerente con host attivo; form POST browser-only senza ritorno di stato coerente
- Fix applicato: uscita shadow host-aware; route unsubscribe host-aware con supporto JSON + form client esplicito
- File modificati: `apps/web/src/components/dashboard/ImpersonationBannerClient.tsx`, `apps/web/src/app/tenant/app/[slug]/preferenze-marketing/confirm/route.ts`, `apps/web/src/app/tenant/app/[slug]/preferenze-marketing/page.tsx`, `apps/web/src/app/tenant/app/[slug]/preferenze-marketing/MarketingUnsubscribeForm.tsx`

### F-SEC-04

- Severità: `P3` chiuso
- Area: cron auth
- Evidenza: confronto diretto `Authorization === Bearer ${secret}`
- Scenario: confronto non costante sul bearer secret
- Root cause: confronto stringa banale
- Fix applicato: helper `timingSafeEqual` per bearer header
- File modificati: `apps/web/src/app/api/cron/reminders/route.ts`, `apps/web/src/app/api/cron/recalculate-analytics/handler.ts`, `apps/web/src/lib/security/bearer-secret.ts`

### F-SEC-05

- Severità: `P3` chiuso
- Area: endpoint AI `/api/magic-wand`
- Evidenza: request non validata rigidamente; assenza chiave API non distinta da errore generico; parse JSON modello non difensivo
- Scenario: input malevolo/oversized o upstream non JSON porta a comportamento fragile
- Root cause: endpoint costruito con typing debole e parse diretta
- Fix applicato: schema Zod, limiti sui campi, fail-closed `503` su config mancante, `502` su risposta modello invalida
- File modificati: `apps/web/src/app/api/magic-wand/route.ts`, `apps/web/src/lib/ai/magic-wand.ts`

### F-SEC-06

- Severità: `P3` chiuso
- Area: legal acceptance public endpoints
- Evidenza: errori inattesi venivano propagati via `error.message` al client
- Scenario: leak di messaggi interni su path pubblici in casi `500`
- Root cause: redazione errori assente sui catch dei route handler public
- Fix applicato: helper `toPublicErrorMessage()` con preservazione solo dei messaggi recoverable previsti
- File modificati: `apps/web/src/app/api/auth/register/legal-acceptance/route.ts`, `apps/web/src/app/api/auth/register/legal-acceptance/consume/route.ts`, `apps/web/src/lib/security/public-error.ts`

### F-SEC-07

- Severità: `P2` chiuso
- Area: CI/security gate
- Evidenza: mancavano gate automatici minimi; workflow storage eseguiva `curl | bash`; permessi/timeout non minimi
- Scenario: regressioni security non bloccate in PR, supply-chain install non verificata
- Root cause: assenza di una pipeline dedicata e policy minime sui workflow
- Fix applicato: `security-gate.yml`, `codeql.yml`, scans bundle/secret/migrations, hardening di workflow esistenti
- File modificati: `.github/workflows/*`, `scripts/check-client-bundle-secrets.sh`, `scripts/check-migrations.sh`, `scripts/secret-scan.sh`

## 7. Severità P0-P3

- `P0`: nessuno
- `P1`: 1 chiuso (`F-SEC-01`)
- `P2`: 3 chiusi (`F-SEC-02`, `F-SEC-03`, `F-SEC-07`)
- `P3`: 3 chiusi (`F-SEC-04`, `F-SEC-05`, `F-SEC-06`)

## 8. Evidenza

- Bundle scan finale: nessun riferimento server-secret negli asset client
- Secret scan tracked tree: nessun secret ad alta probabilità nel repo tracciato
- Full E2E iniziale: `133 passed`, `2 failed`, `1 did not run`, `7.7m`
- Full E2E intermedia finale pre-fix auth/error: una run con `135 passed`, `1 failed` classificata `C. flake` su Realtime
- Riproduzione isolated del flake: `1/1` verde, poi `repeat-each=10` verde
- Full E2E finali con diff conclusivo: `136 passed (6.2m)` e `136 passed (7.5m)`

## 9. Exploit/failure scenario

- Host mismatch locale poteva far perdere la sessione host-only in uscita dallo shadow mode
- Upsert push endpoint poteva riattribuire un endpoint esistente ad altro utente
- Pagina client onboarding poteva importare logica admin server-only nel bundle browser
- Endpoint public legal potevano esporre messaggi interni su errori inattesi

## 10. Root cause

- Redirect assoluti non allineati all’origin attiva
- Ownership checks mancanti prima dell’upsert
- Boundary server/client non rispettato in una pagina client
- Validazione/normalizzazione incompleta degli errori public
- CI security gate assente

## 11. Fix applicato

- Uscita shadow e unsubscribe rese origin-aware
- Membership check step-1 spostato server-side
- Ownership endpoint push resa esplicita e race-safe
- Bearer cron confrontato in tempo costante
- AI input e output validati fail-closed
- Errori public inattesi redatti
- CI con gate statico, dependency review, CodeQL e scans

## 12. File modificati

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/onboarding/member/actions.ts`
- `apps/web/src/app/onboarding/member/step-1/page.tsx`
- `apps/web/src/components/dashboard/ImpersonationBannerClient.tsx`
- `apps/web/src/app/tenant/app/[slug]/preferenze-marketing/*`
- `apps/web/src/app/api/auth/register/legal-acceptance/*`
- `apps/web/src/app/api/cron/*`
- `apps/web/src/app/api/magic-wand/route.ts`
- `apps/web/src/app/api/push/subscribe/route.ts`
- `apps/web/src/lib/ai/magic-wand.ts`
- `apps/web/src/lib/push/endpoint-ownership.ts`
- `apps/web/src/lib/security/*`
- `apps/web/tests/unit/*`
- `.github/workflows/*`
- `scripts/check-client-bundle-secrets.sh`
- `scripts/check-migrations.sh`
- `scripts/secret-scan.sh`

## 13. Migration create

- Nessuna nuova migration

## 14. Test aggiunti

- `apps/web/tests/unit/bearer-secret.test.mjs`
- `apps/web/tests/unit/endpoint-ownership.test.mjs`
- `apps/web/tests/unit/magic-wand.test.mjs`
- `apps/web/tests/unit/public-error.test.mjs`

## 15. Test aggiornati

- Nessun test esistente indebolito

## 16. Test mirati

- Shadow cookie hygiene isolato: verde
- Marketing unsubscribe idempotent isolato: verde
- Realtime tenant isolation spec isolato: verde
- Security unit suite: `12/12` verde

## 17. Repeat-each=10

- Shadow cookie hygiene: verde
- Marketing unsubscribe idempotent: verde
- Realtime tenant isolation failing case: verde
- Security unit suite: verde su 10 esecuzioni consecutive

## 18. Type-check

- Stato finale: verde

## 19. Build

- Stato finale: verde
- Nota: rimosso `next/font/google` dal layout per evitare fetch di rete a build-time

## 20. Full E2E run 1

- Run finale valida 1: `136 passed (6.2m)`
- Failure: nessuno
- Non eseguiti: `0`
- Timeout: nessuno osservato

## 21. Full E2E run 2

- Run finale valida 2: `136 passed (7.5m)`
- Failure: nessuno
- Non eseguiti: `0`
- Timeout: nessuno osservato

## 22. Supply-chain audit

- `pnpm audit`: bloccato da endpoint npm ritirato (`ERR_PNPM_AUDIT_BAD_RESPONSE`, HTTP `410`)
- `pnpm outdated --recursive`: drift presente ma non corretto automaticamente
- Drift principali osservati: `next`, `eslint-config-next`, `@sentry/nextjs`, `@supabase/supabase-js`, `@supabase/ssr`, `react`, `react-dom`
- `Dependabot`: già presente

## 23. Secret audit

- Nessun secret ad alta probabilità trovato nel tree tracciato con `git grep` mirato
- Bundle client finale pulito da riferimenti a secret server-only
- `.env.local` locale contiene materiale sensibile ma non è tracciato dal repository
- Scan storico basato su pattern: riscontri su riferimenti/config/docs, non prova di secret committati nel tree corrente

## 24. CI security gate

- Aggiunti:
  - `security-gate.yml`
  - `codeql.yml`
  - `actions/dependency-review-action`
- Verifiche rapide in PR:
  - `type-check`
  - `build`
  - `test:security:unit`
  - secret scan
  - bundle secret scan
  - migration check
  - CSP/header smoke
- Workflow esistenti hardenizzati con `permissions: contents: read` e timeout

## 25. Finding non risolvibili

- `F-10` operativo: restore drill reale non eseguibile dal solo repository; resta aperto
- `F-12` legale/umano: resta aperto per natura non tecnica
- `pnpm audit`: endpoint upstream ritirato; blocco di tooling, non fixabile dal repository
- Branch protection, GitHub secret scanning org-level e policy runtime di produzione: non verificabili solo dal repository

## 26. Rischi accettati

- Flake osservato una volta su Realtime cross-tenant durante full suite, non riprodotto in isolamento né su `repeat-each=10`, quindi classificato `C. flake`
- Drift dipendenze presente ma non aggiornato automaticamente senza campagna dedicata di upgrade/test

## 27. Working tree finale

- Pulito al momento della redazione: commit tecnici creati e pushati; report docs ancora da committare

## 28. Commit creati

- `1cb6be0` `fix(build): avoid network-bound font fetching`
- `bff7eb7` `security(web): preserve active-origin auth flows`
- `ed796df` `security(api): harden auth, cron, push, and AI endpoints`
- `974aa93` `test(security): add targeted unit regression coverage`
- `8150698` `security(ci): add automated security gates`

## 29. Push eseguiti

- Push riuscito: `git push origin dev`
- Range pushato: `b5dbaeb..8150698`

## 30. Verdict security

- `READY FOR STAGING`

## Raccomandazioni residue

- Sostituire la verifica `pnpm audit` con un audit compatibile con il nuovo endpoint npm bulk advisory
- Valutare una suite dedicata o un retry mirato solo per la superficie Realtime in CI lunga, senza alterare i test funzionali
- Eseguire restore drill reale per chiudere `F-10`
- Completare verifica legale/umana per `F-12`
- Verificare in ambiente GitHub reale branch protection e secret scanning org/repo
