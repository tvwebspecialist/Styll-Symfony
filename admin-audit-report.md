# Admin Dashboard Audit — Styll

> Audit read-only. Nessun file modificato.
> Data: 2026-06-29

---

## 1. Struttura attuale

```
/apps/web/src/app/admin/
├── layout.tsx                          ← Guard superadmin + AdminShell
├── page.tsx                            ← Dashboard KPI
├── actions.ts                          ← Re-esporta tutte le action
├── actions-users.ts                    ← CRUD profiles + invite + impersonate
├── actions-tenants.ts                  ← CRUD tenants + shadow mode + global overview
├── actions-system.ts                   ← Stats, audit log, global search, settings
├── actions-content.ts                  ← Staff, servizi, locations, orari per tenant
├── actions-plans.ts                    ← Piani abbonamento
├── actions-data.ts                     ← Clienti e appuntamenti per tenant + import
├── help/page.tsx
├── settings/
│   ├── page.tsx
│   └── settings-client.tsx
├── subscription-plans/
│   ├── page.tsx
│   └── plans-client.tsx
├── tenants/
│   ├── page.tsx                        ← Lista tutti i barbershop
│   ├── tenants-client.tsx
│   └── [tenantId]/
│       ├── layout.tsx
│       ├── page.tsx                    ← Overview tenant + owner card
│       ├── overview-client.tsx
│       ├── tenant-tabs.tsx
│       ├── staff/page.tsx              ← Lista staff + DROPDOWN TUTTI I PROFILI ← BUG
│       ├── staff/staff-client.tsx
│       ├── clients/page.tsx            ← Clienti CRM del tenant ← OK
│       ├── clients/clients-client.tsx
│       ├── appointments/page.tsx
│       ├── services/page.tsx
│       ├── locations/page.tsx
│       ├── working-hours/page.tsx
│       ├── subscription/page.tsx
│       ├── audit/page.tsx
│       ├── migration/page.tsx          ← Import clienti concierge
│       └── products/page.tsx
└── users/
    ├── page.tsx                        ← LISTA TUTTI I PROFILI SENZA FILTRO ← BUG PRINCIPALE
    └── users-client.tsx

/apps/web/src/components/admin/
├── admin-shell.tsx                     ← Layout sidebar + topbar
├── global-search.tsx                   ← Cerca in profiles senza filtro ← BUG
└── image-upload.tsx
```

**Navigazione sidebar attuale:**
- Dashboard `/admin`
- Tenants `/admin/tenants` (lista barbershop)
- **Utenti** `/admin/users` (TUTTI i profili: staff + clienti PWA mescolati)
- Piani `/admin/subscription-plans`
- Impostazioni `/admin/settings`

---

## 2. Query incriminate

### BUG 1 — Query principale: tutti i profili senza discriminatore

**File:** `/apps/web/src/app/admin/users/page.tsx` — righe 8–13

```ts
const [usersRes, tenantsRes] = await Promise.all([
  db
    .from('profiles')
    .select('id, full_name, email, is_superadmin, onboarding_completed, created_at')
    .order('created_at', { ascending: false }),   // ← nessun filtro user_type
  ...
])
```

**Perché è sbagliata:** Restituisce TUTTI i record di `profiles`, inclusi quelli con `user_type = 'client'` — ovvero i clienti dei barbieri che hanno autenticato via OTP nella PWA. Un barbiere con 500 clienti PWA li vedrà tutti in questa lista mescolati con i veri staff.

---

### BUG 2 — Contatore sidebar inflated

**File:** `/apps/web/src/app/admin/layout.tsx` — riga 21

```ts
db.from('profiles').select('*', { count: 'exact', head: true }),
```

**Perché è sbagliata:** Il badge "Utenti" nella sidebar conta tutti i record di `profiles`, quindi mostra `500+` dove dovrebbe mostrare solo il numero di account staff/superadmin.

---

### BUG 3 — Stats KPI confuse: "Utenti totali" include clienti PWA

**File:** `/apps/web/src/app/admin/actions-system.ts` — righe 124–126

```ts
db.from('profiles').select('*', { count: 'exact', head: true }),         // total_users
db.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', d7), // new_signups_7d
db.from('profiles').select('id, created_at').gte('created_at', d365),    // per signups_by_month
```

**Perché è sbagliata:** La stat card "Utenti totali" della dashboard admin include tutti i clienti della piattaforma. Se Styll ha 50 barbieri con 200 clienti PWA ciascuno, mostra 10.000+ "utenti" anziché i ~50 account staff.

---

### BUG 4 — Global search restituisce clienti PWA

**File:** `/apps/web/src/app/admin/actions-system.ts` — righe 354–359

```ts
db
  .from('profiles')
  .select('id, full_name, email')
  .or(`full_name.ilike.${q},email.ilike.${q}`)  // ← nessun filtro user_type
  .limit(8),
```

**Perché è sbagliata:** Se cerco "Mario Rossi" nella barra di ricerca admin, trovo anche i clienti PWA chiamati Mario Rossi, non solo gli staff.

---

### BUG 5 — Dropdown staff assignment include tutti i profili (più critico per UX)

**File:** `/apps/web/src/app/admin/tenants/[tenantId]/staff/page.tsx` — riga 19

```ts
db.from('profiles').select('id, full_name, email').order('full_name', { ascending: true }),
```

**Perché è sbagliata:** Il dropdown "Link Profile" nel form di creazione/modifica staff carica TUTTI i profili — inclusi i clienti della PWA. Un superadmin potrebbe accidentalmente assegnare il profilo di un cliente come staff di un tenant. In un sistema con migliaia di clienti PWA, questo dropdown è inutilizzabile.

---

## 3. Diagnosi del problema

### Meccanismo che causa il mix

Il sistema usa la colonna `profiles.user_type` (valori: `'staff'`, `'client'`, `'admin'`) per distinguere i tipi di utenti. La logica è **implementata correttamente** nel codice applicativo ma **ignorata** nel pannello admin.

**Flusso cliente PWA:**
1. Cliente apre la PWA e inserisce il telefono
2. `pwa-auth.ts:verifyOtp()` → autentica via SMS OTP → crea riga in `auth.users`
3. Il trigger `handle_new_user()` (migrazione `20260425000001_profiles.sql`) crea automaticamente una riga in `profiles` con `user_type = 'staff'` (default hardcoded nel trigger)
4. Subito dopo, `pwa-auth.ts` aggiorna `user_type = 'client'` per il nuovo utente (righe 88–93)
5. Viene anche creata/collegata una riga in `clients` con `profile_id = userId`

**Flusso staff barbiere:**
1. Superadmin invita un barbiere via `/admin/users` → `inviteUser()`
2. Si crea riga in `auth.users`, poi in `profiles` con `user_type = 'staff'`
3. Si crea riga in `staff_members` che collega il profilo al tenant

**Discriminatori disponibili ma non usati in admin:**
- `profiles.user_type = 'staff'` → account staff/superadmin
- `profiles.user_type = 'client'` → account clienti PWA
- `profiles.is_superadmin = true` → superadmin di piattaforma

**Il problema:** Il codice admin non filtra per `user_type`, quindi `from('profiles')` restituisce sia staff che clienti PWA, mescolandoli in un'unica lista indistinguibile.

### Piccola race condition nel trigger

C'è una finestra temporale tra la creazione del profilo (trigger: `user_type = 'staff'`) e l'aggiornamento da parte di `verifyOtp()` (`user_type = 'client'`). Se un admin caricasse la pagina esattamente in quel momento, vedrebbe un cliente come `user_type = 'staff'`. In pratica il rischio è minimo ma teoricamente esiste.

---

## 4. Architettura corretta

### Navigazione admin proposta

```
/admin
  Dashboard — KPI di piattaforma (tenant, MRR, appuntamenti, staff reali)

/admin/tenants
  Lista barbershop con: nome, slug, stato, piano, staff count, owner

/admin/tenants/[id]
  Detail barbershop con tab:
  ├── Overview     — dati tenant + owner + abbonamento
  ├── Staff        ← query: staff_members WHERE tenant_id = X
  │                   + dropdown profili SOLO user_type = 'staff'
  ├── Clienti      ← query: clients WHERE tenant_id = X (già corretto)
  ├── Appuntamenti
  ├── Servizi
  ├── Sedi
  └── ...

/admin/users                         ← RINOMINARE in "Staff Platform"
  Lista account staff (user_type = 'staff' OR is_superadmin = true)
  Filtri: superadmin sì/no, onboarding, data registrazione
  Azioni: invite, edit, reset password, impersona, vedi tenant collegati

/admin/clients                       ← NUOVO — clienti PWA aggregati
  Lista clienti PWA (user_type = 'client') con:
  ├── Nome, email/telefono, data registrazione
  ├── Tenant di appartenenza (via clients.tenant_id)
  └── Nessuna azione delete/edit (gestiti dai barbieri)

/admin/subscription-plans
/admin/settings
```

### Perché la separazione è necessaria

1. **Semantica diversa**: uno staff è un lavoratore gestito dall'admin; un cliente PWA è un utente finale del barbiere — l'admin non ha motivo di gestirlo direttamente.
2. **Volume**: in produzione ci saranno migliaia di clienti PWA. Mostrarli in `admin/users` rende la pagina inutilizzabile.
3. **Sicurezza UX**: il dropdown per assegnare staff a un tenant non deve mai mostrare clienti PWA.
4. **Metriche corrette**: "Utenti" nel KPI dovrebbe significare account staff di piattaforma, non clienti.

---

## 5. Piano di fix — task ordinati per priorità

### PRIORITÀ 1 — Fix critico: filtrare `user_type` nelle query admin

**Task 1.1** — Fix `/admin/users` (lista staff)
- **File:** `apps/web/src/app/admin/users/page.tsx`
- **Query da riscrivere:**
  ```ts
  // PRIMA (sbagliata)
  db.from('profiles').select('...')

  // DOPO (corretta)
  db.from('profiles')
    .select('id, full_name, email, is_superadmin, onboarding_completed, created_at')
    .or('user_type.eq.staff,is_superadmin.eq.true')
    .order('created_at', { ascending: false })
  ```
- **Effort:** S

**Task 1.2** — Fix contatore sidebar "Utenti"
- **File:** `apps/web/src/app/admin/layout.tsx`, riga 21
- **Query da riscrivere:**
  ```ts
  // PRIMA
  db.from('profiles').select('*', { count: 'exact', head: true })

  // DOPO
  db.from('profiles')
    .select('*', { count: 'exact', head: true })
    .or('user_type.eq.staff,is_superadmin.eq.true')
  ```
- **Effort:** S

**Task 1.3** — Fix stats dashboard "Utenti totali"
- **File:** `apps/web/src/app/admin/actions-system.ts`, righe 124–126
- **Query da riscrivere (tutte e 3):**
  ```ts
  // PRIMA
  db.from('profiles').select('*', { count: 'exact', head: true })

  // DOPO
  db.from('profiles')
    .select('*', { count: 'exact', head: true })
    .or('user_type.eq.staff,is_superadmin.eq.true')
  ```
  Stessa modifica per `new_signups_7d` e `signups_by_month` (righe 125–126).
- **Effort:** S

**Task 1.4** — Fix global search: staff-only nella sezione "users"
- **File:** `apps/web/src/app/admin/actions-system.ts`, righe 354–359
- **Query da riscrivere:**
  ```ts
  // DOPO
  db.from('profiles')
    .select('id, full_name, email')
    .or(`full_name.ilike.${q},email.ilike.${q}`)
    .or('user_type.eq.staff,is_superadmin.eq.true')  // ← aggiungere
    .limit(8)
  ```
- **Effort:** S

**Task 1.5** — Fix dropdown staff assignment in tenant detail
- **File:** `apps/web/src/app/admin/tenants/[tenantId]/staff/page.tsx`, riga 19
- **Query da riscrivere:**
  ```ts
  // PRIMA
  db.from('profiles').select('id, full_name, email').order('full_name', { ascending: true })

  // DOPO
  db.from('profiles')
    .select('id, full_name, email')
    .or('user_type.eq.staff,is_superadmin.eq.true')
    .order('full_name', { ascending: true })
  ```
- **Effort:** S

---

### PRIORITÀ 2 — Bug colonna sbagliata in `listTenantAppointments`

**Task 2.1** — Correggere nome colonna `starts_at` → `start_time`
- **File:** `apps/web/src/app/admin/actions-data.ts`, righe 112 e 114
- **Codice attuale (sbagliato):**
  ```ts
  .select('id, starts_at, status, client:clients(full_name)')  // starts_at non esiste!
  .order('starts_at', { ascending: false })
  ```
- **Codice corretto:**
  ```ts
  .select('id, start_time, status, client:clients(full_name)')
  .order('start_time', { ascending: false })
  ```
  Aggiornare anche il tipo `TenantAppointmentRow` (riga 74: `starts_at: string` → `start_time: string`) e il mapping nel return (riga 117).
- **Effort:** S

---

### PRIORITÀ 3 — Nuovo tab/pagina clienti PWA (opzionale ma raccomandato)

**Task 3.1** — Creare `/admin/clients` per clienti PWA
- **Componenti da creare:**
  - `apps/web/src/app/admin/clients/page.tsx`
  - `apps/web/src/app/admin/clients/clients-client.tsx`
- **Query:**
  ```ts
  // Clienti PWA con il loro tenant
  db.from('profiles')
    .select('id, full_name, email, phone, created_at, clients!inner(tenant_id, tenants(business_name))')
    .eq('user_type', 'client')
    .order('created_at', { ascending: false })
  ```
  Oppure, più efficiente, leggere dalla tabella `clients` direttamente:
  ```ts
  db.from('clients')
    .select('id, full_name, email, phone, created_at, profile_id, tenant:tenants(business_name)')
    .not('profile_id', 'is', null)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  ```
- **Aggiungere alla sidebar** in `admin-shell.tsx`:
  ```ts
  { label: 'Clienti PWA', href: '/admin/clients', icon: UserCheck }
  ```
- **Effort:** M

---

### PRIORITÀ 4 — Rinominare e chiarire la sezione Utenti

**Task 4.1** — Rinominare "Utenti" → "Staff" nella sidebar
- **File:** `apps/web/src/components/admin/admin-shell.tsx`, riga 42
- Cambiare `label: 'Utenti'` → `label: 'Staff'`
- **Effort:** XS

**Task 4.2** — Aggiornare titolo e descrizione in `users-client.tsx`
- **File:** `apps/web/src/app/admin/users/users-client.tsx`, righe 440–443
- Cambiare "Utenti" → "Staff Platform", aggiornare la descrizione
- **Effort:** XS

---

### PRIORITÀ 5 — Filtro `deleted_at` mancante in `listTenantClients` basic

**Task 5.1** — Aggiungere filtro soft-delete nella versione semplice
- **File:** `apps/web/src/app/admin/actions-data.ts`, riga 67
- **Aggiungere:**
  ```ts
  .is('deleted_at', null)
  ```
  La versione `listTenantClientsDetailed` (riga 315) già la include; la versione base no.
- **Effort:** XS

---

## 6. Query corrette di riferimento

### Lista barbers/staff della piattaforma (per `/admin/users`)

```ts
const db = createAdminClient()

// Staff + superadmin (esclude clienti PWA)
const { data: staff } = await db
  .from('profiles')
  .select('id, full_name, email, is_superadmin, onboarding_completed, created_at')
  .or('user_type.eq.staff,is_superadmin.eq.true')
  .order('created_at', { ascending: false })

// Con i loro tenant (per il pannello di dettaglio)
const { data: staffWithTenants } = await db
  .from('profiles')
  .select(`
    id, full_name, email, is_superadmin,
    staff_members(role, is_active, tenant:tenants(id, business_name, slug))
  `)
  .or('user_type.eq.staff,is_superadmin.eq.true')
  .order('created_at', { ascending: false })
```

### Clienti di un barbiere specifico (per `/admin/tenants/[id]/clients`)

```ts
// Già corretto — usa clients con tenant_id filter
const { data: clients } = await db
  .from('clients')
  .select('id, full_name, phone, email, tags, marketing_consent, profile_id, created_at')
  .eq('tenant_id', tenantId)
  .is('deleted_at', null)
  .order('created_at', { ascending: false })
```

### Dropdown profili per assegnazione staff (solo account staff)

```ts
const { data: profileOptions } = await db
  .from('profiles')
  .select('id, full_name, email')
  .or('user_type.eq.staff,is_superadmin.eq.true')
  .order('full_name', { ascending: true })
  .limit(500)
```

### KPI stats — conteggi corretti per dashboard

```ts
const [staffCount, newStaff7d, clientsCount] = await Promise.all([
  // Staff di piattaforma (non clienti)
  db.from('profiles')
    .select('*', { count: 'exact', head: true })
    .or('user_type.eq.staff,is_superadmin.eq.true'),

  // Nuovi staff ultimi 7gg
  db.from('profiles')
    .select('*', { count: 'exact', head: true })
    .or('user_type.eq.staff,is_superadmin.eq.true')
    .gte('created_at', d7),

  // Clienti PWA totali (separati)
  db.from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('user_type', 'client'),
])
```

### Lista barbers con statistiche (per top tenants / leaderboard)

```ts
const { data: barbers } = await db
  .from('staff_members')
  .select(`
    id, role, is_active,
    profile:profiles(id, full_name, email, avatar_url),
    tenant:tenants(id, business_name, slug, status)
  `)
  .eq('role', 'owner')
  .eq('is_active', true)
  .order('created_at', { ascending: false })
```

---

## 7. Altri problemi rilevati

### 7.1 — Trigger `handle_new_user` usa `user_type = 'staff'` come default

**File:** `supabase/migrations/20260425000001_profiles.sql`, riga 84

```sql
insert into public.profiles (id, email, full_name, avatar_url, user_type)
values (new.id, new.email, ..., 'staff')  -- default hardcoded
```

Il trigger imposta tutti i nuovi utenti come `user_type = 'staff'`, anche i clienti PWA. La correzione avviene pochi millisecondi dopo in `pwa-auth.ts:verifyOtp()`, ma crea una piccola race condition. Soluzione: usare `user_type = NULL` o `user_type = 'pending'` nel trigger, e far sì che sia il codice applicativo a impostare il valore corretto in base al flusso.

**Effort fix:** S (ma richiede migrazione SQL + aggiornamento delle query che filtrano per `user_type`)

---

### 7.2 — `deleteTenant` usa hard delete (no soft delete)

**File:** `apps/web/src/app/admin/actions-tenants.ts`, riga 99

```ts
const { error } = await db.from('tenants').delete().eq('id', id)
```

I `tenants` non hanno colonna `deleted_at`. Questa è probabilmente una scelta consapevole (la tabella `tenants` non richiede soft delete come `clients`), ma è in conflitto con la filosofia espressa in `CLAUDE.md`. Usare invece `status = 'deleted'` se si vuole preservare i dati per GDPR/audit. Da discutere con il team.

---

### 7.3 — Limite 200 righe su clienti e appuntamenti

**File:** `apps/web/src/app/admin/actions-data.ts`, righe 69 e 378

```ts
.limit(200)  // clienti del tenant
.limit(200)  // appuntamenti del tenant
```

Per un barbiere con più di 200 clienti o appuntamenti, la pagina admin mostrerà silenziosamente dati troncati. Mancano paginazione e/o avviso "Showing 200 of N results".

**Effort fix:** M (aggiungere paginazione server-side o incrementare il limite con avviso)

---

### 7.4 — `adminGlobalSearch` non ha sezione "Clienti CRM"

**File:** `apps/web/src/app/admin/actions-system.ts`, riga 332

La ricerca globale cerca in `tenants`, `profiles` (staff), `services` — ma non nei `clients` dei tenant. Se un superadmin cerca "Mario Rossi" volendo trovare un cliente di un barbiere, non lo trova dalla barra di ricerca admin.

**Effort fix:** S (aggiungere quarta query: `from('clients').select('id, full_name, tenant_id, tenants(business_name)')`)

---

### 7.5 — Colonna `starts_at` inesistente in `listTenantAppointments`

**File:** `apps/web/src/app/admin/actions-data.ts`, righe 112–114

La funzione `listTenantAppointments` (la versione semplice, NON quella `Detailed`) usa `starts_at` come nome di colonna, ma la tabella `appointments` usa `start_time`. Questa query restituirà un errore Supabase runtime oppure una colonna vuota per ogni appuntamento.

La versione `listTenantAppointmentsDetailed` (riga 374) usa correttamente `start_time` e funziona.

---

### 7.6 — `SUPABASE_SECRET_KEY`: naming non standard

**File:** `apps/web/src/lib/supabase/admin.ts`

Il client admin usa `process.env.SUPABASE_SECRET_KEY` che corrisponde alla chiave `service_role` di Supabase. Il naming "SECRET_KEY" è non convenzionale (Supabase consiglia `SUPABASE_SERVICE_ROLE_KEY`). La chiave è correttamente server-only (no prefisso `NEXT_PUBLIC_`), quindi non c'è rischio di esposizione client-side. Ma il naming confuso potrebbe portare errori di configurazione in ambienti di staging.

**Raccomandazione:** Rinominare in `SUPABASE_SERVICE_ROLE_KEY` e aggiornare `admin.ts` + `.env.example` + `.env.local`.

---

### 7.7 — Impersonation cookie (`IMPERSONATE_COOKIE`) non resettato correttamente

**File:** `apps/web/src/app/admin/actions-tenants.ts`, righe 270–285

La funzione `stopTenantImpersonation` setta il cookie con `maxAge: 0` per eliminarlo, ma la funzione `startTenantImpersonation` controlla se ci sono staff attivi nel tenant (`activeStaff > 0`) prima di permettere l'impersonation. Tuttavia il cookie contiene `tenant_id` (non `profile_id`), quindi il sistema non verifica quale profilo specifico viene impersonato — assume il primo owner attivo. Se il superadmin vuole impersonare uno staff specifico (non l'owner), non è possibile con l'implementazione attuale.

---

### 7.8 — `tags` in `createTenantClient` e `seedDemoClients` salvati come stringa JSON anziché JSONB

**File:** `apps/web/src/app/admin/actions-data.ts`, righe 154 e 220

```ts
tags: '["active"]'   // stringa JSON — incoerente con il tipo JSONB del DB
```

La colonna `clients.tags` è `jsonb` nel DB. Salvare una stringa JSON (`'["active"]'`) anziché un array nativo potrebbe causare comportamenti inattesi nelle query PostgreSQL che operano su JSONB (`@>`, `?`, `->>`). `importClientsForTenant` usa `JSON.stringify(tagsArr)` che ha lo stesso problema. `pwa-auth.ts` usa invece `tags: []` (array nativo) — corretto.

**Fix:** Usare array direttamente: `tags: ['active']` (Supabase JS serializza automaticamente in JSONB).

---

*Fine audit. Report generato il 2026-06-29.*
