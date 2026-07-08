# P2/P3 Minor Audit

**Date:** 2026-07-08  
**Scope:** UX, build/dev warnings, hydration mismatch, local dev issues, testability, route/metadata, copy/error messages, E2E flakiness, minor GDPR/performance signals  
**Constraint:** no code changes in this run

## 1. Executive summary

The current branch still looks **clean on P0/P1**, but there are a handful of **non-critical P2/P3** issues worth tracking.

The most important minor issue is a **P2 dev workflow regression**: a clean `pnpm type-check` can fail because the repo’s TypeScript config depends on **dev-only generated `.next/dev/types` artifacts** that are not guaranteed to exist.

Beyond that, the remaining issues are mostly **P3 quality problems**:

- local Playwright/dev-server churn
- a reproducible hydration warning in dashboard app settings
- a sitemap timeout pattern that can create noisy rejected promises
- an offline retry CTA that sends the user to `/` instead of retrying the tenant route
- one small white-label copy issue in inactive/missing tenant metadata

### Command results for this audit run

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm type-check` | **FAIL** | Clean run fails because `apps/web/tsconfig.json` includes `.next/dev/types/**/*.ts` and those files may be missing. |
| `pnpm build` | **PASS** | Build succeeds; warning about Edge runtime disabling static generation remains visible but was not promoted as a standalone finding. |
| `pnpm test:e2e` | **PASS** | Full suite passed in the final regression execution (`52 passed`). |

## 2. Tabella P2/P3

| ID | Severity | Area | Finding | Evidence |
| --- | --- | --- | --- | --- |
| P2-01 | P2 | Dev workflow / testability | `pnpm type-check` is not reliable from a clean/dev-artifact-free state | `apps/web/tsconfig.json:32-39`, audit command output |
| P3-01 | P3 | Local dev / E2E ergonomics | Playwright local setup deletes `.next/dev` on every run | `apps/web/playwright.config.ts:20-27` |
| P3-02 | P3 | UX / warning / hydration | Dashboard app settings panel renders different host labels on server vs client, causing hydration mismatch noise and rerender | `apps/web/src/components/dashboard/app/AppSettingsClient.tsx:109-145,396-398,479-485,528-537` |
| P3-03 | P3 | Metadata / dev logs | `sitemap.ts` uses a rejecting timeout promise that can reject after the DB query already won | `apps/web/src/app/sitemap.ts:6-18` |
| P3-04 | P3 | Offline UX | Offline fallback “Riprova” CTA always links to `/`, not the tenant route that failed | `apps/web/src/app/tenant/app/[slug]/offline/page.tsx:73-90` |
| P3-05 | P3 | White-label copy | Missing/inactive tenant metadata says “Barbiere non trovato”, which is too specific for a generic white-label product | `apps/web/src/app/tenant/landing/[slug]/layout.tsx:31-35` |

## 3. Evidenza per ogni finding

### P2-01 — `pnpm type-check` non affidabile da stato “clean”

`apps/web/tsconfig.json` include sia `.next/types/**/*.ts` che `.next/dev/types/**/*.ts`:

- `apps/web/tsconfig.json:32-39`

Questo fa dipendere il type-check da file generati da **`next dev`**, non solo da output stabili di build.

Nella run di questo audit, il comando richiesto è fallito proprio così:

- missing `.next/dev/types/cache-life.d.ts`
- missing `.next/dev/types/validator.ts`

Quindi oggi `pnpm type-check` non è autosufficiente in modo pulito.

### P3-01 — Playwright locale distrugge `.next/dev` ad ogni run

La configurazione E2E locale esegue:

- `apps/web/playwright.config.ts:20-27`

In particolare:

```ts
command: `node -e "require('node:fs').rmSync('.next/dev',{ recursive: true, force: true })" && pnpm dev`
```

Questo introduce churn inutile negli artifact dev, rallenta i run locali e peggiora la fragilità del punto precedente (`.next/dev/types`).

### P3-02 — Hydration mismatch nel blocco “La tua app è attiva”

`AppSettingsClient` legge `window.location` solo sul client:

- `apps/web/src/components/dashboard/app/AppSettingsClient.tsx:109-117`
- `apps/web/src/components/dashboard/app/AppSettingsClient.tsx:396-398`

Ma `buildAppPublicUrls()` sceglie un host diverso quando `runtimeLocation` è `null` (SSR) rispetto a quando è `localhost` lato client:

- `apps/web/src/components/dashboard/app/AppSettingsClient.tsx:119-145`
- `apps/web/src/components/dashboard/app/AppSettingsClient.tsx:479-485`

Quel valore finisce direttamente nel markup:

- `apps/web/src/components/dashboard/app/AppSettingsClient.tsx:528-537`

Durante i run E2E la console mostra infatti mismatch del tipo:

- server: `pw-roles-...-app.localhost:3000`
- client: `localhost:3000 · pw-roles-... app`

Effetto: warning React, rerender lato client e rumorosità nei log.

### P3-03 — `sitemap.ts` usa un timeout che può rigettare “in ritardo”

`apps/web/src/app/sitemap.ts:6-18` crea:

```ts
const timeout = new Promise<never>((_, reject) =>
  setTimeout(() => reject(new Error('timeout')), 3000),
)
const result = await Promise.race([query, timeout])
```

Se la query vince, il timer non viene cancellato: il `reject()` può comunque arrivare dopo e sporcare i log/dev tools con rumore non utile.

### P3-04 — Pagina offline: “Riprova” torna sempre a `/`

La CTA della pagina offline è hardcoded:

- `apps/web/src/app/tenant/app/[slug]/offline/page.tsx:73-90`

```tsx
<a href="/">Riprova</a>
```

Questo non ritenta il tenant route/pagina che l’utente stava usando. È un problema di UX piccolo ma concreto per la PWA offline.

### P3-05 — Copy “Barbiere non trovato” troppo specifica

Quando il tenant non esiste o non è attivo, la metadata fallback usa:

- `apps/web/src/app/tenant/landing/[slug]/layout.tsx:31-35`

```ts
title: 'Barbiere non trovato'
```

Per una piattaforma white-label multi-tenant, la copy è troppo verticale e non sempre coerente col tenant brand / business type.

## 4. Impatto

| ID | Impatto |
| --- | --- |
| P2-01 | Rompe uno dei comandi base del repository in condizioni pulite; peggiora CI/dev confidence e onboarding. |
| P3-01 | Aumenta fragilità e lentezza dei run E2E locali; contribuisce alla variabilità degli artifact. |
| P3-02 | Genera warning React e rerender evitabili; il blocco host/app può mostrare informazioni incoerenti tra SSR e client. |
| P3-03 | Rumore nei log/dev console; debugging più difficile su metadata/sitemap. |
| P3-04 | Esperienza offline meno utile: il retry non riporta l’utente al contesto corretto. |
| P3-05 | Piccola incoerenza white-label / metadata copy, non bloccante ma poco rifinita. |

## 5. Fix consigliato

### P2-01
- Rimuovere `.next/dev/types/**/*.ts` dall’`include` principale di `apps/web/tsconfig.json`, oppure spostarlo in una config separata dedicata al dev.
- Obiettivo: `pnpm type-check` deve essere affidabile senza dipendere da `next dev`.

### P3-01
- Togliere la `rmSync('.next/dev', ...)` dal comando Playwright locale oppure proteggerla dietro una flag esplicita (`CLEAN_E2E=1`).

### P3-02
- Evitare che il valore SSR di `appHost/appUrl` dipenda da una branch diversa da quella client.
- Esempi: render placeholder stabile lato server, oppure risolvere l’host in modo coerente prima del mount client.

### P3-03
- Sostituire `Promise.race()` con un timeout cancellabile (`AbortController`, helper con `clearTimeout`) o con una promise che non rigetta dopo che il race è già stato risolto.

### P3-04
- Far puntare “Riprova” alla route tenant corrente o almeno a una destinazione tenant-aware (es. home app del tenant, non `/` globale).

### P3-05
- Usare una copy più neutra e white-label, ad esempio “Salone non trovato” / “Attività non trovata” / “Pagina non disponibile”.

## 6. Priorità suggerita

1. **P2-01** — sistemare prima: impatta direttamente i comandi standard del repo.
2. **P3-02** — ridurre hydration mismatch e warning rumorosi in dashboard.
3. **P3-01** — migliorare stabilità/ergonomia E2E locale.
4. **P3-03** — pulire il comportamento timeout del sitemap.
5. **P3-04** — migliorare il retry offline tenant-aware.
6. **P3-05** — rifinitura copy / white-label.

## 7. Cosa può aspettare

Possono aspettare senza bloccare merge/release:

- P3-04 offline retry UX
- P3-05 copy white-label
- eventuale warning build “Edge runtime disables static generation” fintanto che è una scelta architetturale consapevole e non genera regressioni funzionali

Non dovrebbe aspettare troppo:

- **P2-01**, perché oggi rende il type-check instabile in una run pulita
- **P3-02/P3-01**, perché generano attrito continuo nei workflow dev e test

## 8. Verdict finale

**FAIL (minor issues remain)** — nessun P0/P1 confermato, ma resta almeno un **P2 reale** e diversi **P3** di qualità/dev experience/UX che meritano follow-up.
