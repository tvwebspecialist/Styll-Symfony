# Multi-Tenant Isolation Audit Report

## 1. Executive summary

**Verdict:** **FAIL**

Questo audit ha trovato **5 P0**, **3 P1** e **1 P2** rilevanti per tenant isolation / authz.

I problemi piu gravi non sono nel semplice cambio URL `tenant A -> tenant B` lato dashboard SSR, che **risulta correttamente bloccato** da `apps/web/src/app/tenant/dashboard/[slug]/layout.tsx:134-137`, ma in quattro punti sistemici:

1. **Privilege escalation a superadmin** via RLS su `profiles`.
2. **RLS pubbliche troppo permissive** sulle tabelle PWA/booking, con impatto anche su **Realtime appointments**.
3. **Storage e RPC privilegiati** esposti a utenti non autorizzati.
4. **Server Actions e superfici dashboard** che usano service-role senza rifare il controllo di tenant/ruolo.

**Base di evidenza:** audit statico approfondito su dashboard tenant, PWA cliente, sito pubblico, route handlers, Server Actions, Supabase RLS/storage/realtime, tenant routing e session handling.  
**Limite operativo:** non ho potuto eseguire una replay end-to-end completa sul dataset richiesto (20 tenant / 100 staff / 1.000 clienti / 5.000 appuntamenti) perche in questa workspace non erano disponibili env Supabase runtime e i seed versionati del repo restano sostanzialmente **single-tenant** (`supabase/seeds/01_base.sql:27-39`, `02_staff.sql:25-79`, `04_clienti.sql:17-84`, `05_appuntamenti.sql:6-220`).

## 2. Matrice ruoli x superfici

**Legenda:** `PASS` = nessun bypass confermato; `P0-01` ecc. = finding in sezione 3; `-` = non applicabile diretto.

Ruoli abbreviati: **OA** owner tenant A, **OB** owner tenant B, **M** manager, **R** receptionist, **S** barber/staff, **CA** customer A, **CB** customer B, **G** guest anonimo, **AD** admin/shadow.

| Superficie | OA | OB | M | R | S | CA | CB | G | AD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Direct dashboard slug switch verso tenant esterno | PASS | PASS | PASS | PASS | PASS | - | - | - | PASS |
| Clienti / calendario / note cross-tenant via UI | PASS | PASS | PASS | PASS | PASS | - | - | - | PASS |
| Self-escalation a superadmin | P0-01 | P0-01 | P0-01 | P0-01 | P0-01 | P0-01 | P0-01 | - | - |
| Query dirette Supabase su tabelle booking/PWA | P0-02 | P0-02 | P0-02 | P0-02 | P0-02 | P0-02 | P0-02 | P0-02 | P0-02 |
| Realtime appointments cross-tenant | P0-02 | P0-02 | P0-02 | P0-02 | P0-02 | P0-02 | P0-02 | P0-02 | P0-02 |
| Storage `portfolio` cross-tenant | P0-03 | P0-03 | P0-03 | P0-03 | P0-03 | P0-03 | P0-03 | - | P0-03 |
| RPC `SECURITY DEFINER` cross-tenant | P0-04 | P0-04 | P0-04 | P0-04 | P0-04 | P0-04 | P0-04 | - | P0-04 |
| Notifications Server Actions cross-tenant | P0-05 | P0-05 | P0-05 | P0-05 | P0-05 | P0-05 | P0-05 | - | P0-05 |
| Superfici owner/manager mutate da ruoli limitati | PASS | PASS | PASS | P1-01 | P1-01 | - | - | - | PASS |
| Manager puo creare/promuovere owner | - | - | P1-02 | - | - | - | - | - | - |
| Shadow mode / logout hygiene | - | - | - | - | - | - | - | - | P1-03 |
| Rapid login/logout PWA su device condiviso | - | - | - | - | - | P2-01 | P2-01 | - | - |

## 3. Bug trovati ordinati P0/P1/P2/P3

### P0

#### P0-01 - Qualunque utente autenticato puo auto-promuoversi a superadmin

**Finding**

La policy `Profiles are updatable by owner` consente all'owner della propria riga `profiles` di fare `UPDATE` senza limitare le colonne modificabili. Le superfici admin e molte policy successive si fidano direttamente di `profiles.is_superadmin`.

**Perche e critico**

Chiunque abbia una sessione autenticata - owner, manager, receptionist, staff, customer - puo alzare `profiles.is_superadmin = true` dal browser/Supabase client e sbloccare accesso amministrativo platform-wide.

**Evidence**

- `supabase/migrations/20260425000001_profiles.sql:70-74`
- `supabase/migrations/20260425000005_superadmin.sql:13-37`
- `supabase/migrations/20260426000001_admin_v2.sql:20-82`
- `supabase/migrations/20260630133207_create_platform_notifications.sql:35-55`
- `apps/web/src/app/admin/actions.ts:90-103`

#### P0-02 - RLS pubbliche su tabelle PWA/booking espongono dati cross-tenant e Realtime

**Finding**

La migration `20260616000001_public_pwa_rls.sql` crea policy `SELECT` pubbliche su tabelle tenant-scoped senza predicato `tenant_id`: `services`, `locations`, `staff_members`, `staff_locations`, `staff_services`, `working_hours`, `working_hour_overrides`, `promotions`, `loyalty_configs`, `rewards` e soprattutto `appointments`.

Su `appointments` il problema e amplificato da `20260513000001_rls_realtime_appointments.sql`, che aggiunge la tabella a `supabase_realtime`.

**Perche e critico**

- Un guest o utente autenticato puo usare il **Supabase browser client** per enumerare righe di altri tenant.
- Su `appointments` la policy pubblica non filtra `tenant_id`, quindi espone calendario cross-tenant, `client_id`, `staff_id`, `location_id`, `notes`, `booked_by`.
- Lo stesso difetto vale per **Realtime**: websocket su appointments non confinato al tenant corrente.

**Evidence**

- `supabase/migrations/20260616000001_public_pwa_rls.sql:84-167`
- `supabase/migrations/20260513000001_rls_realtime_appointments.sql:31-79`
- Le query app-layer sono tenant-safe ma non mitigano il client diretto:  
  `apps/web/src/lib/actions/public-booking.ts:240-250`  
  `apps/web/src/lib/actions/public-booking.ts:422-430`  
  `apps/web/src/lib/actions/public-booking.ts:597-647`  
  `apps/web/src/lib/actions/public-booking.ts:712-733`

#### P0-03 - Bucket `portfolio` scrivibile/cancellabile da qualunque utente autenticato

**Finding**

Il bucket pubblico `portfolio` permette `insert`, `update` e `delete` a qualunque `auth.role() = 'authenticated'`, senza alcun vincolo su tenant, owner o prefix di path.

**Perche e critico**

Un utente autenticato di tenant A puo sovrascrivere o cancellare asset portfolio di tenant B usando il path oggetto visibile nelle URL pubbliche.

**Evidence**

- `supabase/migrations/20260427000001_portfolio.sql:64-96`
- L'app salva foto con prefix tenant ma la policy non lo impone: `apps/web/src/lib/actions/profilo.ts:300-306`
- L'app stessa rimuove oggetti dal path derivato dalla URL: `apps/web/src/lib/actions/profilo.ts:347-355`
- Pattern corretto di confronto: `supabase/migrations/20260425000003_avatars_storage.sql:11-35`

#### P0-04 - RPC `SECURITY DEFINER` esposte senza revoke

**Finding**

Nel repo restano funzioni `SECURITY DEFINER` sensibili senza hardening `REVOKE EXECUTE` visibile:

- `decrement_product_inventory(...)`
- `recompute_client_analytics(...)`
- `recompute_all_client_analytics()`
- `reconcile_site_analytics_daily(...)`
- `cleanup_old_site_events(...)`

**Perche e critico**

In assenza di revoke, queste RPC sono realisticamente invocabili dal browser autenticato via `.rpc(...)`, con mutazioni fuori dal tenant dell'utente:

- stock / inventory cross-tenant,
- analytics cliente cross-tenant,
- cleanup globale degli eventi sito,
- recompute globale dei rollup.

**Evidence**

- `supabase/migrations/20260623000001_inventory_movements.sql:43-62`
- `supabase/migrations/20260625184401_inventory_movements_with_return.sql:37-55`
- `supabase/migrations/20260501000001_client_analytics.sql:50-63`
- `supabase/migrations/20260501000001_client_analytics.sql:151-163`
- `supabase/migrations/20260702000001_churn_opt_out.sql:15-98`
- `supabase/migrations/20260704000001_site_analytics.sql:172-289`
- Pattern corretto gia usato altrove: `supabase/migrations/20260614221927_recalculate_client_analytics_fn.sql:96-98`
- Uso applicativo service-role della RPC inventory: `apps/web/src/lib/actions/calendario.ts:979-984`

#### P0-05 - Server Actions notifiche modificano tenant arbitrari senza ricontrollo membership

**Finding**

`markNotificationRead()` e `markAllNotificationsRead()` verificano solo che l'utente sia autenticato, poi usano `createAdminClient()` per scrivere su `notifications` in base al `tenantId` passato dal client. Non rifanno la membership check e non limitano `profile_id`.

**Perche e critico**

Un utente autenticato di tenant A puo ritrasmettere una Server Action con `tenantId` di tenant B e marcare come lette notifiche di un altro tenant.

**Evidence**

- `apps/web/src/lib/actions/notifiche.ts:58-101`
- `apps/web/src/components/dashboard/notifiche/NotificheClient.tsx:15-16`
- `apps/web/src/components/dashboard/notifiche/NotificheClient.tsx:214-221`
- `apps/web/src/app/tenant/dashboard/[slug]/notifiche/page.tsx:17-19`
- `apps/web/src/lib/supabase/admin.ts:4-9`
- Confronto DB-side corretto in sola lettura: `supabase/migrations/20260624000001_notifications_realtime.sql:20-44`

### P1

#### P1-01 - Receptionist e staff possono usare superfici tenant-wide da owner/manager

**Finding**

La UI dashboard espone a tutti `Catalogo`, `La mia App`, `Impostazioni`, `Marketing`, `Vendite`, `Team`. Le relative pagine/action server-side mutano dati tenant-wide ma si basano solo su `getActiveTenantId()` o sull'essere "staff attivo", senza check di ruolo adeguato.

**Evidence**

- Ruoli attesi: `apps/web/CLAUDE.md:49-57`
- Nav esposta a tutti:  
  `apps/web/src/components/dashboard/Sidebar.tsx:32-58`  
  `apps/web/src/components/dashboard/BottomNav.tsx:38-45`
- Pagine senza role gate:  
  `apps/web/src/app/tenant/dashboard/[slug]/app/page.tsx:8-13`  
  `apps/web/src/app/tenant/dashboard/[slug]/impostazioni/page.tsx:8-13`
- Action mutative senza role check:  
  `apps/web/src/lib/actions/impostazioni.ts:138-217`  
  `apps/web/src/lib/actions/app-settings.ts:114-229`  
  `apps/web/src/lib/actions/app-settings.ts:375-747`  
  `apps/web/src/lib/actions/catalogo.ts:156-257`  
  `apps/web/src/lib/actions/catalogo.ts:276-414`  
  `apps/web/src/lib/actions/offers.ts:180-248`  
  `apps/web/src/lib/actions/loyalty-settings.ts:142-309`
- Controlli positivi presenti solo in superfici che hanno passato l'audit:  
  `apps/web/src/lib/actions/calendario.ts:36-50`  
  `apps/web/src/lib/actions/clienti.ts:142-152`

#### P1-02 - Un manager puo creare o promuovere owner

**Finding**

Sia la UI che le Server Actions consentono a un manager di invitare un nuovo `owner` o promuovere un membro esistente a `owner`.

**Evidence**

- UI invito/edit ruolo include `owner`:  
  `apps/web/src/components/dashboard/team/TeamClient.tsx:46-105`  
  `apps/web/src/components/dashboard/team/TeamClient.tsx:133-170`
- `inviteTeamMember()` accetta `role: 'owner'` e blocca solo i non-manager: `apps/web/src/lib/actions/team.ts:266-385`
- `updateStaffRole()` accetta `role: 'owner'` e controlla solo `MANAGER_ROLES`: `apps/web/src/lib/actions/team.ts:395-427`

#### P1-03 - Shadow mode lascia cookie sporco tra sessioni admin

**Finding**

`styll_impersonate_tenant` viene impostato con scope globale root-domain e non viene cancellato al logout admin.

**Perche e un rischio reale**

La sessione superadmin successiva nello stesso browser puo ereditare involontariamente il tenant impersonato prima ancora di una scelta esplicita.

**Evidence**

- Set/delete shadow cookie: `apps/web/src/app/admin/actions-tenants.ts:238-256`, `apps/web/src/app/admin/actions-tenants.ts:259-285`
- Logout admin che non lo pulisce: `apps/web/src/app/admin/actions.ts:110-114`
- Lettura cookie in tenant context: `apps/web/src/lib/tenant-context.ts:195-205`, `apps/web/src/lib/tenant-context.ts:221-253`

### P2

#### P2-01 - Logout dashboard non svuota la sessione PWA persistita

**Finding**

La sessione PWA vive in `localStorage` (`styll-pwa-session`). I logout dashboard standard puliscono solo i cookie; `PwaSessionRestorer` puo quindi reidratare un vecchio account nei cookie.

**Evidence**

- Persistenza PWA: `apps/web/src/lib/supabase/pwa-client.ts:6-19`
- Restore cookie <- localStorage: `apps/web/src/components/pwa/PwaSessionRestorer.tsx:17-49`
- Logout dashboard solo cookie:  
  `apps/web/src/components/dashboard/BottomNav.tsx:58-62`  
  `apps/web/src/lib/actions/profilo.ts:500-515`
- Logout completo esiste solo nella PWA settings: `apps/web/src/app/tenant/app/[slug]/profilo/_components/SettingsList.tsx:110-121`

### P3

Nessun finding P3 aggiuntivo abbastanza forte da meritare remediation sopra i rischi non verificati.

## 4. Passi di riproduzione

> Nessun exploit distruttivo e stato eseguito. I passi sotto descrivono percorsi realistici da browser/API applicativa.

### P0-01 - Self-escalation superadmin

1. Autenticarsi con un qualsiasi account applicativo.
2. Aprire DevTools e inizializzare un client Supabase con la publishable key gia usata dall'app.
3. Eseguire un `update` della propria riga `profiles` impostando `is_superadmin = true`.
4. Ricaricare `/admin` o interrogare una superficie protetta da `is_superadmin`.

### P0-02 - Public RLS / Realtime

**Variante A - query diretta**

1. Da guest o utente autenticato, creare un Supabase client browser-side.
2. Eseguire `select('*').from('appointments')` filtrando solo `status != cancelled/no_show`.
3. Osservare righe cross-tenant, perche la policy pubblica non filtra `tenant_id`.

**Variante B - realtime**

1. Aprire un channel `postgres_changes` su `public.appointments`.
2. Non applicare filtro tenant oppure usare il tenant di un altro salone.
3. Ricevere eventi cross-tenant, dato che la tabella e in `supabase_realtime` e la `SELECT` e pubblica.

### P0-03 - Storage `portfolio`

**Variante A - delete**

1. Recuperare una URL portfolio pubblica di un altro tenant.
2. Estrarre il path dopo `/portfolio/`.
3. Da qualsiasi account autenticato, chiamare `supabase.storage.from('portfolio').remove([path])`.

**Variante B - overwrite**

1. Usare `upload(path, file, { upsert: true })` sullo stesso path o su un prefix di un altro tenant.
2. La policy accetta la write senza alcun vincolo tenant/path.

### P0-04 - RPC `SECURITY DEFINER`

**Variante A - inventory**

1. Da account autenticato, invocare `.rpc('decrement_product_inventory', { p_tenant_id, p_product_id, p_location_id, p_quantity })`.
2. In assenza di revoke, la funzione gira con privilegi del definitore.

**Variante B - analytics / cleanup**

1. Invocare `.rpc('cleanup_old_site_events', { p_retain_days: 0 })` oppure `.rpc('recompute_all_client_analytics')`.
2. La mutazione opera fuori dal tenant del chiamante.

### P0-05 - Notifications Server Actions

**Variante A - mark all**

1. Loggarsi in un tenant qualunque e aprire la pagina notifiche.
2. Catturare la request della Server Action `markAllNotificationsRead(tenantId)`.
3. Ritrasmetterla cambiando `tenantId` con quello di un altro tenant.

**Variante B - mark single**

1. Ripetere il flusso con `markNotificationRead(tenantId, notifId)`.
2. Sostituire `tenantId` / `notifId` con valori di un altro tenant.

### P1-01 - Role bypass dashboard

1. Loggarsi come `receptionist` o `staff`.
2. Aprire da nav `Catalogo`, `La mia App`, `Impostazioni`, `Marketing` o `Vendite`.
3. Eseguire una modifica tenant-wide.
4. La richiesta passa perche lato server manca il role gate.

### P1-02 - Manager -> owner

1. Loggarsi come `manager`.
2. Andare in `Team`.
3. Invitare un nuovo membro con ruolo `owner` oppure modificare un membro esistente e salvarlo come `owner`.

### P1-03 - Shadow mode sporco

1. Loggarsi come superadmin.
2. Avviare shadow mode su un tenant.
3. Fare logout senza premere `Esci da shadow mode`.
4. Rifare login nello stesso browser come superadmin.
5. Il tenant impersonato riappare per cookie residuo.

### P2-01 - Rapid login/logout PWA

1. Effettuare login PWA in modo che `styll-pwa-session` venga salvata.
2. Fare logout da una superficie dashboard che pulisce solo i cookie.
3. Riaprire la PWA tenant.
4. `PwaSessionRestorer` ripristina la sessione nei cookie dal localStorage.

## 5. Impatto GDPR / security / business

| Finding | Impatto |
| --- | --- |
| P0-01 | **Bypass auth completo**: accesso admin platform-wide e quindi a tutti i tenant. |
| P0-02 | **Data leak cross-tenant**: calendario, disponibilita, staff, location, rewards e metadati booking visibili fuori tenant; Realtime incluso. |
| P0-03 | **Cross-tenant modification**: immagini portfolio di altri tenant sovrascrivibili/cancellabili. |
| P0-04 | **Privileged mutation**: inventory / analytics / cleanup eseguibili fuori dai flussi applicativi e fuori tenant. |
| P0-05 | **Cross-tenant state tampering**: notifiche di tenant terzi marcate come lette. |
| P1-01 | **Broken RBAC**: receptionist/staff alterano branding, catalogo, contenuti pubblici e superfici sensibili. |
| P1-02 | **Privilege escalation intra-tenant**: manager puo diventare owner o crearne uno. |
| P1-03 | **Sessione tenant sporca**: admin puo operare nel tenant sbagliato dopo relogin. |
| P2-01 | **Session bleed su device condivisi**: account PWA puo "risorgere" dopo logout apparente. |

## 6. Fix consigliato

| Finding | Fix |
| --- | --- |
| P0-01 | Rendere `profiles` self-updatable solo per un set esplicito di colonne non privilegiate; spostare `is_superadmin` in un claim/tabella non editabile dall'utente. |
| P0-02 | Rimuovere le `SELECT` pubbliche non tenant-bound; per availability pubblica usare route/view minimizzate e mai la tabella `appointments` grezza; rieseguire il design realtime. |
| P0-03 | Copiare il pattern `avatars`: policy Storage vincolate a prefix tenant-owned; opzionalmente signed URLs e path non riutilizzabili. |
| P0-04 | `REVOKE EXECUTE` da `public`, `anon`, `authenticated`; `GRANT` solo a `service_role`; inventario completo di tutte le funzioni `SECURITY DEFINER`. |
| P0-05 | In `notifiche.ts`, risolvere tenant dal server o verificare membership staff sul tenant passato; limitare il write anche per `profile_id`. |
| P1-01 | Introdurre helper centralizzati `requireOwnerRole()` / `requireManagerRole()` e applicarli a ogni action mutativa; poi nascondere la UI ai ruoli bassi. |
| P1-02 | Vietare `owner` a manager sia in UI sia in server action; bloccare auto-promozione e promozione di terzi a owner. |
| P1-03 | Pulire sempre `styll_impersonate_tenant` al logout; opzionalmente legare il cookie all'`admin_user_id` che lo ha creato. |
| P2-01 | Unificare logout dashboard/PWA in un flow che pulisca cookie, `styll-pwa-session` e cache sensibili. |

## 7. Test Playwright / Supabase da aggiungere

1. **RLS regression**: utente autenticato non puo aggiornare `profiles.is_superadmin`.
2. **Anon/authenticated read regression**: query dirette a `appointments`, `staff_members`, `working_hours`, `rewards`, `services`, `locations` non devono uscire dal tenant corrente.
3. **Realtime regression**: client tenant A non riceve `appointments` di tenant B.
4. **Storage regression**: tenant A/customer A non possono `upload/update/delete` oggetti `portfolio` di tenant B.
5. **RPC privilege regression**: `anon` e `authenticated` ricevono `permission denied` su tutte le RPC `SECURITY DEFINER` non service-only.
6. **Server Action tampering test**: utente A non puo marcare read notifiche di tenant B.
7. **Role gate E2E**: `staff`/`receptionist` non possono usare `Catalogo`, `La mia App`, `Impostazioni`, `Marketing`, `Vendite`.
8. **Team role E2E**: `manager` non puo invitare/promuovere `owner`.
9. **Shadow logout E2E**: logout admin cancella sempre il cookie di impersonazione.
10. **PWA logout E2E**: nessun restore del vecchio account dopo logout dashboard/PWA.

## 8. Rischi non verificati

1. **Bucket `tenants` e RPC `get_my_tenant_id` non sono versionati nel repo.**  
   Il client dashboard usa upload diretti browser-side verso `storage.from('tenants')` e `.rpc('get_my_tenant_id')`, ma durante la repo search non ho trovato la migration/policy sorgente corrispondente.  
   Evidence: `apps/web/src/components/dashboard/impostazioni/ImpostazioniClient.tsx:77-84`, `apps/web/src/components/dashboard/impostazioni/ImpostazioniClient.tsx:255-264`, `apps/web/src/types/database.types.ts:2496`

2. **`get_my_tenant_ids()` e referenziata ma non definita nel source versionato.**  
   Le policy site analytics la usano, quindi c'e almeno un drift DB<->repo o una migration incompleta.  
   Evidence: `supabase/migrations/20260704000001_site_analytics.sql:120-168`

3. **L'edge function legacy `create-guest-booking` non e stata promossa a finding confermato, ma merita replay live.**  
   A differenza di `apps/web/src/lib/actions/create-booking.ts:98-133`, la function non verifica che `staffId` e `locationId` appartengano al `tenantId` scelto.  
   Evidence: `supabase/functions/create-guest-booking/index.ts:118-125`, `supabase/functions/create-guest-booking/index.ts:183-199`

4. **Nessuna replay live sul dataset minimo richiesto.**  
   I seed versionati del repo restano single-tenant e piccoli; manca una fixture bulk 20-tenant pronta.  
   Evidence: `supabase/seeds/01_base.sql:27-39`, `02_staff.sql:25-79`, `04_clienti.sql:17-84`, `05_appuntamenti.sql:6-220`, `apps/web/tests/helpers/supabase-admin.ts:53-87`

## 9. Verdict finale: pass/fail

**FAIL**

Styll oggi **non passa** un audit serio di tenant isolation. I blocchi principali da correggere prima di qualsiasi hardening secondario sono:

1. `profiles.is_superadmin` self-escalation
2. public RLS / realtime cross-tenant
3. bucket `portfolio` non scoped
4. RPC `SECURITY DEFINER` senza revoke
5. Server Actions notifiche senza membership re-check

Non ho applicato fix in questo passaggio. Con P0/P1 presenti, il passo corretto e fermarsi qui e chiedere conferma prima di procedere alle remediation.
