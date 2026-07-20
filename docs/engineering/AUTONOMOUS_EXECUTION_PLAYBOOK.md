# Autonomous Execution Playbook

Documento operativo per sessioni lunghe di coding autonomo su Styll. Va letto insieme a [AGENTS.md](../../AGENTS.md), al [Product Engineering Manifesto](PRODUCT_ENGINEERING_MANIFESTO.md), alla [roadmap WhatsApp AI](WHATSAPP_AI_IMPLEMENTATION_ROADMAP.md), alla [Definition of Done](DEFINITION_OF_DONE.md) e al [Decision Log Template](DECISION_LOG_TEMPLATE.md).

## Scopo

Questo playbook trasforma la visione contenuta in `styll-whatsapp-ai-receptionist-research-v2.md` e nei documenti tecnici esistenti in regole operative per agenti che devono lavorare senza fermarsi per decisioni tecniche ordinarie.

Confine intenzionale:

- il manifesto definisce come ragionare
- questo playbook definisce come eseguire
- la Definition of Done definisce come accettare
- la roadmap definisce cosa fare dopo
- il decision log definisce come fissare le scelte non banali

Fonti usate per l'audit:

- codice reale in `apps/web/`, `packages/`, `supabase/`
- `LOCAL_DEV_SETUP.md`
- `docs/07-tecnico/whatsapp-inbox-v1-implementation.md`
- `docs/07-tecnico/architettura.md`
- `styll-whatsapp-ai-receptionist-research-v2.md`
- `.github/workflows/*.yml`

## Audit sintetico del repository

### Stack e convenzioni reali

- Monorepo `pnpm` con workspace `apps/*` e `packages/*`.
- Frontend principale: `apps/web`, Next.js App Router, React 19, TypeScript strict, Tailwind CSS 4.
- Supabase e la sorgente di verita per schema, RLS, realtime e funzioni schedulate.
- La logica multi-tenant lato app passa da server actions, route handlers e client admin Supabase; il browser non deve vedere token sensibili.
- L'area WhatsApp esiste gia in `apps/web/src/lib/messaging`, `apps/web/src/app/api/webhooks/meta-whatsapp`, `apps/web/src/app/api/inbox/conversations/[conversationId]/messages/route.ts`, `apps/web/src/app/admin/tenants/[tenantId]/whatsapp`.

### Struttura utile per audit e implementazione

- UI app: `apps/web/src/app`, `apps/web/src/components`
- server actions: `apps/web/src/lib/actions`
- messaging: `apps/web/src/lib/messaging`
- auth e tenant context: `apps/web/src/lib/supabase`, `apps/web/src/lib/tenant-context`, `apps/web/src/lib/tenant-role-guard.ts`
- test E2E: `apps/web/tests/*.spec.ts`
- test unitari: `apps/web/tests/unit/*.mjs`
- test SQL inbox/RLS: `apps/web/tests/integration/*.sql`
- migration: `supabase/migrations/*.sql`
- seed: `supabase/seed.sql`, `supabase/seeds/*.sql`
- script di controllo: `scripts/check-migrations.sh`, `scripts/check-client-bundle-secrets.sh`, `scripts/secret-scan.sh`

### Policy gia presenti nel repo

- root `AGENTS.md` e `apps/web/AGENTS.md`
- `apps/web/CLAUDE.md`
- script di guardia segreti e migration check
- workflow `security-gate.yml` con typecheck, build, secret scan, migration check e security E2E
- documenti legali e runbook in `docs/legal/`

### Gap documentali colmati da questa cartella

- mancava un playbook root per agenti autonomi
- mancava una roadmap tecnica eseguibile per WhatsApp AI
- mancava una Definition of Done riusabile per webhook, AI, multi-tenancy e booking assistito
- mancava un template decisionale leggero per ADR operative

## Autonomous execution policy

L'agente deve:

- lavorare in autonomia
- non chiedere conferma per decisioni tecniche ordinarie
- fare assunzioni conservative e documentarle
- correggere autonomamente errori di lint, typecheck e test
- ritentare con un approccio diverso se un comando fallisce
- non fermarsi al primo errore
- suddividere attivita grandi in fasi
- mantenere una lista interna di lavoro
- proseguire al task successivo finche resta lavoro utile e sicuro

L'agente non deve chiedere conferma per:

- leggere file
- cercare nel repository
- modificare codice nell'ambito richiesto
- aggiungere test
- aggiornare documentazione
- eseguire lint, typecheck, build e test
- creare file di supporto
- fare refactor locali necessari
- aggiungere validazione
- correggere regressioni introdotte
- usare `curl` verso endpoint pubblici o locali purche non invii segreti e non modifichi produzione
- installare dipendenze solo se indispensabili e solo dopo aver verificato che non esista una soluzione con dipendenze gia presenti

L'agente deve invece fermarsi solo per le condizioni elencate in [AGENTS.md](../../AGENTS.md#criteri-di-stop).

## Sicurezza operativa Git

- Lavorare su branch dedicato quando la sessione consente operazioni Git.
- Non usare `force push`.
- Non riscrivere history.
- Non eliminare branch remoti.
- Non fare commit di `.env`, token o credenziali.
- Non fare push o deploy automaticamente salvo richiesta esplicita.
- Usare commit piccoli e descrittivi solo se la sessione autorizza i commit.
- Non includere modifiche estranee.
- Se il worktree e gia sporco, isolare il proprio delta e non ripulire modifiche altrui.

## Strategia per sessioni lunghe

- Creare una roadmap eseguibile all'inizio della sessione.
- Marcare le attivita completate o bloccate.
- Eseguire checkpoint frequenti dopo ogni blocco significativo.
- Rieseguire i test rilevanti dopo ogni blocco importante.
- Evitare refactor massivi non necessari.
- Non lasciare mai il repository in stato non compilabile se il task richiede codice.
- Preservare sempre una versione funzionante.
- Documentare esplicitamente le parti incomplete, le dipendenze esterne e i follow-up.

Pratica consigliata per Styll:

1. leggere `AGENTS.md`
2. fare audit delle aree toccate
3. aprire la roadmap tecnica del dominio rilevante
4. implementare in slice piccole
5. fermarsi solo ai criteri di stop reali

## Gestione degli errori

Per ogni errore:

1. riprodurre
2. isolare
3. identificare la causa
4. correggere
5. aggiungere test di regressione
6. rieseguire i check rilevanti
7. continuare

Regole esplicite:

- Se un comando fallisce per globbing, path, working directory o quoting, correggere il comando e proseguire.
- Se un test e flaky, ripeterlo, investigare e documentare. Non ignorarlo e non disabilitarlo senza spiegazione.
- Se un provider esterno risponde in modo inconsistente, non dichiarare successo se `messages_log`, `messaging_outbox` o `inbox_messages` non sono coerenti.
- Se la persistenza fallisce dopo un'azione esterna, registrare l'incoerenza, marcare il fallimento e impedire false conferme utente.

## Decision framework

Quando esistono piu soluzioni, scegliere in questo ordine:

1. coerenza con architettura esistente
2. sicurezza
3. isolamento tenant
4. semplicita
5. testabilita
6. osservabilita
7. compatibilita retroattiva
8. performance
9. eleganza

Preferire:

- modifiche locali
- adapter
- funzioni pure
- tipi stretti
- API server-side
- idempotenza
- transazioni
- outbox
- state machine esplicite

Evitare:

- nuove dipendenze non necessarie
- duplicazione
- magic string
- `any`
- side effect nascosti
- query senza tenant scope
- log con PII o secret
- implementazioni "temporanee" non dichiarate

## Protocollo di audit del repository

Prima di modificare una feature:

1. trovare route coinvolte in `apps/web/src/app`
2. trovare componenti chiamanti in `apps/web/src/components`
3. trovare server action o service in `apps/web/src/lib/actions` o `apps/web/src/lib`
4. trovare schema e migration in `supabase/migrations`
5. trovare test E2E, unitari e SQL esistenti
6. trovare tipi in `apps/web/src/types` o `packages/db`
7. trovare env richieste in `.env.example` e `LOCAL_DEV_SETUP.md`
8. trovare documentazione tecnica e legal rilevante
9. verificare permessi, RLS e role guard
10. verificare logging, audit e flussi di errore

Checklist pratica per area WhatsApp:

- route webhook: `apps/web/src/app/api/webhooks/meta-whatsapp/route.ts`
- reply manuale: `apps/web/src/app/api/inbox/conversations/[conversationId]/messages/route.ts`
- adapter/provider/policy: `apps/web/src/lib/messaging/*`
- UI operatore: `apps/web/src/components/dashboard/marketing/tabs/InboxConversazioni.tsx`
- schema: `supabase/migrations/20260717093000_messaging_inbox_foundation.sql`
- test: `apps/web/tests/unit/meta-whatsapp-*.test.mjs`, `apps/web/tests/unit/manual-whatsapp-reply-core.test.mjs`, `apps/web/tests/integration/inbox-*.sql`

## Protocollo di verifica

Per ogni feature:

- unit test
- test di autorizzazione
- test cross-tenant
- error path
- idempotenza
- lint
- typecheck
- build, quando sostenibile
- E2E mirato, se disponibile
- revisione diff finale

Traduzione pratica sul repo:

- unit/security: `pnpm test:security:unit`
- unit/inbox: `pnpm --filter web test:inbox:unit`
- lint: `pnpm lint`
- typecheck: `pnpm type-check`
- build: `pnpm build`
- E2E completo: `pnpm test:e2e`
- E2E mirato: `pnpm --filter web exec playwright test <file> --project chromium`
- migration guard: `bash scripts/check-migrations.sh`
- secret guard post-build: `bash scripts/check-client-bundle-secrets.sh`

Se il repository non fornisce un comando dedicato:

- dichiararlo esplicitamente
- usare il livello piu vicino gia esistente
- non inventare automazioni non supportate

## Regole operative per multi-tenancy, Supabase e AI

### Multi-tenancy

- Ricavare il tenant lato server da contesto, membership o integrazione provider.
- Non usare `tenant_id` client-side come fonte di verita.
- Quando si usa service role, filtrare comunque per `tenant_id`.
- Verificare sempre stato membership: `is_active = true`, `deleted_at is null`.

### Supabase e RLS

- Le migration sono la fonte di verita per schema e policy.
- Le policy RLS sono difesa in profondita, non sostituiscono la logica applicativa.
- Le route server-side con service role devono applicare ownership, role e tenant scope in modo esplicito.
- Nessuna modifica manuale in produzione fuori da migration e runbook autorizzati.

### WhatsApp e webhook

- Verificare challenge e firma quando configurata.
- Usare raw body per la verifica firma.
- Deduplicare ogni evento provider.
- Trattare `messages_log`, `inbox_messages`, `messaging_outbox` e `webhook_events_inbox` come sistema coerente, non come tabelle indipendenti.

### AI

- L'AI non scrive direttamente nel database.
- Le capability AI devono passare da tool tipizzati e allowlist.
- Il contesto deve essere minimo e scoped al tenant.
- Ogni decisione AI rilevante deve poter essere auditata.
- Ogni automatismo deve avere handoff umano, kill switch e policy gate.

## Report finale standard

Ogni sessione deve terminare con:

1. obiettivo
2. cosa e stato implementato
3. file modificati
4. decisioni architetturali
5. sicurezza e autorizzazioni
6. test eseguiti
7. risultati
8. env o passaggi manuali
9. rischi residui
10. prossimo task consigliato

## Limiti e note

- Nel repository auditato non esiste un tool di markdown lint dedicato. Se serve, verificare coerenza Markdown via review manuale e link interni.
- La documentazione cita Vercel come target di deploy e GitHub Actions come CI, ma il playbook non autorizza deploy automatici.
- Per attivita WhatsApp che richiedono Meta/BSP reali, distinguere sempre tra codice locale, simulazione e requisito esterno.
