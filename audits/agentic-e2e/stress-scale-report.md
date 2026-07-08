# Stress & Scale Audit

**Date:** 2026-07-08  
**Scope:** dashboard, calendar, CRM, CSV import, booking PWA, loyalty, notifications, vendite/analytics, Supabase query patterns, indexes, RLS overhead, Next/React rendering, bundle/route heaviness  
**Code changes:** none  

## 1. Executive summary

**Verdict: FAIL**

Styll is **not yet ready for the target dataset** below without significant performance work on CRM, analytics/vendite, dashboard data loading, and some public/PWA query paths.

### Target dataset

- 100 tenant
- 500 staff
- 50.000 clienti
- 300.000 appuntamenti
- 20.000 record loyalty
- 100.000 notifiche
- 10.000 servizi/prodotti

### Measurement baseline actually observed

The connected Supabase dataset at audit time was **much smaller** than the launch target:

| Table | Count | Count query time |
| --- | ---:| ---:|
| `tenants` | 161 | 2009 ms |
| `staff_members` | 80 | 577 ms |
| `clients` | 91 | 467 ms |
| `appointments` | 79 | 408 ms |
| `client_loyalty` | 1 | 448 ms |
| `notifications` | 98 | 392 ms |
| `services` | 75 | 228 ms |
| `products` | 7 | 305 ms |

The heaviest tenant found in the live dataset had only:

- **36 clients**
- **54 appointments**
- **46 notifications**
- **1 active staff**

That means the findings below are based on:

1. **Measured timings on current data**
2. **Static review of query shapes and rendering paths**
3. **Projection against the stated launch target**

Even on this small baseline, some core paths are already too expensive.

## 2. Tabella P1/P2/P3

| ID | Priority | Area | Scenario | Volume target impacted | Tempo misurato | Route/query coinvolta | Sintesi |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SS-01 | **P1** | CRM clienti | Dashboard clienti con ricerca/filtri | 50k clients / 300k appointments | `clients` base query **254.7 ms** for 36 rows; appointments scan **172.3 ms** for 54 rows | `apps/web/src/lib/actions/clienti.ts:276-468`, `apps/web/src/components/dashboard/clienti/ClientiClient.tsx:203-220` | Carica e processa l’intero tenant in memoria, poi filtra lato client. |
| SS-02 | **P1** | Vendite / analytics | KPI mese e riepiloghi vendite | 300k appointments | monthly completed-ID lookup **1341.5 ms** for **0 rows**; vendite relation query **683.7 ms** for 54 rows | `apps/web/src/lib/actions/vendite.ts:58-153, 187-247` | Pattern query già lento su dataset minuscolo; a target volume diventa bloccante. |
| SS-03 | **P1** | Analytics recompute / cron | Recompute giornaliero analytics clienti | 50k clients / 300k appointments | non eseguito live per evitare mutazioni; rischio derivato da shape O(clienti × appuntamenti per cliente) | `supabase/migrations/20260501000001_client_analytics.sql:71-163`, `apps/web/src/app/api/cron/recalculate-analytics/route.ts:72-147` | Job set-based incompleto: la bulk recompute richiama logica costosa per cliente. |
| SS-04 | **P2** | Dashboard home | Home dashboard con KPI, today/week/yesterday, loyalty, at-risk | 300k appointments / 20k loyalty | today appointments **541.7 ms** for 1 row; week appointments **193.8 ms** for 3 rows | `apps/web/src/lib/actions/dashboard-home.ts:108-300` | Più scan larghi su `appointments` e `client_loyalty` ad ogni richiesta. |
| SS-05 | **P2** | Calendario giorno/settimana | Week view con relazioni servizi/promozioni + staff/hours/overrides | 300k appointments / 500 staff | **133.0 ms** for 4 rows | `apps/web/src/lib/actions/calendario.ts:317-436` | Query unica molto “larga”, più dataset staff/orari completi. |
| SS-06 | **P2** | PWA home / catalogo | Home cliente con inventory scan | 10k prodotti / multi-location inventory | `product_inventory` scan **181.1 ms** for 10 rows | `apps/web/src/lib/actions/pwa-home.ts:148-177, 245-320` | Somma tutto `product_inventory` del tenant per determinare disponibilità prodotti. |
| SS-07 | **P2** | Booking PWA | Step pubblico staff/location | 500 staff / 10k servizi | staff-location step1 **221.6 ms** with 0 returned rows | `apps/web/src/lib/actions/booking-public.ts:112-230` | Fan-out multi-step su `staff_locations` → `staff_members` → `staff_services` → `services` → `working_hours`. |
| SS-08 | **P3** | Landing / frontend | Landing tenant high-traffic path | 100 tenants / high public traffic | tenant-by-slug query **1783.5 ms cold**, **238.6 ms warm** | `apps/web/src/app/tenant/landing/[slug]/layout.tsx:23-80, 96-139`, `page.tsx:35-145`, `apps/web/src/lib/tenant.ts` | Più read e molto JS/animazione sulla superficie più visitata. |
| SS-09 | **P3** | CSV import | Import fino a 10k righe | 50k clients + 10k import rows | pure import planning **9.4 ms** at 10k rows | `apps/web/src/lib/actions/clienti.ts:1028-1116`, `apps/web/src/lib/utils/client-import-core.ts:190-260` | La parte CPU pura è buona, ma il path DB legge tutti i clienti del tenant e applica merge sequenziali. |

## 3. Evidenza per ogni finding

### SS-01 — CRM clienti non scala

`getClienti()`:

- carica **tutti** i client del tenant
- carica **tutti** gli appointment del tenant
- carica loyalty e analytics del tenant
- poi carica `appointment_services` e `appointment_products` per **tutti** gli appointment completati
- calcola spesa/visite in memoria

**Code path**

- `apps/web/src/lib/actions/clienti.ts:276-468`
- `apps/web/src/components/dashboard/clienti/ClientiClient.tsx:203-220`

**Measured timings on current heaviest tenant**

- clients base query: **254.7 ms** for **36 rows**
- appointments scan: **172.3 ms** for **54 rows**

This is already a lot of work before reaching any meaningful dataset size.

### SS-02 — Vendite / analytics già lente su volumi piccoli

`getRiepilogo()` first collects appointment IDs for ranges, then fans out to services/products and top-service lookups:

- `apps/web/src/lib/actions/vendite.ts:58-153`

`getAppuntamentiVendite()` loads appointments with nested relations:

- `apps/web/src/lib/actions/vendite.ts:187-247`

**Measured timings**

- `vendite_month_completed_ids`: **1341.5 ms** for **0 completed appointments**
- `vendite_appointments_with_relations`: **683.7 ms** for **54 rows**

This is the strongest measured signal in the audit: the query pattern is expensive even when almost nothing matches.

### SS-03 — Daily analytics recompute is algorithmically risky

The analytics migration defines:

- per-client recompute logic with windowing over appointments
- a “recompute all” function that iterates client-by-client

**Code path**

- `supabase/migrations/20260501000001_client_analytics.sql:71-163`
- `apps/web/src/app/api/cron/recalculate-analytics/route.ts:72-147`

I did **not** execute the live recompute because it mutates shared analytics/notifications state, but the current implementation is still the clearest scale blocker in the data plane. At 50k clients / 300k appointments it is likely to dominate the nightly job window.

### SS-04 — Dashboard home does too much every request

`getDashboardHomeData()` currently performs:

- today appointments
- week appointments
- previous-week stats
- yesterday stats
- at-risk clients
- top loyalty clients
- working hours

**Code path**

- `apps/web/src/lib/actions/dashboard-home.ts:108-300`

**Measured timings**

- `dashboard_today_appointments`: **541.7 ms** for **1 row**
- `dashboard_week_appointments`: **193.8 ms** for **3 rows**

The measured numbers are already high relative to the tiny row counts.

### SS-05 — Calendar week/day is query-wide and relation-heavy

`getCalendarioData()` loads:

- all appointments in the requested week
- nested client names
- nested appointment services + promotions
- all active staff
- all working hours
- all overrides in the week

**Code path**

- `apps/web/src/lib/actions/calendario.ts:317-436`

**Measured timing**

- `calendar_week_with_relations`: **133.0 ms** for **4 rows**

This is acceptable today but structurally dangerous for dense week views and multi-staff tenants.

### SS-06 — PWA home scans inventory table tenant-wide

`getHomePageData()` fetches:

- visible products
- **all** `product_inventory` rows for the tenant
- visible services
- then aggregates inventory in memory

**Code path**

- `apps/web/src/lib/actions/pwa-home.ts:148-177, 245-320`

**Measured timing**

- `pwa_home_inventory_scan`: **181.1 ms** for **10 rows**

The full-tenant inventory scan does not stay cheap at 10k products × multi-location stock rows.

### SS-07 — Booking PWA staff/location step fans out across multiple tables

The public booking staff lookup path:

- loads staff IDs for location
- loads staff rows
- loads all staff-service mappings
- loads active services
- loads working hours

**Code path**

- `apps/web/src/lib/actions/booking-public.ts:112-230`

**Measured timing**

- `public_booking_staff_by_location_step1`: **221.6 ms** with **0 rows returned**

This indicates non-trivial overhead even before meaningful result volume appears.

### SS-08 — Landing route is heavier than it needs to be

The landing surface:

- reads tenant data in metadata/layout/page paths
- renders many sections server-side
- uses client-side animation and JS on the highest-traffic route

**Code path**

- `apps/web/src/app/tenant/landing/[slug]/layout.tsx:23-80, 96-139`
- `apps/web/src/app/tenant/landing/[slug]/page.tsx:35-145`
- `apps/web/src/lib/tenant.ts`

**Measured timing**

- repeated tenant-by-slug lookup:
  - first call: **1783.5 ms**
  - subsequent calls: **602.5 ms**, **249.4 ms**, **238.6 ms**

Even if some of this is remote latency + cold path effect, this is still too costly for a high-traffic public landing route.

### SS-09 — CSV import parser is fine, but the DB path will not stay fine

The pure import planner performs well:

- `apps/web/src/lib/utils/client-import-core.ts:190-260`

**Measured timing**

- `client_import_plan_10k`: **9.4 ms** for **10,000 rows**

However the action path still:

- reads **all existing clients** in the tenant
- applies updates **sequentially**
- inserts in chunks of 500

**Code path**

- `apps/web/src/lib/actions/clienti.ts:1028-1116`

So parser CPU is not the issue; the scaling risk is tenant-wide DB reads and serialized merge writes.

## 4. Impatto

| ID | Impatto |
| --- | --- |
| SS-01 | CRM page becomes unusable at launch-scale tenant sizes; high SSR latency, memory growth, and huge client payloads. |
| SS-02 | Vendite/analytics UX degrades and backend cost spikes; current measured latency is already too high for low row counts. |
| SS-03 | Nightly analytics recompute can become a launch blocker or cron overrun under realistic client/appointment volumes. |
| SS-04 | Dashboard home becomes slow for every staff visit, especially for mega-tenants. |
| SS-05 | Calendar responsiveness degrades sharply for dense week views or multi-staff tenants. |
| SS-06 | PWA home will not scale with large product/inventory catalogs. |
| SS-07 | Public booking feels slow at large staff/service counts and multi-location salons. |
| SS-08 | Landing public performance and DB pressure are higher than necessary on the highest-traffic route. |
| SS-09 | CSV import stays acceptable only while tenant client lists remain small and duplicate merges remain rare. |

## 5. Fix consigliato

### SS-01 — CRM
- server-side pagination
- query-backed search/filter
- precomputed summary table or materialized view for:
  - total spent
  - total visits
  - last visit
  - churn status
- avoid loading all completed appointment services/products per tenant request

**Regression to add**
- dataset test with 50k clients / 300k appointments
- assert first page loads with bounded query count and bounded payload size

### SS-02 — Vendite / analytics
- pre-aggregate revenue by day/week/month
- avoid first querying `appointmentIdsInRange()` and then fanning out
- store “top services” in precomputed daily/monthly stats
- push monthly/weekly aggregates into a summary table

**Regression to add**
- measure monthly summary latency under 100k+ completed appointments

### SS-03 — Analytics recompute
- replace per-client recompute loop with a set-based query
- add / verify indexes on:
  - `appointments(tenant_id, client_id, status, deleted_at, start_time)`
  - partial completed-only variant if appropriate

**Regression to add**
- scheduled-job benchmark with 50k clients
- fail build/CI if recompute runtime crosses threshold

### SS-04 — Dashboard home
- split above-the-fold KPIs from heavier panels
- cache week/day aggregates per tenant
- remove repeated relation-heavy appointment scans when only summary numbers are needed

### SS-05 — Calendar
- scope visible staff/day/week more aggressively
- virtualize dense views
- denormalize calendar card summaries
- cache staff/hours/overrides separately from appointments

### SS-06 — PWA home
- avoid full `product_inventory` scan
- fetch only inventory for the products being shown
- cache product availability summary per tenant

### SS-07 — Booking PWA
- cache by `(tenantId, locationId)` and by `(tenantId, locationId, serviceIds)` where useful
- precompute staff/service availability summaries
- reduce multi-step fan-out before rendering the staff/date steps

### SS-08 — Landing
- reduce repeated tenant reads
- keep landing shell server-rendered, but lazy-load non-essential animation JS
- cap below-the-fold collections (portfolio/products/team) or lazy-load them

### SS-09 — CSV import
- keep parser as-is
- move duplicate resolution writes to batched UPSERT/merge strategy
- avoid full-tenant client read when import target is huge
- offload very large imports to async jobs

## 6. Priorità suggerita

1. **P1 now**
   - SS-01 CRM full-tenant load
   - SS-02 Vendite / analytics query shapes
   - SS-03 Client analytics recompute job
2. **P2 next**
   - SS-04 Dashboard home
   - SS-05 Calendar
   - SS-06 PWA home inventory scan
   - SS-07 Booking PWA fan-out
3. **P3 later**
   - SS-08 Landing over-fetch/animation overhead
   - SS-09 CSV import DB strategy

## 7. Cosa può aspettare

Can wait until after launch hardening begins, but should still be planned:

- landing bundle/animation trimming (SS-08)
- CSV import merge optimization (SS-09)

Should **not** wait if the launch expects even a few heavy tenants:

- CRM rewrite/pagination
- analytics recompute redesign
- vendite aggregation rewrite
- dashboard home query reduction

## 8. Verdict finale

**FAIL**

The current branch is **not ready for the stated launch-scale dataset** without substantial performance work.

The strongest blockers are:

1. **CRM tenants are loaded and filtered in-memory**
2. **Vendite / analytics query shapes are already expensive on tiny data**
3. **Daily client analytics recompute is structurally too costly for 50k clients**

### Command results for this audit run

| Command | Result |
| --- | --- |
| `pnpm type-check` | **PASS** |
| `pnpm build` | **PASS** (after rerun; intermittent Turbopack/CSS warnings remain) |
| `pnpm test:e2e` | **FAIL** in final stress-audit run due current test/dev-server instability unrelated to security fixes; not used as the primary scale verdict input |
