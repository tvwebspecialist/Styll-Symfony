# Stress & Scale Final Regression

**Date:** 2026-07-09  
**Scope:** final regression after SS-01, SS-02, SS-03, SS-04, SS-05, SS-06, SS-07  
**Final verdict:** **PASS**

## 1. Executive summary

The seven audited performance findings are now closed at the **P1/P2** level:

- **SS-01** CRM clienti
- **SS-02** Vendite / analytics
- **SS-03** Client analytics recompute
- **SS-04** Dashboard home
- **SS-05** Calendario
- **SS-06** PWA home inventory
- **SS-07** Booking PWA staff/location

I did **not** find a remaining **P1** or **P2** performance bottleneck in the audited surfaces. The remaining known scale debt is now in **P3**, primarily:

1. **SS-08** public tenant landing route
2. **SS-09** CSV import DB path

## 2. Cosa è stato verificato

This regression checked:

- **CRM clienti**: server-side pagination, server-side search/filter, bounded page payload, no full-tenant client/appointment load
- **Vendite / analytics**: RPC aggregates, bounded date windows, no app-layer ID fan-out, supporting indexes
- **Client analytics recompute**: set-based recompute, no client-by-client loop, tenant scope, protected cron, no duplicate deterioration alerts
- **Dashboard home**: bounded appointment window instead of repeated wide scans, no unused loyalty fetch in the current UI path
- **Calendario**: flattened appointment fetch, scoped appointment-service enrichment, scoped staff/working-hours/override reads
- **PWA home inventory**: visible products fetched first, inventory fetched only for those product IDs
- **Booking PWA**: location-scoped staff snapshot reused across staff/service steps, fewer roundtrips, location/service-bounded reads
- **Supabase query shape**: each fixed path now uses narrower filters, smaller follow-up fetches, or SQL-side aggregates compared to the original audit
- **Payload size**: large simulated dataset tests still assert bounded payload/HTML on the relevant surfaces
- **Tenant isolation**: area-specific stress tests and broader isolation suites continue to pass
- **Test coverage**: targeted stress tests now exist for all SS-01 through SS-07 surfaces

## 3. Area-by-area final status

| ID | Area | Final status | Why it now passes |
| --- | --- | --- | --- |
| SS-01 | CRM clienti | **Closed** | `getClienti()` paginates with `.range()`, pushes search/filter into the query, and only loads appointments/loyalty/services/products for the visible page IDs instead of the whole tenant (`apps/web/src/lib/actions/clienti.ts:398-675`). |
| SS-02 | Vendite / analytics | **Closed** | Sales summary, appointments, and products all run through bounded RPCs (`apps/web/src/lib/actions/vendite.ts:62-224`) backed by the aggregation/index migration (`supabase/migrations/20260709103000_vendite_aggregations.sql`). |
| SS-03 | Client analytics recompute | **Closed** | Recompute is now set-based via `recompute_client_analytics_scope()` with tenant/client scoping and no per-client loop (`supabase/migrations/20260709120000_set_based_client_analytics_recompute.sql:14-215`). |
| SS-04 | Dashboard home | **Closed** | A single bounded appointment window now feeds today/week/yesterday/previous-week data, while only the current staff’s working hours are fetched (`apps/web/src/lib/actions/dashboard-home.ts:186-335`). |
| SS-05 | Calendario | **Closed** | The base week query is flatter, appointment services are loaded only for visible `appointment_id`s, and staff/hours/overrides are limited to the visible staff scope (`apps/web/src/lib/actions/calendario.ts:332-450`). |
| SS-06 | PWA home inventory | **Closed** | `getVisibleHomeProducts()` fetches visible products first, then loads `product_inventory` only for those product IDs (`apps/web/src/lib/actions/pwa-home.ts:181-244`). |
| SS-07 | Booking PWA | **Closed** | A location-scoped booking staff snapshot now joins the relevant staff, services, and working hours once and is reused across booking actions (`apps/web/src/lib/actions/booking-public.ts:92-280`, `apps/web/src/lib/actions/public-booking.ts:607-907`). |

## 4. Supabase query / payload / isolation assessment

### Supabase query shape

The main performance regressions originally came from:

- full-tenant loads
- repeated scans over the same appointment window
- app-layer fan-out after broad ID collection
- tenant-wide staff/inventory/hour reads when only a visible subset was needed

Those patterns are no longer present in the audited SS-01 through SS-07 paths:

- **CRM** scopes secondary reads to the current page client IDs.
- **Vendite** delegates aggregation to SQL RPCs with bounded windows.
- **Recompute** runs set-based in SQL.
- **Dashboard home** uses one appointment window instead of separate today/week/previous/yesterday appointment scans.
- **Calendario** splits a flat week fetch from a smaller appointment-services fetch scoped to visible appointments and visible staff.
- **PWA home** uses `product_id IN (...)` on the visible product slice.
- **Booking PWA** uses a location-scoped reusable snapshot instead of re-fanning across staff/services/hours each step.

### Payload size

Bounded payload coverage is now explicit in the stress specs:

- `apps/web/tests/clienti-stress-scale-pagination.spec.ts:503-517`
- `apps/web/tests/vendite-stress-scale.spec.ts:942-968`
- `apps/web/tests/dashboard-home-stress-scale.spec.ts:518-535`
- `apps/web/tests/calendario-stress-scale.spec.ts:662-686`
- `apps/web/tests/pwa-home-inventory-bounded.spec.ts:279-299`
- `apps/web/tests/booking-pwa-staff-bounded.spec.ts:450-486`

### Tenant isolation

Tenant isolation still looks healthy both in surface-specific tests and in broader safety suites:

- CRM/Vendite/Recompute/Home/Calendario/PWA/Booking stress specs all assert cross-tenant absence where relevant
- broader isolation suites still pass, including:
  - `apps/web/tests/realtime-tenant-isolation.spec.ts`
  - `apps/web/tests/notification-write-isolation.spec.ts`
  - `apps/web/tests/portfolio-storage-isolation.spec.ts`

### Test coverage

The stress-and-scale coverage now spans all fixed items:

1. `apps/web/tests/clienti-stress-scale-pagination.spec.ts`
2. `apps/web/tests/vendite-stress-scale.spec.ts`
3. `apps/web/tests/client-analytics-recompute-stress-scale.spec.ts`
4. `apps/web/tests/dashboard-home-stress-scale.spec.ts`
5. `apps/web/tests/calendario-stress-scale.spec.ts`
6. `apps/web/tests/pwa-home-inventory-bounded.spec.ts`
7. `apps/web/tests/booking-pwa-staff-bounded.spec.ts`

That is a material improvement over the original audit because the fixed paths are now guarded by dedicated regression tests for correctness, isolation, and bounded behavior.

## 5. Residual P1 / P2 / P3

| Class | Residual? | Notes |
| --- | --- | --- |
| P1 performance | **No** | No audited surface still shows a P1-scale shape. |
| P2 performance | **No** | SS-04, SS-05, SS-06, and SS-07 are no longer open after the latest fixes. |
| P3 performance | **Yes** | SS-08 landing route and SS-09 CSV import DB path remain the most credible leftover scale debt from the original report (`audits/agentic-e2e/stress-scale-report.md:205-247`). |

### Remaining P3

1. **SS-08 — Landing route**
   - still the highest-traffic public surface
   - repeated tenant reads / heavy rendering path were not part of this fix series
2. **SS-09 — CSV import DB path**
   - parser is fine, but the DB merge path still reads all tenant clients and applies serialized updates in the original audit

I did **not** find evidence that either P3 has become a new P1/P2 blocker in this final regression, but they remain the best next scale targets.

## 6. Command results

| Command | Result | Notes |
| --- | --- | --- |
| `supabase db push --yes` | **PASS** | Remote database already up to date. |
| `pnpm type-check` | **PASS** | Root type-check completed successfully. |
| `pnpm build` | **PASS** | Production build completed successfully. |
| `pnpm test:e2e` | **PASS** | Full E2E suite passed: **70 passed**. |

## 7. Prossima priorità consigliata

**SS-08 public landing performance** is the next recommended priority.

Reason:

- it is still the highest-traffic remaining performance surface
- it was already measured as expensive in the original stress audit
- unlike CSV import, it affects the public acquisition path continuously rather than an occasional operational workflow

After that, **SS-09 CSV import DB path** is the next best follow-up.

## 8. Final verdict

**PASS** — after SS-01 through SS-07, I do **not** see remaining **P1** or **P2** performance blockers in the audited surfaces. The remaining scale work is now **P3**, with landing-route optimization as the most sensible next step.
