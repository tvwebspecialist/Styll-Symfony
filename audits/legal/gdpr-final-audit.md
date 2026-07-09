# GDPR & Privacy Compliance Audit — Styll

**Data audit:** 2026-07-09  
**Ambito:** repository `tvwebspecialist/Styll`  
**Modalità:** audit documentale e tecnico del codice; **nessuna modifica codice**, solo report.

---

## 1. Executive summary

### Esito sintetico

**Verdict attuale: FAIL.**  
Styll ha già una base privacy-by-design non banale — isolamento multi-tenant, RLS, opt-out per il churn profiling, banner cookie con opt-in/out analytics, documenti interni DPA/ROPA/LIA/DPIA, retention a 90 giorni per `site_events`, signed URLs per il portfolio — ma **non è ancora pronto per il lancio con clienti reali** dal punto di vista GDPR/privacy.

I blocker principali non sono “mancanze teoriche”: sono **gap concreti tra documentazione pubblica, ruoli privacy, consenso marketing, trasferimenti a terzi e diritti degli interessati**.

### Conteggio findings

| Priorità | Conteggio | Significato operativo |
|---|---:|---|
| **P0** | 4 | rischio legale grave prima del lancio |
| **P1** | 10 | da chiudere prima di clienti reali |
| **P2** | 6 | miglioramenti importanti |
| **P3** | 3 | cleanup/documentazione |

### Punti già buoni

1. **Ruolo processor/controller già compreso architetturalmente** nei documenti interni (`docs/legal/dpa-barbieri.md`, `docs/legal/ropa.md`).
2. **Opt-out profiling churn implementato davvero**, non solo dichiarato (`clients.churn_profiling_objected_at`, funzione di recompute che lo rispetta).
3. **Analytics opzionali già gated dal consenso** lato client per Vercel Analytics, PostHog e first-party site analytics.
4. **Bucket portfolio privato con signed URLs** e policy per-tenant già hardenizzate.
5. **Raw site events con cleanup a 90 giorni** già previsto via funzione DB.

### Punti che bloccano il go-live

1. **I clienti finali vedono i Termini B2B dei barbieri**, non termini consumer/B2C.
2. **Il pacchetto legale pubblico B2B non è finalizzato**: placeholder, revisione legale esplicita, identità legale incompleta.
3. **Non emerge un flusso applicativo che faccia accettare/versionare il DPA** fra Styll e barbiere.
4. **Le push promozionali possono partire senza `marketing_consent`**.

---

## 2. Mappa ruoli privacy

| Flusso | Titolare | Responsabile / Sub-responsabili | Stato attuale |
|---|---|---|---|
| **Account barbiere / dashboard / billing B2B** | **Styll** | Supabase, Vercel, Resend, Sentry, PostHog, Anthropic (per feature AI attive) | Ruolo controller coerente, disclosure incompleta |
| **Clienti finali del barbiere (CRM, prenotazioni, loyalty)** | **Barbiere / tenant** | **Styll** come processor; a valle Supabase, Vercel, Resend, Sentry; potenzialmente PostHog / Anthropic dove attivi | Ruolo corretto in teoria, incompleto in UX e contratti |
| **Marketing site `styll.it` / lead capture** | **Styll** | Supabase, Vercel, PostHog, Vercel Analytics | Consenso analytics presente, governance lead/privacy incompleta |
| **First-party site analytics tenant landing/PWA** | Da chiarire e rendere coerente: oggi documenti oscillano tra **legittimo interesse del barbiere** e **consenso** | Supabase, Vercel, Vercel Analytics, PostHog | Base giuridica/documentazione incoerenti |
| **AI support chat / Magic Wand** | **Styll** (input di barber/staff) | **Anthropic** | Attivo in codice, non dichiarato nei sub-responsabili pubblici |

### Valutazione

La mappa ruoli è **concettualmente giusta**, ma **non è ancora tradotta in modo coerente** nei documenti pubblici, nel flusso di accettazione contrattuale, nelle policy di consenso e nei diritti operativi.

---

## 3. Findings ordinati per priorità

## P0 — rischio legale grave prima del lancio

### F-01 — I clienti finali vedono i Termini B2B dei barbieri

- **Area:** termini / B2C tenant app
- **Requisito GDPR:** trasparenza Art. 12-13 GDPR; informazioni precontrattuali e correttezza B2C; coerenza contrattuale
- **Stato attuale:** il flusso PWA cliente linka `buildRootAppUrl('/termini')`, cioè la pagina **“Termini di Servizio per i barbieri”**. Nel repo **non esiste** una pagina termini B2C tenant-specifica.
- **Rischio:** il cliente finale riceve il documento contrattuale sbagliato; i termini consumer non risultano disponibili prima dell’uso dell’app.
- **Priorità:** **P0**
- **Fix consigliato:** creare termini B2C separati (o tenant-template), linkati dalla PWA e dal flusso OTP cliente; mantenere i ToS B2B solo per i barbieri.
- **File/documenti coinvolti:**
  - `apps/web/src/components/pwa/auth/EmailOtpForm.tsx`
  - `apps/web/src/app/(marketing)/termini/page.tsx`
  - `apps/web/tests/register-notice.spec.ts`
- **Test o controllo da aggiungere:** Playwright che verifichi che il link legale PWA punti a una pagina termini B2C con contenuti consumer (prenotazione, cancellazione, no-show, loyalty, contatti del barbiere).

### F-02 — Pacchetto legale pubblico B2B non finalizzato

- **Area:** privacy policy B2B / ToS B2B / identità legale
- **Requisito GDPR:** Art. 13 GDPR; accountability; chiarezza del titolare
- **Stato attuale:** la pagina `/termini` dichiara esplicitamente “**Documento in fase di revisione legale**” e contiene placeholder economici; la privacy B2B non espone identità legale completa, sede, PEC/P.IVA, eventuale DPO o canale reclamo.
- **Rischio:** set documentale non pronto per contrattualizzare clienti reali; disclosure legale incompleta del titolare.
- **Priorità:** **P0**
- **Fix consigliato:** finalizzare ToS/Privacy B2B con dati legali definitivi, pricing, DPA richiamato, contatti privacy formali e diritti/reclamo.
- **File/documenti coinvolti:**
  - `apps/web/src/app/(marketing)/termini/page.tsx`
  - `apps/web/src/app/(marketing)/privacy/page.tsx`
  - `docs/legal/dpa-barbieri.md`
- **Test o controllo da aggiungere:** check CI/test documentale che blocchi build se compaiono stringhe tipo “placeholder”, “in fase di revisione”, “o forma giuridica scelta”.

### F-03 — DPA Styll↔barbiere non risulta accettato/versionato nel prodotto

- **Area:** ruoli Titolare/Responsabile / DPA / onboarding B2B
- **Requisito GDPR:** Art. 28 GDPR; accountability Art. 5(2)
- **Stato attuale:** il DPA esiste come bozza in `docs/legal/dpa-barbieri.md`, ma nel repo non emerge un flusso applicativo che registri **versione accettata, data, tenant, soggetto accettante**.
- **Rischio:** Styll tratta dati dei clienti finali come processor senza prova contrattuale operativa del DPA per tenant.
- **Priorità:** **P0**
- **Fix consigliato:** integrare il DPA nei ToS B2B o come allegato accettato esplicitamente; salvare `dpa_version`, `accepted_at`, `accepted_by`, `tenant_id`.
- **File/documenti coinvolti:**
  - `docs/legal/dpa-barbieri.md`
  - `apps/web/src/components/auth/register-form.tsx`
  - `apps/web/src/app/(marketing)/termini/page.tsx`
- **Test o controllo da aggiungere:** test end-to-end di onboarding barbiere che verifichi persistenza versione DPA/ToS accettata e possibilità di audit successivo.

### F-04 — Le push promozionali bypassano il consenso marketing

- **Area:** consenso marketing / newsletter-comunicazioni / push
- **Requisito GDPR:** Art. 6(1)(a) GDPR; Art. 130 Codice Privacy / marketing diretto
- **Stato attuale:** `sendPromotionPush()` seleziona tutte le `push_subscriptions` dei profili client del tenant e invia la promozione se `show_in_app = true`, senza gate su `clients.marketing_consent`.
- **Rischio:** invio di comunicazioni promozionali a clienti che non hanno opt-in marketing.
- **Priorità:** **P0**
- **Fix consigliato:** aggiungere gate esplicito su `clients.marketing_consent = true` e, idealmente, consenso separato per canale push/email/SMS.
- **File/documenti coinvolti:**
  - `apps/web/src/lib/push/promotion-push.ts`
  - `apps/web/src/types/database.types.ts` (`clients.marketing_consent`)
  - `apps/web/src/components/pwa/auth/EmailOtpForm.tsx`
  - `apps/web/src/app/tenant/app/[slug]/profilo/preferenze/_components/PreferenzeClient.tsx`
- **Test o controllo da aggiungere:** test che pubblichi una promozione e verifichi che solo i clienti con consenso marketing ricevano push/log entry.

## P1 — da chiudere prima di clienti reali

### F-05 — Consenso marketing/profilazione troppo debole come prova

- **Area:** consenso marketing / profilazione / audit trail
- **Requisito GDPR:** Art. 7 GDPR (prova del consenso); Art. 21 GDPR (opposizione)
- **Stato attuale:** il modello dati espone solo `clients.marketing_consent:boolean` e `clients.churn_profiling_objected_at:timestamp`; non risultano **timestamp iniziale di opt-in, versione del testo, canale, fonte, revoca**.
- **Rischio:** consenso difficile da provare in caso di contestazione; nessuna granularità per email/SMS/push.
- **Priorità:** **P1**
- **Fix consigliato:** introdurre tabella consensi/versioni (`purpose`, `channel`, `status`, `consent_text_version`, `consented_at`, `withdrawn_at`, `source_surface`).
- **File/documenti coinvolti:**
  - `apps/web/src/types/database.types.ts`
  - `apps/web/src/components/pwa/auth/EmailOtpForm.tsx`
  - `apps/web/src/lib/actions/pwa-client-actions.ts`
  - `docs/legal/ropa.md`
- **Test o controllo da aggiungere:** test che verifichi audit trail completo per opt-in, update preferenze e revoca.

### F-06 — Consenso analytics/cookie senza prova server-side e senza centro preferenze

- **Area:** cookie policy / analytics consent
- **Requisito GDPR:** Art. 7 GDPR; Art. 5(3) ePrivacy / Art. 122 Codice Privacy
- **Stato attuale:** lo stato analytics è memorizzato solo in `localStorage` (`styll_cookie_consent_v1`); non c’è prova server-side, versione policy, timestamp o UI persistente per riaprire/revocare la scelta.
- **Rischio:** consenso difficile da dimostrare e revoca non agevole quanto il conferimento.
- **Priorità:** **P1**
- **Fix consigliato:** salvare prova minima del consenso (versione policy + timestamp + origin/surface) e aggiungere un link persistente “Gestisci cookie/analytics”.
- **File/documenti coinvolti:**
  - `apps/web/src/lib/analytics-consent.ts`
  - `apps/web/src/components/shared/CookieBanner.tsx`
  - `apps/web/src/app/(marketing)/cookie/page.tsx`
  - `apps/web/src/app/layout.tsx`
- **Test o controllo da aggiungere:** E2E che verifichi reopen del pannello cookie, revoca, e blocco immediato degli analytics dopo revoca.

### F-07 — Privacy B2C pubblica incompleta o materialmente inaccurata

- **Area:** privacy policy B2C tenant/barbiere
- **Requisito GDPR:** Art. 13 GDPR
- **Stato attuale:** la policy B2C non espone un vero blocco retention, non menziona reclamo al Garante, usa `privacy@styll.it` come canale generico anche per diritti che dovrebbero partire dal Titolare, e non esplicita il linking analytics anonimo→cliente dopo login/prenotazione.
- **Rischio:** informativa incompleta; confusione tra Titolare barbiere e Responsabile Styll.
- **Priorità:** **P1**
- **Fix consigliato:** completare la policy con identità completa del Titolare, retention per categoria, reclamo al Garante, trasferimenti, analytics/AI rilevanti e routing corretto dei diritti.
- **File/documenti coinvolti:**
  - `apps/web/src/app/tenant/app/[slug]/privacy/page.tsx`
  - `apps/web/src/lib/site-analytics/track.ts`
  - `apps/web/src/lib/site-analytics/link-session.ts`
- **Test o controllo da aggiungere:** snapshot/regression test che verifichi presenza di sezioni minime obbligatorie (titolare, finalità, basi, destinatari, trasferimenti, retention, diritti, reclamo).

### F-08 — Diritti degli interessati B2C non operativi

- **Area:** accesso / portabilità / cancellazione / obiezione
- **Requisito GDPR:** Artt. 15, 17, 20, 21 GDPR
- **Stato attuale:** nelle preferenze PWA l’utente trova solo un link `mailto:privacy@styll.it`; non esistono funzioni self-service per export/cancellazione lato cliente finale e la pagina privacy promette percorsi che il prodotto non espone.
- **Rischio:** esercizio diritti delegato a canale manuale ambiguo; mismatch tra promessa e implementazione.
- **Priorità:** **P1**
- **Fix consigliato:** implementare almeno un flusso assistito chiaro (export richiesta/cancellazione richiesta) con routing al barbiere titolare + supporto Styll come processor.
- **File/documenti coinvolti:**
  - `apps/web/src/app/tenant/app/[slug]/profilo/preferenze/_components/PreferenzeClient.tsx`
  - `apps/web/src/lib/actions/pwa-client-actions.ts`
  - `apps/web/src/app/tenant/app/[slug]/privacy/page.tsx`
- **Test o controllo da aggiungere:** E2E per richiesta export/cancellazione B2C e verifica del tenant routing corretto.

### F-09 — Export/cancellazione B2B incompleti o fuorvianti

- **Area:** diritto all’oblio / esportazione dati / retention
- **Requisito GDPR:** Artt. 15, 17, 20 GDPR; minimizzazione e limitazione della conservazione
- **Stato attuale:** `exportUserData()` esporta solo profilo, appuntamenti e portfolio (limite 500 righe); `deleteAccount()` non elimina l’utente auth, non soft-deleta i `clients` collegati, non separa chiaramente i dati da conservare per obbligo legale da quelli CRM da eliminare.
- **Rischio:** portabilità parziale; cancellazione incompleta; policy e UI più ampie della realtà.
- **Priorità:** **P1**
- **Fix consigliato:** separare export B2B account vs export tenant; definire e implementare workflow di erasure con segregazione fiscale/documentale e vera chiusura account.
- **File/documenti coinvolti:**
  - `apps/web/src/components/dashboard/profilo/sections/PrivacySicurezza.tsx`
  - `apps/web/src/lib/actions/profilo.ts`
  - `docs/legal/dpa-barbieri.md`
- **Test o controllo da aggiungere:** integration test che verifichi export completo previsto e cancellazione effettiva/segregata di profilo, client linkage, storage e sessioni.

### F-10 — Disclosure sub-responsabili e trasferimenti incompleta/inaccurata

- **Area:** sub-responsabili / trasferimenti extra UE
- **Requisito GDPR:** Artt. 13(1)(e)-(f), 28, 44-46 GDPR
- **Stato attuale:** la pagina pubblica elenca solo Supabase/Vercel/Resend/Sentry; **PostHog** e **Anthropic** non compaiono pur essendo usati in codice. Inoltre Supabase è dichiarato “**nessun trasferimento extra-UE**”, mentre il documento interno di approfondimento segnala possibili sub-processing USA/Singapore.
- **Rischio:** disclosure trasferimenti non affidabile; lista sub-responsabili incompleta.
- **Priorità:** **P1**
- **Fix consigliato:** aggiornare la pagina pubblica e le policy includendo tutti i processor attivi, ruolo, regione, meccanismo di trasferimento, e chiarendo il caso Supabase.
- **File/documenti coinvolti:**
  - `apps/web/src/app/(marketing)/sub-processor/page.tsx`
  - `apps/web/src/components/marketing/PostHogProvider.tsx`
  - `apps/web/src/app/api/aiuto-chat/route.ts`
  - `apps/web/src/app/api/magic-wand/route.ts`
  - `gdpr-approfondimento-implementazione.md`
- **Test o controllo da aggiungere:** checklist automatica “processor inventory vs active integrations” nel processo di release.

### F-11 — Sentry Replay attivo su superfici non-PWA senza disclosure specifica

- **Area:** monitoring / error tracking / technical logs
- **Requisito GDPR:** Art. 13 GDPR; valutazione ePrivacy/GDPR per strumenti di replay/monitoring
- **Stato attuale:** `instrumentation-client.ts` abilita `Sentry.replayIntegration()` su tutte le superfici non `/tenant/app/*` in produzione, con session replay sample rate e on-error replay, mentre le pagine pubbliche parlano genericamente di “error tracking”.
- **Rischio:** monitoring più invasivo di quanto descritto pubblicamente; possibile mismatch tra base giuridica e reale telemetria.
- **Priorità:** **P1**
- **Fix consigliato:** decidere base giuridica e perimetro; aggiornare privacy/sub-processors; valutare disable replay fino a disclosure/assessment completati.
- **File/documenti coinvolti:**
  - `apps/web/instrumentation-client.ts`
  - `apps/web/src/app/(marketing)/privacy/page.tsx`
  - `apps/web/src/app/(marketing)/sub-processor/page.tsx`
- **Test o controllo da aggiungere:** controllo build che vieti replay attivo senza flag/config e disclosure documentale corrispondente.

### F-12 — Email marketing senza link di opt-out / manage-preferences

- **Area:** newsletter / comunicazioni marketing
- **Requisito GDPR:** Art. 7(3) GDPR; Art. 130 Codice Privacy; principio di revoca semplice
- **Stato attuale:** `sendCampaign()` filtra `marketing_consent = true`, ma `sendTemplatedEmail()` non inserisce un link di unsubscribe o gestione preferenze nelle email promozionali.
- **Rischio:** opt-out poco agevole, soprattutto per i clienti email-only senza PWA attiva.
- **Priorità:** **P1**
- **Fix consigliato:** aggiungere footer per unsubscribe/manage preferences nelle email promozionali; distinguere chiaramente email transazionali vs marketing.
- **File/documenti coinvolti:**
  - `apps/web/src/lib/actions/send-campaign.ts`
  - `apps/web/src/lib/email.ts`
  - `apps/web/src/app/tenant/app/[slug]/profilo/preferenze/_components/PreferenzeClient.tsx`
- **Test o controllo da aggiungere:** test email template che fallisca se una campagna marketing non include un percorso di opt-out.

### F-13 — OTP email con token in chiaro e retention non definita

- **Area:** email OTP / security measures / retention
- **Requisito GDPR:** Art. 5(1)(e), Art. 32 GDPR
- **Stato attuale:** `email_verification_tokens.code` è salvato in chiaro; non emerge nel repo alcun cleanup schedulato della tabella.
- **Rischio:** conservazione non necessaria di email + codici OTP; ridotta robustezza in caso di accesso improprio al DB.
- **Priorità:** **P1**
- **Fix consigliato:** hashare i codici OTP, introdurre cleanup automatico dei token scaduti/usati e documentarne la retention.
- **File/documenti coinvolti:**
  - `supabase/migrations/20260619000001_email_verification.sql`
  - `apps/web/src/lib/email-verification.ts`
  - `apps/web/src/lib/actions/email-verification.ts`
- **Test o controllo da aggiungere:** test DB/cron che verifichi purge dei token scaduti e assenza di codice in chiaro nei log/query path.

### F-14 — Procedura data breach non operativa

- **Area:** breach process / processo operativo
- **Requisito GDPR:** Artt. 33-34 GDPR
- **Stato attuale:** il DPA e i documenti strategici citano la notifica entro 72h, ma nel repo non emerge un runbook operativo con ruoli, escalation, triage, decisione su notifica al Garante e template comunicativi.
- **Rischio:** in caso di incidente reale, risposta non coordinata e tempi difficili da rispettare/provare.
- **Priorità:** **P1**
- **Fix consigliato:** creare runbook incident/data breach con owner, backup owner, canali, checklist 24h/72h, criteri di severità, registro incidenti e template di notifica.
- **File/documenti coinvolti:**
  - `docs/legal/dpa-barbieri.md`
  - `docs/08-strategia/legal-compliance.md`
- **Test o controllo da aggiungere:** tabletop exercise trimestrale e checklist firmata post-esercitazione.

### F-15 — Retention frammentata su analytics, lead e log tecnici

- **Area:** retention / audit log / analytics / lead capture
- **Requisito GDPR:** Art. 5(1)(e) GDPR
- **Stato attuale:** esiste purge a 90 giorni solo per `site_events`; non emerge retention operativa per `site_sessions`, `platform_leads`, `client_import_jobs`, `admin_audit_log` o altri log che possono contenere PII/metadata.
- **Rischio:** conservazione indefinita non giustificata di identificativi, referrer, email lead, error payload e metadata amministrativi.
- **Priorità:** **P1**
- **Fix consigliato:** definire retention matrix per tabella e automatizzare cleanup/archive; minimizzare PII in log applicativi e job error payload.
- **File/documenti coinvolti:**
  - `supabase/migrations/20260704000001_site_analytics.sql`
  - `supabase/migrations/20260601000001_client_import_jobs.sql`
  - `apps/web/src/lib/actions/platform-leads.ts`
  - `apps/web/src/app/admin/actions-system.ts`
  - `apps/web/src/lib/utils/client-import-core.ts`
- **Test o controllo da aggiungere:** SQL smoke test che verifichi cleanup su scadenze retention per ogni tabella sensibile.

## P2 — miglioramenti importanti

### F-16 — AI governance incompleta per Anthropic

- **Area:** AI / support chat / content generation
- **Requisito GDPR:** Art. 13 GDPR; Art. 28/44-46 GDPR se processor/transfer; privacy by design
- **Stato attuale:** `aiuto-chat` e `magic-wand` inviano contenuti di supporto/business context ad Anthropic; il vendor non è dichiarato nei sub-responsabili pubblici e non emerge un perimetro d’uso/documento di minimizzazione degli input.
- **Rischio:** trasferimento a terzo non documentato; rischio che staff/barbieri inseriscano PII cliente in prompt liberi.
- **Priorità:** **P2**
- **Fix consigliato:** documentare Anthropic come processor attivo, limitare i prompt a dati non personali ove possibile, aggiungere guardrail UI/testuali “non incollare dati cliente”.
- **File/documenti coinvolti:**
  - `apps/web/src/app/api/aiuto-chat/route.ts`
  - `apps/web/src/app/api/magic-wand/route.ts`
  - `apps/web/src/app/(marketing)/sub-processor/page.tsx`
- **Test o controllo da aggiungere:** red-team prompt test + privacy review checklist per ogni feature AI.

### F-17 — Basi giuridiche non sempre coerenti tra documenti e implementazione

- **Area:** documentazione legale / analytics / loyalty / churn
- **Requisito GDPR:** Art. 5(1)(a) trasparenza; accountability
- **Stato attuale:** documenti interni e pagine pubbliche non sono sempre allineati: esempi tipici sono loyalty (consenso vs contratto), site analytics (legittimo interesse in ROPA vs consenso nel codice/UI), e alcune note sulla cookie UX.
- **Rischio:** narrativa legale incoerente tra public docs, internal docs e implementazione.
- **Priorità:** **P2**
- **Fix consigliato:** nominare una “source of truth” legale e allineare privacy pages, ROPA, DPA, cookie policy, help copy e UX consent.
- **File/documenti coinvolti:**
  - `docs/legal/ropa.md`
  - `docs/08-strategia/legal-compliance.md`
  - `apps/web/src/app/(marketing)/cookie/page.tsx`
  - `apps/web/src/app/tenant/app/[slug]/privacy/page.tsx`
- **Test o controllo da aggiungere:** checklist redazionale pre-release con owner legale/prodotto.

### F-18 — Misure di sicurezza importanti ma non pienamente enforce

- **Area:** security measures / technical safeguards
- **Requisito GDPR:** Art. 32 GDPR
- **Stato attuale:** esistono header di sicurezza, rate limiting e setting admin, ma: 2FA/session timeout sono solo impostazioni salvabili, il rate limiting è in-memory per singola istanza, la CSP usa ancora `'unsafe-inline'`.
- **Rischio:** postura security migliore del baseline, ma non ancora matura per accountability “production-grade”.
- **Priorità:** **P2**
- **Fix consigliato:** enforcement reale 2FA superadmin, timeout sessioni, rate limiting condiviso (Redis/DB), piano di hardening CSP con nonce/hash.
- **File/documenti coinvolti:**
  - `apps/web/src/app/admin/settings/settings-client.tsx`
  - `apps/web/src/lib/rate-limit.ts`
  - `apps/web/src/app/api/site-analytics/track/route.ts`
  - `apps/web/src/lib/security/csp.ts`
- **Test o controllo da aggiungere:** security regression tests per 2FA enforcement, CSP scanner, distributed RL smoke test.

### F-19 — Auditability parziale e non immutabile sui flussi privacy

- **Area:** audit log / accountability
- **Requisito GDPR:** Art. 5(2) accountability
- **Stato attuale:** `admin_audit_log` copre azioni admin e alcune shadow actions, ma il logging è “best-effort”, non esteso ai consensi, alle richieste diritti, alle revoche o alle azioni privacy tenant-side.
- **Rischio:** prova incompleta in caso di contestazione o ispezione.
- **Priorità:** **P2**
- **Fix consigliato:** audit trail dedicato per consensi, revoche, DSR, subprocessor notice, export ed erasure con retention separata.
- **File/documenti coinvolti:**
  - `apps/web/src/app/admin/actions-system.ts`
  - `apps/web/src/app/admin/tenants/[tenantId]/audit/page.tsx`
  - `apps/web/src/lib/actions/profilo.ts`
- **Test o controllo da aggiungere:** integration tests che verifichino emissione log per eventi privacy critici.

### F-20 — Backup/restore e DR solo pianificati, non operativizzati

- **Area:** backup / disaster recovery / business continuity
- **Requisito GDPR:** Art. 32(1)(b)-(c) GDPR
- **Stato attuale:** il repository contiene solo documentazione/assunzioni su backup giornalieri e PITR; non emerge un runbook di restore né una verifica periodica documentata del ripristino.
- **Rischio:** misura dichiarata ma non dimostrabile operativamente.
- **Priorità:** **P2**
- **Fix consigliato:** definire RPO/RTO, owner, storage dei backup, procedura di restore testata e cadenza di verification.
- **File/documenti coinvolti:**
  - `docs/08-strategia/legal-compliance.md`
  - `docs/08-strategia/analisi-strategica.md`
  - `LOCAL_DEV_SETUP.md`
- **Test o controllo da aggiungere:** restore drill semestrale con verbale e tempo effettivo di recovery.

### F-21 — Gestione minori assente

- **Area:** minori / clienti finali
- **Requisito GDPR:** Art. 8 GDPR (servizi della società dell’informazione ai minori) + trasparenza
- **Stato attuale:** nelle policy e nei flussi PWA non c’è alcuna posizione esplicita su minori, genitori/tutori o uso dell’app per clienti under 14/18.
- **Rischio:** in un settore dove le prenotazioni di minori sono realistiche, manca il perimetro operativo/legale.
- **Priorità:** **P2**
- **Fix consigliato:** definire policy semplice: servizio destinato a maggiorenni o a genitore/tutore per conto del minore; adeguare privacy B2C e FAQ.
- **File/documenti coinvolti:**
  - `apps/web/src/app/tenant/app/[slug]/privacy/page.tsx`
  - `apps/web/src/components/pwa/auth/EmailOtpForm.tsx`
- **Test o controllo da aggiungere:** review legale + content QA sulle superfici B2C.

## P3 — cleanup / documentazione

### F-22 — Identità legale e contatti non coerenti

- **Area:** documenti pubblici / titolare / contatti
- **Requisito GDPR:** Art. 13(1)(a)-(b) GDPR
- **Stato attuale:** i documenti alternano “Styll”, “Styll S.r.l.” e “Tommaso Vezzaro”; non emergono in modo coerente sede legale, P.IVA, PEC, contatto privacy ufficiale.
- **Rischio:** percezione di scarsa affidabilità e disclosure formale incompleta.
- **Priorità:** **P3**
- **Fix consigliato:** uniformare la legal entity e i contatti su tutte le pagine pubbliche e documenti contrattuali.
- **File/documenti coinvolti:**
  - `apps/web/src/app/(marketing)/privacy/page.tsx`
  - `apps/web/src/app/(marketing)/sub-processor/page.tsx`
  - `docs/legal/dpa-barbieri.md`
  - `docs/08-strategia/legal-compliance.md`
- **Test o controllo da aggiungere:** controllo documentale automatico su stringhe di legal entity.

### F-23 — Promessa di preavviso 30 giorni ai sub-responsabili senza meccanismo operativo

- **Area:** sub-responsabili / processo operativo
- **Requisito GDPR:** Art. 28 GDPR; trasparenza verso il titolare cliente
- **Stato attuale:** la pagina sub-processor promette 30 giorni di preavviso e possibilità di opposizione, ma il repo non mostra un workflow di notifica/acknowledgment.
- **Rischio:** promessa pubblica non supportata da processo verificabile.
- **Priorità:** **P3**
- **Fix consigliato:** definire runbook semplice: aggiornamento lista, email ai tenant, log di invio, finestra opposizione, owner.
- **File/documenti coinvolti:**
  - `apps/web/src/app/(marketing)/sub-processor/page.tsx`
- **Test o controllo da aggiungere:** checklist release vendor-change obbligatoria.

### F-24 — Inventario storage/privacy da rifinire

- **Area:** storage file / documentazione sicurezza
- **Requisito GDPR:** Art. 13 GDPR; privacy by design
- **Stato attuale:** il repo contiene bucket con modelli diversi (avatar pubblici, portfolio privato con signed URLs, altri asset brand/prodotti via public URLs); la distinzione non è spiegata in modo esplicito nelle policy o nel materiale operativo.
- **Rischio:** inventario incompleto dei file con dati/asset e relativa esposizione.
- **Priorità:** **P3**
- **Fix consigliato:** mappare bucket, natura del dato, accesso pubblico/privato, retention e owner di ciascun bucket.
- **File/documenti coinvolti:**
  - `supabase/migrations/20260425000003_avatars_storage.sql`
  - `supabase/migrations/20260706181000_lock_portfolio_storage_by_tenant.sql`
  - `apps/web/src/lib/portfolio-storage.ts`
  - `apps/web/src/lib/actions/profilo.ts`
- **Test o controllo da aggiungere:** bucket inventory review in onboarding infrastrutturale.

---

## 4. Gap documentali

### Pubblici

1. **Termini B2C mancanti**; i clienti finali ricevono i ToS B2B.
2. **ToS B2B ancora in bozza** con placeholder e revisione legale esplicita.
3. **Privacy B2B senza anagrafica legale completa** del titolare.
4. **Privacy B2C incompleta** su retention, reclamo al Garante, trasferimenti, analytics/AI, routing richieste al barbiere.
5. **Sub-processor list incompleta** e in parte inaccurata (missing Anthropic/PostHog; Supabase “EU only” non allineato alla TIA interna).
6. **Cookie policy e privacy B2C non perfettamente coerenti** sulla presenza di analytics/tracking opzionali.

### Interni

1. DPA/ROPA/LIA/DPIA esistono, ma restano **bozze interne** non ancora agganciate a processi/versioni operative.
2. Nessun **runbook breach**, **retention matrix operativa** o **restore runbook** nel repo.

---

## 5. Gap tecnici

1. **Promotional push senza consenso marketing** (`sendPromotionPush`).
2. **Consenso marketing ridotto a un solo boolean** (`clients.marketing_consent`), non channel-specific e senza prova storica.
3. **Consenso analytics solo localStorage**, senza prova/versioning e senza UI di revoca persistente.
4. **Sentry Replay attivo** fuori PWA senza disclosure specifica.
5. **Anthropic attivo** su support chat e Magic Wand senza disclosure pubblica.
6. **OTP email B2B** in chiaro e senza purge.
7. **Retention incompleta** per `site_sessions`, lead, import jobs, audit log.
8. **Delete account B2B parziale**; **DSR B2C non implementati**.
9. **2FA/session timeout non enforced**, solo impostazioni salvabili.
10. **Rate limiting in-memory** e non distribuito per API sensibili.

---

## 6. Gap processo operativo

1. Nessun workflow formalizzato per:
   - gestione richieste Art. 15/17/20/21;
   - sub-processor change notice;
   - incident response / data breach 72h;
   - restore da backup;
   - review periodica LIA/DPIA/ROPA.
2. Nessuna evidenza di:
   - registrazione versione ToS/DPA accettata per tenant;
   - log consensi con timestamp/versione/canale;
   - retention review periodica sui log tecnici.

---

## 7. Sub-responsabili e trasferimenti

### Inventario emerso dal repo

| Fornitore | Evidenza nel repo | Stato disclosure |
|---|---|---|
| **Supabase** | DB/auth/storage diffusi nel codice; EU region citata in documenti | **Parziale** — disclosure pubblica presente ma troppo semplificata |
| **Vercel** | hosting + `@vercel/analytics` | **Parziale** — Vercel citato, analytics non descritti in dettaglio |
| **Resend** | email transazionali | **Presente** |
| **Sentry** | instrumentation server/client + replay | **Parziale** — page says error monitoring, non replay |
| **PostHog** | marketing analytics provider attivo in codice | **Assente** dalla pagina sub-processors |
| **Anthropic** | `aiuto-chat` e `magic-wand` | **Assente** dalla pagina sub-processors |

### Trasferimenti extra UE

1. La pagina pubblica sub-processors afferma per Supabase **“nessun trasferimento extra-UE”**.
2. Il documento interno `gdpr-approfondimento-implementazione.md` dice invece che la TIA Supabase evidenzia sub-processing anche **USA/Singapore**.
3. Nel repo **non emerge prova operativa** di DPA/SCC accettati o archiviati per provider attivi.

### Raccomandazione

Gestire l’inventario vendor come un vero asset di release:

1. vendor
2. ruolo (sub-processor / recipient / AI provider)
3. regione primaria
4. meccanismo di trasferimento
5. DPA/SCC accettati
6. data ultima review

---

## 8. Cookie / consensi

### Stato attuale

**Buono**
- banner con **accept/reject**
- Vercel Analytics / PostHog / first-party analytics condizionati al consenso
- no advertising cookie stack emerso dal repo

**Gap**
- consenso analytics non provabile server-side
- nessun “change preferences” persistente
- B2C privacy dice di fatto “nessun tracking”, ma landing/PWA possono attivare analytics first-party dopo consenso
- consenso marketing non è granulare per canale
- promozioni push bypassano il consenso marketing

### Valutazione

La base tecnica per un modello **consent-first** esiste già.  
Il problema è la **governance del consenso**: prova, revoca, granularità e coerenza documentale.

---

## 9. Data subject rights

### Accesso / portabilità

- **B2B:** esiste export JSON dashboard, ma scope ridotto (profilo/appuntamenti/portfolio) e con limite record.
- **B2C:** solo `mailto:`; nessun workflow applicativo.

### Rettifica

- **B2B:** disponibile per dati profilo.
- **B2C:** disponibile per alcuni dati profilo/preferenze.

### Cancellazione / oblio

- **B2B:** `deleteAccount()` non elimina completamente account/CRM/linkage.
- **B2C:** nessuna funzione applicativa; policy promette più di quanto esista.

### Opposizione

- **Profilazione churn:** **implementata bene** con `churn_profiling_objected_at`.
- **Marketing:** revocabile lato preferenze, ma senza proof trail versionato.

### Reclamo all’autorità

- Non emerge in modo chiaro nelle policy pubbliche il riferimento esplicito al **Garante** e alla modalità di reclamo.

---

## 10. AI / churn / analytics

### Churn detection

**Punti forti**
- LIA interna presente
- DPIA interna presente
- opt-out tecnico presente
- algoritmo non produce decisione automatica sul cliente finale in v1

**Gap**
- disclosure B2C da completare
- audit/review periodica ancora manuale
- consenso marketing e churn logic vanno tenuti separati anche nel modello di prova

### AI attiva

- `aiuto-chat` e `magic-wand` usano **Anthropic** oggi, non “solo futuro v3”.
- Nessuna disclosure pubblica corrispondente su sub-processors/policy.
- Nessuna guardrail evidente lato UI per impedire inserimento di dati cliente nei prompt.

### Analytics

- Consenso client-side implementato.
- Link sessione anonima → cliente reale dopo login/prenotazione.
- Cleanup raw `site_events` presente a 90 giorni.
- **Retention `site_sessions` non definita**.
- Documentazione sulla base giuridica non allineata.

---

## 11. Roadmap fix

### Fase 0 — blocco go-live (prima di qualunque cliente reale)

1. Pubblicare **ToS B2B finali**.
2. Creare **ToS B2C tenant/PWA** e correggere tutti i link.
3. Integrare **DPA accettato/versionato** nel flusso barbiere.
4. Bloccare **promotion push** ai soli clienti con consenso marketing valido.

### Fase 1 — pre-clienti reali

1. Introdurre **consent ledger** versionato per marketing/profiling.
2. Aggiungere **proof e revoca** per analytics consent.
3. Completare **privacy B2C** (retention, reclamo, trasferimenti, analytics/AI, routing diritti).
4. Implementare workflow **DSR B2C** e correggere export/delete B2B.
5. Allineare **sub-processors** (PostHog, Anthropic, Supabase transfer reality).
6. Rivedere **Sentry Replay**.
7. Correggere **OTP retention/hash**.
8. Formalizzare **breach runbook** e **retention matrix**.
9. Aggiungere **unsubscribe/manage preferences** alle email marketing.

### Fase 2 — hardening

1. Enforcement reale **2FA / session timeout**.
2. **Rate limiting distribuito**.
3. Hardening **CSP**.
4. Audit trail dedicato a consensi/DSR/privacy events.
5. Runbook **backup/restore** con drill periodico.
6. Policy **minori** e cleanup documentale entità legale.

---

## 12. Verdict finale

### Valutazione finale

**FAIL — non pronto al lancio con clienti reali senza remediation P0/P1.**

### Sintesi finale

Styll è **vicino a una base compliance credibile**, ma oggi resta nel mezzo tra:

1. una buona architettura privacy-aware,
2. documenti interni ben impostati,
3. e una **maturità legale/operativa ancora insufficiente** per gestire barber veri e clienti finali reali.

### Giudizio pratico

- **Per demo / tesi / test interni:** accettabile.
- **Per onboarding di barbieri reali con dati reali:** **non ancora accettabile**.
- **Condizione minima per passare a PASS:** chiusura di tutti i P0 e dei P1 su consensi, DPA, documenti pubblici, diritti e processor inventory.

---

## Allegato A — evidenze principali già positive

1. `clients.churn_profiling_objected_at` + recompute che rispetta l’opposizione.
2. `CookieBanner` con reject/accept e gating analytics.
3. `cleanup_old_site_events(90)` già presente.
4. `portfolio` bucket privato con signed URLs.
5. DPA / ROPA / LIA / DPIA interni già avviati.

