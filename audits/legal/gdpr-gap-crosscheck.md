# GDPR gap cross-check — audit vs documenti esistenti

> **Scopo:** classificare i finding **P0/P1** di `audits/legal/gdpr-final-audit.md` come gap reali, gap parziali, requisiti già documentati ma non ancora implementati, oppure punti incerti.  
> **Perimetro:** nessuna modifica codice; solo cross-check documentale e repo evidence.  
> **Fonti principali lette:**  
> - `audits/legal/gdpr-final-audit.md`
> - `docs/08-strategia/legal-compliance.md`
> - `gdpr-approfondimento-implementazione.md`
> - supporto evidenze: `docs/legal/dpa-barbieri.md`, `docs/legal/ropa.md`, `docs/legal/lia-churn-detector.md`, `docs/legal/dpia-churn-vip.md` + file applicativi citati sotto

## Executive summary

- **Esito sintetico:** i FAIL P0/P1 non risultano falsi positivi netti. Ho trovato **9 veri gap**, **5 gap parziali**, **1 punto incerto** e **0 falsi positivi pieni**.
- **Tema dominante:** la maggior parte dei finding era **già prevista nei documenti GDPR esistenti**, ma non è ancora stata tradotta in implementazione o in documentazione pubblica coerente.
- **Aree più solide di quanto sembri dall’audit:** su **churn / VIP / LIA / DPIA** il repo non è “vuoto”: esistono già `docs/legal/lia-churn-detector.md`, `docs/legal/dpia-churn-vip.md` e `docs/legal/ropa.md`. Il gap qui è soprattutto di **operazionalizzazione e prova**, non di totale assenza documentale.
- **Aree più deboli e immediate:** termini B2C, pacchetto legale B2B, DPA Styll↔barbiere versionata/accettata, privacy B2C tenant, disclosure sub-responsabili/trasferimenti, push promozionali, breach runbook.
- **Nota metodologica:** `gdpr-final-audit.md` dichiara **10 P1**, ma in realtà elenca **11 finding P1** (`F-05` → `F-15`).

## Matrice completa finding × stato

| ID | Prio | Natura prevalente | Stato repo | Verdict |
|---|---|---|---|---|
| F-01 | P0 | Requisito già previsto nei docs, non implementato | **NON IMPLEMENTATO** | **VERO GAP** |
| F-02 | P0 | Gap documentale pubblico B2B | **PARZIALMENTE IMPLEMENTATO** | **VERO GAP** |
| F-03 | P0 | Requisito già previsto nei docs, solo documentato | **SOLO DOCUMENTATO** | **VERO GAP** |
| F-04 | P0 | Gap implementativo su marketing consent | **NON IMPLEMENTATO** | **VERO GAP** |
| F-05 | P1 | Requisito già previsto nei docs, prova debole | **PARZIALMENTE IMPLEMENTATO** | **GAP PARZIALE** |
| F-06 | P1 | Gap misto cookie/analytics (implementazione + policy) | **PARZIALMENTE IMPLEMENTATO** | **GAP PARZIALE** |
| F-07 | P1 | Gap documentale pubblico B2C | **PARZIALMENTE IMPLEMENTATO** | **VERO GAP** |
| F-08 | P1 | Diritti B2C parzialmente operativi | **PARZIALMENTE IMPLEMENTATO** | **GAP PARZIALE** |
| F-09 | P1 | Export/erasure presenti ma fuorvianti o incompleti | **PARZIALMENTE IMPLEMENTATO** | **GAP PARZIALE** |
| F-10 | P1 | Gap documentale + inventario processor non allineato | **PARZIALMENTE IMPLEMENTATO** | **VERO GAP** |
| F-11 | P1 | Gap di disclosure/assessment su monitoring | **PARZIALMENTE IMPLEMENTATO** | **INCERTO** |
| F-12 | P1 | Gap operativo su revoca marketing email | **PARZIALMENTE IMPLEMENTATO** | **VERO GAP** |
| F-13 | P1 | Nuovo gap tecnico/privacy non coperto bene dai docs | **NON IMPLEMENTATO** | **VERO GAP** |
| F-14 | P1 | Gap di processo operativo, già previsto nei docs | **SOLO DOCUMENTATO** | **VERO GAP** |
| F-15 | P1 | Retention solo parzialmente operativa | **PARZIALMENTE IMPLEMENTATO** | **GAP PARZIALE** |

## Cross-check dettagliato per finding

### F-01 — I clienti finali vedono i Termini B2B dei barbieri

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-01 | I clienti finali vedono i ToS B2B invece di termini consumer tenant-specifici | P0 | La PWA cliente linka `buildRootAppUrl('/termini')` e nel repo non esiste una pagina termini B2C tenant-specifica | `legal-compliance.md` §5.2 prevede esplicitamente un **template ToS B2C** da esporre nella PWA del barbiere; lo stesso documento richiama gli obblighi consumer/precontrattuali | **NON IMPLEMENTATO** | `apps/web/src/components/pwa/auth/EmailOtpForm.tsx` (`termsHref = buildRootAppUrl('/termini')`); `apps/web/src/app/tenant/app/[slug]/profilo/preferenze/_components/PreferenzeClient.tsx` (link a `https://styll.it/termini`); nessuna pagina tenant `termini`; esiste solo `apps/web/src/app/(marketing)/termini/page.tsx` | **VERO GAP** | Creare una pagina/templating **B2C tenant-scoped** per termini consumer e rilinkare PWA + OTP flow |

### F-02 — Pacchetto legale pubblico B2B non finalizzato

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-02 | ToS/Privacy B2B pubblici presenti ma non finali e con identità legale incompleta | P0 | `/termini` dichiara “documento in fase di revisione legale”; privacy B2B non espone identità legale completa, sede, PEC/P.IVA, DPO/canale reclamo | `legal-compliance.md` §4.1 elenca i contenuti obbligatori della privacy B2B (titolare, contatti, DPO, destinatari, trasferimenti, retention, reclamo); §5.1 prevede ToS B2B finali; `gdpr-approfondimento-implementazione.md` dice che prima del primo barbiere reale serve finalizzazione professionale del set legale | **PARZIALMENTE IMPLEMENTATO** | `apps/web/src/app/(marketing)/termini/page.tsx` (“Documento in fase di revisione legale”, “Placeholder temporaneo” pricing); `apps/web/src/app/(marketing)/privacy/page.tsx` espone solo “Styll” + `privacy@styll.it`, ma non sede/P.IVA/PEC/reclamo al Garante | **VERO GAP** | Finalizzare ToS/Privacy B2B con dati legali definitivi, canali privacy/reclamo, pricing, DPA richiamato e disclosure completa |

### F-03 — DPA Styll↔barbiere non risulta accettato/versionato nel prodotto

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-03 | Il DPA esiste come testo, ma non emerge prova applicativa di versione/accettazione per tenant | P0 | Il DPA è una bozza in `docs/legal/dpa-barbieri.md`, ma non si vede persistenza di versione, data, tenant e soggetto accettante | `legal-compliance.md` §3.6 e §5.1 prevedono il DPA come allegato ai ToS; `gdpr-approfondimento-implementazione.md` §1 richiede log con data e versione del DPA accettato; `docs/legal/dpa-barbieri.md` §8 afferma che data/versione vengono registrate al momento dell’onboarding | **SOLO DOCUMENTATO** | `docs/legal/dpa-barbieri.md`; `apps/web/src/components/auth/register-form.tsx` contiene solo accettazione generica di ToS/Privacy; ricerca repo: nessuna evidenza di `dpa_version`, `accepted_by`, `terms_version` o tabella dedicata | **VERO GAP** | Registrare almeno `dpa_version`, `accepted_at`, `accepted_by`, `tenant_id` nel flusso B2B |

### F-04 — Le push promozionali bypassano il consenso marketing

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-04 | Le promozioni push vanno a tutte le subscription cliente senza gate marketing | P0 | `sendPromotionPush()` usa le `push_subscriptions` del tenant se `show_in_app = true`, senza controllare `clients.marketing_consent` | `legal-compliance.md` §3.2: “Invio SMS/push marketing → Consenso”; `gdpr-approfondimento-implementazione.md` §2 e `docs/legal/lia-churn-detector.md` chiariscono che l’invio promozionale richiede consenso marketing separato | **NON IMPLEMENTATO** | `apps/web/src/lib/push/promotion-push.ts` legge `push_subscriptions` + `profiles.user_type = client`, ma non `clients.marketing_consent`; `apps/web/src/app/tenant/app/[slug]/profilo/preferenze/_components/PreferenzeClient.tsx` mostra toggle marketing separato | **VERO GAP** | Bloccare le push promozionali sui soli clienti con opt-in marketing, idealmente per canale |

### F-05 — Consenso marketing/profilazione troppo debole come prova

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-05 | Esiste un flag di consenso/opt-out, ma manca audit trail robusto | P1 | Il modello dati espone solo `marketing_consent:boolean` e `churn_profiling_objected_at`; mancano timestamp iniziale, versione testo, canale, fonte, revoca | `legal-compliance.md` richiede prova del consenso e revoca; `gdpr-approfondimento-implementazione.md` §4 distingue chiaramente policy vs consensi e propone tabella separata con `purpose`, `consent_status`, `consent_text_version`, `consented_at`, `withdrawn_at`; esistono anche `docs/legal/lia-churn-detector.md` e `docs/legal/dpia-churn-vip.md` | **PARZIALMENTE IMPLEMENTATO** | `apps/web/src/types/database.types.ts` (`clients.marketing_consent`, `clients.churn_profiling_objected_at`); `apps/web/src/lib/actions/pwa-client-actions.ts` aggiorna solo quei due campi | **GAP PARZIALE** | Introdurre log/versioning dei consensi per finalità e canale, mantenendo i campi attuali solo come denormalizzazione |

### F-06 — Consenso analytics/cookie senza prova server-side e senza centro preferenze

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-06 | Banner/policy esistono, ma la prova è locale e la revoca non ha un entrypoint persistente | P1 | Stato analytics salvato solo in `localStorage`; niente prova server-side, timestamp/versione policy o UI persistente per revoca/reopen | `legal-compliance.md` §6.3 prevede prova del consenso + revoca facile + secondo livello; `gdpr-approfondimento-implementazione.md` §3 dice che un CMP pieno non è necessario **solo** se si resta su cookie tecnici + Vercel Analytics cookieless, ma richiede comunque informativa reale e coerente | **PARZIALMENTE IMPLEMENTATO** | `apps/web/src/lib/analytics-consent.ts` usa solo `localStorage`; `apps/web/src/components/shared/CookieBanner.tsx` mostra Accept/Reject ma poi sparisce; `apps/web/src/app/(marketing)/layout.tsx` monta `CookieBanner` + `PostHogProvider`; `apps/web/src/components/shared/ConsentAwareVercelAnalytics.tsx` abilita analytics solo client-side; `apps/web/src/app/(marketing)/cookie/page.tsx` non offre un vero centro preferenze | **GAP PARZIALE** | Aggiungere un link persistente “Gestisci analytics/cookie” e registrare almeno versione/timestamp/surface della scelta; rivalutare se con PostHog + first-party analytics serve CMP più esplicito |

### F-07 — Privacy B2C pubblica incompleta o materialmente inaccurata

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-07 | La privacy tenant esiste, ma non copre bene retention, reclamo, routing diritti e analytics linking | P1 | Manca un vero blocco retention, manca reclamo al Garante, `privacy@styll.it` è usato come canale generico, e non è esplicitato il linking analytics anonimo→cliente | `legal-compliance.md` §4.2 prevede titolare, responsabile, destinatari, retention, diritti, profilazione e cookie; `gdpr-approfondimento-implementazione.md` §4 richiede template tenant con data entrata in vigore, Styll come responsabile e corretto instradamento dei diritti verso il barbiere | **PARZIALMENTE IMPLEMENTATO** | `apps/web/src/app/tenant/app/[slug]/privacy/page.tsx` ha pagina tenant-aware, ma senza sezione retention, senza reclamo al Garante, con fallback/contatti `privacy@styll.it`; `apps/web/src/lib/site-analytics/link-session.ts` collega `anonymous_id` a `client_id`; `apps/web/src/lib/site-analytics/track.ts` raccoglie eventi analytics | **VERO GAP** | Completare il template B2C con retention per categoria, reclamo, trasferimenti/sub-responsabili, analytics linking e contatto primario del titolare |

### F-08 — Diritti degli interessati B2C non operativi

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-08 | Alcuni diritti sono promessi, ma accesso/portabilità/cancellazione non hanno un flusso reale esposto in PWA | P1 | Nelle preferenze PWA c’è solo un `mailto:privacy@styll.it`; non esistono funzioni self-service per export/cancellazione lato cliente finale | `legal-compliance.md` §3.5 richiede meccanismi per accesso, rettifica, cancellazione, portabilità, opposizione; `gdpr-approfondimento-implementazione.md` §4 chiarisce che le richieste vanno instradate al titolare e che la policy non deve promettere più del prodotto | **PARZIALMENTE IMPLEMENTATO** | `apps/web/src/app/tenant/app/[slug]/profilo/preferenze/_components/PreferenzeClient.tsx` offre solo “Richiedi export o cancellazione” via `mailto`; `apps/web/src/app/tenant/app/[slug]/privacy/page.tsx` promette export JSON/cancel account; l’opposizione alla profilazione è invece reale (`updateChurnProfilingConsent`) | **GAP PARZIALE** | Implementare almeno un flusso assistito di richiesta export/erasure con routing al barbiere, oppure correggere la policy finché il self-service non esiste |

### F-09 — Export/cancellazione B2B incompleti o fuorvianti

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-09 | Le funzioni esistono, ma non coprono tutto ciò che promettono e non chiudono davvero l’account | P1 | `exportUserData()` esporta solo profilo, appuntamenti, portfolio (limite 500); `deleteAccount()` non elimina l’utente auth e non separa in modo chiaro dati fiscali vs CRM | `legal-compliance.md` §3.5 e il principio “i tuoi dati sono tuoi” implicano portabilità ampia; `gdpr-approfondimento-implementazione.md` §6 richiede cancellazione reale del CRM e segregazione dei soli dati fiscalmente necessari; `docs/legal/dpa-barbieri.md` promette export completo prima della cancellazione | **PARZIALMENTE IMPLEMENTATO** | `apps/web/src/lib/actions/profilo.ts` `exportUserData()` limita a 500 righe e include solo `profile`, `appointments`, `portfolio`; `deleteAccount()` cancella alcune tabelle figlie ma poi fa solo nulling di campi su `profiles`; `apps/web/src/components/dashboard/profilo/sections/PrivacySicurezza.tsx` presenta la funzione come export/cancellazione completa | **GAP PARZIALE** | Separare export account personale vs export tenant, e implementare vera chiusura/erasure con segregazione dei dati da conservare |

### F-10 — Disclosure sub-responsabili e trasferimenti incompleta/inaccurata

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-10 | L’inventario pubblico dei processor non è allineato con le integrazioni attive né con i trasferimenti effettivi | P1 | La pagina pubblica elenca solo 4 provider; mancano PostHog e Anthropic; Supabase è presentato come “nessun trasferimento extra-UE” | `legal-compliance.md` §3.6/3.7 richiede lista processor, DPA, SCC/DPF/TIA; `gdpr-approfondimento-implementazione.md` §5 spiega che Supabase in `eu-west-1` **non elimina** il sub-processing extra-UE e che i DPA provider vanno accettati e tracciati | **PARZIALMENTE IMPLEMENTATO** | `apps/web/src/app/(marketing)/sub-processor/page.tsx` elenca solo Supabase/Vercel/Resend/Sentry e per Supabase dichiara “nessun trasferimento extra-UE”; `apps/web/src/components/marketing/PostHogProvider.tsx`; `apps/web/src/app/api/aiuto-chat/route.ts`; `apps/web/src/app/api/magic-wand/route.ts`; `gdpr-approfondimento-implementazione.md` §5 | **VERO GAP** | Allineare pagina pubblica + privacy/DPA ai processor attivi reali e correggere il caso Supabase/trasferimenti |

### F-11 — Sentry Replay attivo su superfici non-PWA senza disclosure specifica

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-11 | Esiste disclosure generica di monitoring/error tracking, ma non un trattamento esplicito del session replay | P1 | `instrumentation-client.ts` abilita `replayIntegration()` su tutte le superfici non `/tenant/app/*`, mentre le pagine pubbliche parlano genericamente di error tracking | I documenti esistenti parlano di log/monitoring e di Sentry come processor, ma non trattano in modo esplicito la specificità del replay; `gdpr-approfondimento-implementazione.md` chiede solo di evitare PII in Sentry | **PARZIALMENTE IMPLEMENTATO** | `apps/web/instrumentation-client.ts` abilita `Sentry.replayIntegration()` con sample rate; `apps/web/src/app/(marketing)/sub-processor/page.tsx` dice solo “Monitoraggio errori”; `apps/web/src/app/(marketing)/privacy/page.tsx` parla genericamente di log tecnici/monitoraggio | **INCERTO** | O dichiarare esplicitamente il replay e fare assessment dedicato, oppure disabilitarlo finché policy e base giuridica non sono chiarite |

### F-12 — Email marketing senza link di opt-out / manage-preferences

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-12 | Il gating marketing esiste, ma la revoca dall’email non è implementata | P1 | `sendCampaign()` filtra `marketing_consent = true`, ma `sendTemplatedEmail()` non aggiunge unsubscribe/manage preferences | `legal-compliance.md` e `gdpr-approfondimento-implementazione.md` richiedono consenso marketing e possibilità di opposizione/revoca semplice; i docs non descrivono ancora il meccanismo email operativo | **PARZIALMENTE IMPLEMENTATO** | `apps/web/src/lib/actions/send-campaign.ts` filtra `marketing_consent = true`; `apps/web/src/lib/email.ts` footer con soli link “Termini” e “Privacy”; nessun unsubscribe/manage preferences nel template | **VERO GAP** | Inserire link di unsubscribe/manage preferences nelle email promozionali e distinguere bene template marketing vs transazionali |

### F-13 — OTP email con token in chiaro e retention non definita

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-13 | I codici OTP sono conservati in chiaro e non emerge un purge automatico | P1 | `email_verification_tokens.code` è salvato in chiaro e non si vede cleanup schedulato | I documenti GDPR esistenti non trattano in modo concreto questo flusso: il finding emerge soprattutto dall’implementazione, non da un requisito già dettagliato nei docs | **NON IMPLEMENTATO** | `supabase/migrations/20260619000001_email_verification.sql` (`code TEXT NOT NULL`); `apps/web/src/lib/email-verification.ts` legge/reinvia `latestToken.code`; `apps/web/src/lib/actions/email-verification.ts` confronta `token.code !== code.trim()`; nessuna migrazione/cron di cleanup dedicata | **VERO GAP** | Hash dei codici OTP a riposo + purge automatico di token usati/scaduti + retention dichiarata |

### F-14 — Procedura data breach non operativa

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-14 | Esiste il principio “72h”, ma non il runbook operativo | P1 | DPA e documenti strategici citano la notifica entro 72h, ma non emerge runbook con ruoli, escalation, triage e template | `legal-compliance.md` checklist segna la procedura breach come attività da fare; `gdpr-approfondimento-implementazione.md` roadmap dice che una procedura minima deve esistere dal day one; `docs/legal/dpa-barbieri.md` promette notifica entro 72h | **SOLO DOCUMENTATO** | `docs/08-strategia/legal-compliance.md`; `gdpr-approfondimento-implementazione.md`; `docs/legal/dpa-barbieri.md`; nessun file runbook/incident response specifico trovato in `docs/` | **VERO GAP** | Creare un runbook breach con owner, backup, checklist 24h/72h, registro incidenti e template di notifica |

### F-15 — Retention frammentata su analytics, lead e log tecnici

| ID finding | descrizione finding | priorità | cosa dice gdpr-final-audit.md | cosa dice il documento GDPR esistente | stato nel codice/prodotto | evidenza | verdict | fix consigliato minimo |
|---|---|---|---|---|---|---|---|---|
| F-15 | Una retention esiste per `site_events`, ma non come matrice operativa coerente per tutte le tabelle sensibili | P1 | Solo `site_events` ha purge a 90 giorni; non emergono retention operative per `site_sessions`, `platform_leads`, `client_import_jobs`, `admin_audit_log` ecc. | `legal-compliance.md` richiede retention per categoria; `gdpr-approfondimento-implementazione.md` e `docs/legal/ropa.md` richiedono retention matrix e policy per categoria, ma il repo non mostra ancora automazione completa | **PARZIALMENTE IMPLEMENTATO** | `supabase/migrations/20260704000001_site_analytics.sql` crea `cleanup_old_site_events(90)` solo per `site_events`; la stessa migrazione crea `platform_leads` e `site_sessions` senza purge; `supabase/migrations/20260601000001_client_import_jobs.sql`; `apps/web/src/app/admin/actions-system.ts` usa `admin_audit_log` senza retention evidente | **GAP PARZIALE** | Definire retention matrix per tabella e automatizzare purge/archive dove il dato resta personale o re-identificabile |

## Lista dei veri gap da correggere

### P0 reali

1. **F-01** — mancano veri termini B2C tenant-specifici; la PWA punta ai ToS B2B.
2. **F-02** — pacchetto legale pubblico B2B ancora non finalizzato.
3. **F-03** — DPA Styll↔barbiere solo documentata, non provata/versionata nel prodotto.
4. **F-04** — push promozionali non gateate dal consenso marketing.

### P1 reali

1. **F-07** — privacy B2C tenant pubblica incompleta/materialmente inaccurata.
2. **F-10** — disclosure sub-responsabili/trasferimenti non allineata alle integrazioni attive.
3. **F-12** — email marketing senza opt-out/manage-preferences operativo.
4. **F-13** — OTP in chiaro e retention non gestita.
5. **F-14** — procedura data breach solo documentata, non operativa.

## Lista dei gap parziali

1. **F-05** — consenso marketing/profilazione esiste, ma la prova è insufficiente.
2. **F-06** — cookie/analytics banner e policy esistono, ma senza prova/versioning/reopen robusti.
3. **F-08** — alcuni diritti B2C sono operativi (opposizione profilazione), ma export/cancellazione no.
4. **F-09** — export/cancellazione B2B esistono, ma sono molto più stretti della promessa.
5. **F-15** — retention parziale: esiste solo sul raw analytics, non come matrix operativa completa.

## Lista dei falsi positivi

- **Nessun falso positivo pieno trovato.**

## Lista dei punti incerti

1. **F-11 — Sentry Replay**: il replay è attivo e la disclosure è generica, ma dal repo non si può chiudere con certezza se l’attuale livello informativo sia già giuridicamente insufficiente o solo troppo poco specifico. È comunque un punto da sanare o chiarire.

## Priorità consigliata dei fix

### Blocco go-live immediato

1. **F-01** — termini B2C corretti e linkati dalla PWA
2. **F-03** — DPA Styll↔barbiere accettata/versionata
3. **F-04** — gate marketing sulle push promozionali
4. **F-02** — finalizzazione set legale pubblico B2B
5. **F-07** — privacy B2C tenant coerente e completa
6. **F-10** — inventario processor/trasferimenti allineato al codice attivo

### Prima di clienti reali / subito dopo il blocco go-live

1. **F-14** — runbook breach 24h/72h
2. **F-12** — opt-out email marketing
3. **F-05** — audit trail consensi
4. **F-08** — workflow diritti B2C almeno assistito
5. **F-09** — export/erasure B2B reale e non cosmetico
6. **F-15** — retention matrix operativa

### Hardening rapido ma non da rinviare troppo

1. **F-13** — OTP hash + purge
2. **F-06** — preference center / prova minima analytics
3. **F-11** — decisione esplicita su Sentry Replay (disclosure o disable)

## Conclusione pratica

La tesi centrale del cross-check è questa: **l’audit P0/P1 è sostanzialmente corretto**, ma molti finding non descrivono un vuoto totale; descrivono piuttosto un repo in cui **la governance GDPR è già stata pensata e documentata**, mentre **prodotto e documentazione pubblica non sono ancora coerenti con quella governance**.

In particolare:

- **B2C legal surface** (termini/privacy/diritti) è il punto più scoperto lato utente finale.
- **B2B legal contracting** (ToS/Privacy/DPA/versioning) è il punto più scoperto lato contrattualizzazione.
- **Churn/VIP governance** è già ben abbozzata internamente, quindi qui il problema non è “assenza”, ma **prova, routing dei consensi e aderenza dell’implementazione reale**.
