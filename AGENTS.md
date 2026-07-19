# Styll Agent Guide

Questo file e la guida operativa root per agenti che lavorano nel repository. `apps/web/AGENTS.md` punta qui.

## Identita del progetto

Styll e un SaaS verticale multi-tenant per barbieri e saloni. Nel repository auditato al 19 luglio 2026 lo stack operativo rilevato e:

- `pnpm` workspace (`pnpm-workspace.yaml`)
- `apps/web`: Next.js `16.2.7`, React `19.2.6`, TypeScript `6`, Tailwind CSS `4`
- Supabase per PostgreSQL, Auth, Storage, Realtime e funzioni server-side
- package condivisi: `packages/shared`, `packages/db`, `packages/emails`
- test con Playwright, `node --test`, SQL integration tests locali
- CI GitHub Actions per security gate e Lighthouse

Architettura generale:

- app web in `apps/web/src/app`, componenti in `apps/web/src/components`
- logica server-side in `apps/web/src/lib/actions` e `apps/web/src/lib`
- area messaging/WhatsApp in `apps/web/src/lib/messaging` e `apps/web/src/app/api/webhooks/meta-whatsapp`
- schema e security posture in `supabase/migrations`
- seed e ambienti locali in `supabase/` e `LOCAL_DEV_SETUP.md`

Aree sensibili:

- autenticazione
- multi-tenancy
- Supabase e RLS
- pagamenti
- calendario e prenotazioni
- WhatsApp e webhook provider
- funzionalita AI
- dati personali, consensi, retention e audit

Documenti da leggere subito, in ordine:

1. [Product Engineering Manifesto](docs/engineering/PRODUCT_ENGINEERING_MANIFESTO.md)
2. [Playbook di esecuzione autonoma](docs/engineering/AUTONOMOUS_EXECUTION_PLAYBOOK.md)
3. [Roadmap WhatsApp AI](docs/engineering/WHATSAPP_AI_IMPLEMENTATION_ROADMAP.md)
4. [Definition of Done](docs/engineering/DEFINITION_OF_DONE.md)
5. [Decision Log Template](docs/engineering/DECISION_LOG_TEMPLATE.md)

## Gerarchia delle fonti

Ordine di autorita:

1. codice e schema correnti
2. test
3. documentazione tecnica aggiornata
4. ADR / decision log
5. roadmap
6. commenti
7. assunzioni

In caso di conflitto:

- prevalgono codice reale e test
- la discrepanza va documentata
- la documentazione va corretta quando possibile

## Regole non negoziabili

- Mai rompere l'isolamento tenant.
- Mai fidarsi di `tenant_id` dal client.
- Mai esporre secret, `SUPABASE_SECRET_KEY`, service-role key o token Meta al browser.
- Mai hardcodare credenziali.
- Mai bypassare RLS senza giustificazione server-side esplicita.
- Mai fare migration distruttive senza strategia di compatibilita e rollback.
- Mai dichiarare successo di un'azione esterna se la persistenza locale non e coerente.
- Mai usare l'LLM come autorita sui dati.
- Mai consentire tool AI generici come SQL arbitrario o URL arbitrari.
- Mai fare deploy in produzione, push su `main` o modifiche distruttive senza autorizzazione esterna esplicita alla sessione.

## Procedura standard di lavoro

Ogni task deve seguire:

1. audit
2. piano
3. implementazione incrementale
4. test
5. lint
6. typecheck
7. revisione diff
8. report finale

## Comandi reali

Installazione:

```bash
pnpm install
```

Dev:

```bash
supabase start
pnpm dev
```

Unit test:

```bash
pnpm test:security:unit
pnpm --filter web test:inbox:unit
```

Test specifici:

```bash
pnpm --filter web exec playwright test tests/realtime-tenant-isolation.spec.ts --project chromium
pnpm --filter web exec node --experimental-strip-types --test tests/unit/meta-whatsapp-signature.test.mjs
```

Lint / typecheck / build:

```bash
pnpm lint
pnpm type-check
pnpm build
```

Supabase locale:

```bash
supabase start
supabase status
supabase db push
supabase migration list
psql postgresql://postgres:postgres@localhost:54322/postgres -f supabase/seed.sql
```

Migration check:

```bash
bash scripts/check-migrations.sh
```

E2E:

```bash
pnpm test:e2e
pnpm test:e2e:ui
pnpm test:e2e:ci
```

## Criteri di stop

L'agente si ferma solo davanti a:

- credenziali mancanti
- autenticazione interattiva
- CAPTCHA o 2FA
- accesso negato a sistemi esterni
- scelta legale o commerciale non determinabile dal repository
- operazione distruttiva irreversibile
- rischio concreto per dati di produzione
- conflitto tra requisiti che richiede decisione di prodotto

Per tutto il resto, scegliere l'opzione piu prudente, documentare l'assunzione e continuare.
