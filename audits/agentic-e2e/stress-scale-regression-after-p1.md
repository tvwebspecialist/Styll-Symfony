# Stress & Scale Regression Audit after SS-01 / SS-02 / SS-03

**Date:** 2026-07-09  
**Scope:** regression audit after the three P1 performance fixes, with no code changes in this run  
**Performance verdict:** **PASS**

## 1. Executive summary

The three original P1 performance findings are now **effectively closed**:

- **SS-01 CRM clienti** no longer does a full-tenant load; pagination, search, and churn filters are server-side and the rendered payload is page-bounded.
- **SS-02 Vendite / analytics** now uses SQL RPCs with bounded query shapes and supporting indexes instead of the old app-layer fan-out.
- **SS-03 Client analytics recompute** is now set-based, tenant-scopeable, cron-protected, and avoids duplicate churn alerts.

I did **not** find a new open **P1 performance** issue in the audited areas. The remaining scale debt is still **P2** in:

1. dashboard home
2. calendario
3. PWA home inventory
4. booking PWA fan-out

One required command still failed:

- `pnpm test:e2e` could not start because port `3000` was already in use (`EADDRINUSE`).

That full-suite failure does **not** change the performance verdict, because the verdict requested for this audit is specifically tied to the presence or absence of open **P1 performance** issues, and the targeted SS-01/SS-02/SS-03 stress specs all passed on an alternate local port.

## 2. Requested verdict summary

| Check | Result | Notes |
| --- | --- | --- |
| P1 chiusi | **Sì** | SS-01, SS-02, SS-03 are closed as P1 performance findings. |
| Nuovi P1 | **No** | No remaining/new P1 performance issue surfaced in the re-audit. |
| P2 rimasti | **Sì** | Dashboard home, calendario, PWA home inventory, booking PWA fan-out remain open. |
| Prossima priorità consigliata | **Dashboard home** | Broadest day-to-day staff impact among the remaining P2s. |

## 3. SS-01 — CRM clienti

**Verdict:** **Closed as P1**

### Why it now passes the original criteria

1. **Pagination server-side**
   - The dashboard page passes `page`, `pageSize`, `query`, and `filter` from `searchParams` into `getClienti()` in the server component, not in a client-only post-filter path: `apps/web/src/app/tenant/dashboard/[slug]/clienti/page.tsx:8-27`, `apps/web/src/app/dashboard/clienti/page.tsx:8-27`.
   - `getClienti()` applies `.range(from, to)` on the `clients` query: `apps/web/src/lib/actions/clienti.ts:471-509`.
   - The list is explicitly bounded to `25` by default and `100` max: `apps/web/src/lib/clienti-list.ts:1-2`.

2. **Search/filter server-side**
   - Search is pushed into the SQL query through `buildClientSearchOrFilter()` + `.or(searchOr)`: `apps/web/src/lib/actions/clienti.ts:359-362,473-491`.
   - Churn filters are pushed into the query via `client_analytics.churn_status` / inactive join logic: `apps/web/src/lib/actions/clienti.ts:455-503`.

3. **Payload bounded**
   - Only the selected page of clients is rendered and stress-tested as bounded HTML: `apps/web/tests/clienti-stress-scale-pagination.spec.ts:466-517`.
   - The large-tenant regression spec asserts one-page rendering and a max HTML threshold: `apps/web/tests/clienti-stress-scale-pagination.spec.ts:503-517`.

4. **No full tenant load**
   - After the page query, the action only fetches appointments, loyalty rows, service rows, and product rows for the **current page client IDs**, not for the whole tenant: `apps/web/src/lib/actions/clienti.ts:550-621`.

### Residual note

The page still recomputes spend/visit summaries from raw appointment/service/product rows for the visible clients, and the count badges still use exact count queries: `apps/web/src/lib/actions/clienti.ts:364-395,420-439,550-621`. That is remaining efficiency debt, but it is **not** the old full-tenant P1.

## 4. SS-02 — Vendite / analytics

**Verdict:** **Closed as P1**

### Why it now passes the original criteria

1. **RPC aggregate usate**
   - `getRiepilogo()` now uses `get_sales_summary`: `apps/web/src/lib/actions/vendite.ts:62-117`.
   - `getAppuntamentiVendite()` now uses `get_sales_appointments`: `apps/web/src/lib/actions/vendite.ts:138-176`.
   - `getProdottiVenduti()` now uses `get_sales_products`: `apps/web/src/lib/actions/vendite.ts:193-224`.

2. **Niente fan-out ID intermedi**
   - The app layer no longer collects appointment IDs and then fans out into multiple follow-up queries. The shaping happens inside SQL RPCs: `apps/web/src/lib/actions/vendite.ts:62-224`, `supabase/migrations/20260709103000_vendite_aggregations.sql:21-308`.

3. **Indici presenti**
   - The migration adds explicit indexes for appointment range scans, completed appointment range scans, appointment line items, inventory joins, and payment joins: `supabase/migrations/20260709103000_vendite_aggregations.sql:1-19`.

4. **Query bounded**
   - `get_sales_summary` is bounded by date windows over `base_appointments`: `supabase/migrations/20260709103000_vendite_aggregations.sql:47-145`.
   - `get_sales_products` is bounded by `p_from` / `p_to` for sold appointments: `supabase/migrations/20260709103000_vendite_aggregations.sql:165-210`.
   - `get_sales_appointments` is bounded by filters and capped with `LIMIT 200`: `supabase/migrations/20260709103000_vendite_aggregations.sql:233-307`.

5. **Regression evidence**
   - The dedicated stress spec verifies tenant isolation, summary correctness, bounded payloads, and large-tenant behavior: `apps/web/tests/vendite-stress-scale.spec.ts:847-968`.

### Residual note

`get_sales_products()` still aggregates tenant inventory in one CTE before joining back to sold products: `supabase/migrations/20260709103000_vendite_aggregations.sql:188-210`. That is worth monitoring, but it does **not** re-open the old P1 query shape.

## 5. SS-03 — Client analytics recompute

**Verdict:** **Closed as P1**

### Why it now passes the original criteria

1. **Set-based**
   - The recompute path is now a set-based `WITH ... INSERT ... ON CONFLICT` flow inside `recompute_client_analytics_scope()`: `supabase/migrations/20260709120000_set_based_client_analytics_recompute.sql:14-145`.

2. **Niente loop cliente-per-cliente**
   - The new migration contains no client loop; the stress spec explicitly guards against the old `FOR ... LOOP` shape: `supabase/migrations/20260709120000_set_based_client_analytics_recompute.sql:14-145`, `apps/web/tests/client-analytics-recompute-stress-scale.spec.ts:575-620`.

3. **Tenant-scoped recompute**
   - `recompute_tenant_client_analytics(p_tenant_id)` is available as a dedicated tenant-scoped RPC: `supabase/migrations/20260709120000_set_based_client_analytics_recompute.sql:178-187`.
   - The stress spec verifies tenant A recompute does not leak into tenant B: `apps/web/tests/client-analytics-recompute-stress-scale.spec.ts:488-573`.

4. **Cron protetto**
   - The route checks `CRON_SECRET` and rejects requests without the expected `Authorization` header before any DB work: `apps/web/src/app/api/cron/recalculate-analytics/handler.ts:106-123`.
   - The auth behavior is covered by tests: `apps/web/tests/client-analytics-recompute-stress-scale.spec.ts:335-464`.

5. **No notifiche duplicate**
   - Alerts are sent only on deterioration (`unknown|green -> yellow`, any worsening to `red`) via `isDeterioration()`: `apps/web/src/app/api/cron/recalculate-analytics/handler.ts:56-63,149-186`.
   - The auth/handler test asserts that only a worsening transition generates an alert: `apps/web/tests/client-analytics-recompute-stress-scale.spec.ts:428-463`.

### Residual note

The cron handler still snapshots `client_analytics` before and after the bulk recompute to diff alert transitions: `apps/web/src/app/api/cron/recalculate-analytics/handler.ts:127-147`. That cost scales with total analytics rows, but the old P1 blocker was the **client-by-client recompute loop**, and that blocker is gone.

## 6. P2 recheck

These four P2 findings remain open. I did **not** see changes that justify promoting them to new P1s, but I also did **not** find evidence that they are closed.

| Area | Status | Why it remains open |
| --- | --- | --- |
| Dashboard home | **P2 remains** | `getDashboardHomeData()` still performs multiple live appointment scans (`today`, `week`, `previous week`, `yesterday`), an at-risk lookup, then a separate `client_loyalty` top-10 query on every request: `apps/web/src/lib/actions/dashboard-home.ts:108-174,181-194,283-299`. This matches the old P2 shape already documented in `audits/agentic-e2e/stress-scale-report.md:122-143`. |
| Calendario | **P2 remains** | `getCalendarioData()` still issues one wide week appointment query with nested relations, plus full tenant fetches for `staff_members`, `working_hours`, and `working_hour_overrides`: `apps/web/src/lib/actions/calendario.ts:343-376,378-435`. This matches the old P2 shape in `audits/agentic-e2e/stress-scale-report.md:145-166`. |
| PWA home inventory | **P2 remains** | `getHomePageData()` still fetches **all** `product_inventory` rows for the tenant, builds an in-memory map, and only then filters the eight visible products: `apps/web/src/lib/actions/pwa-home.ts:156-184,196-203`. This matches the old P2 finding in `audits/agentic-e2e/stress-scale-report.md:168-183`. |
| Booking PWA fan-out | **P2 remains** | The cold path in `getPublicStaffByLocationImpl()` still fans out across `staff_locations -> staff_members -> staff_services -> services -> working_hours`; `unstable_cache` helps repeated hits, but not the initial query shape: `apps/web/src/lib/actions/booking-public.ts:112-220,223-230`. This matches the old P2 finding in `audits/agentic-e2e/stress-scale-report.md:185-203`. |

## 7. Recommended next priority

**Dashboard home** should be next.

It is still the most broadly user-facing remaining P2 because it runs on a core staff entry surface and still executes several live appointment/loyalty reads per request instead of using lighter summaries or cache-backed aggregates: `apps/web/src/lib/actions/dashboard-home.ts:108-174,181-194,283-299`.

Recommended order after that:

1. dashboard home
2. calendario
3. PWA home inventory
4. booking PWA fan-out

## 8. Command results

| Command | Result | Notes |
| --- | --- | --- |
| `supabase db push --yes` | **PASS** | Remote database was already up to date. |
| `pnpm type-check` | **PASS** | Root script completed successfully. |
| `pnpm build` | **PASS** | Production build completed successfully. |
| `pnpm test:e2e` | **FAIL** | Playwright web server failed to bind to port `3000`: `listen EADDRINUSE :::3000`. |
| `cd apps/web && NEXT_PUBLIC_APP_URL=http://localhost:3100 pnpm exec playwright test tests/clienti-stress-scale-pagination.spec.ts tests/vendite-stress-scale.spec.ts tests/client-analytics-recompute-stress-scale.spec.ts` | **PASS** | Extra targeted evidence: **9/9** SS-01 / SS-02 / SS-03 stress tests passed on an alternate port. |

## 9. Final verdict

**PASS** — the three original P1 performance issues are closed, I did not find a remaining/new P1 performance regression, and the remaining debt is still in the previously known **P2** tier.
