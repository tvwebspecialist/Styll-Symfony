CREATE INDEX IF NOT EXISTS appointments_vendite_range_idx
  ON public.appointments (tenant_id, start_time DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS appointments_vendite_completed_range_idx
  ON public.appointments (tenant_id, start_time DESC)
  WHERE deleted_at IS NULL AND status = 'completed';

CREATE INDEX IF NOT EXISTS appointment_services_tenant_appointment_idx
  ON public.appointment_services (tenant_id, appointment_id);

CREATE INDEX IF NOT EXISTS appointment_products_tenant_appointment_idx
  ON public.appointment_products (tenant_id, appointment_id);

CREATE INDEX IF NOT EXISTS product_inventory_tenant_product_idx
  ON public.product_inventory (tenant_id, product_id);

CREATE INDEX IF NOT EXISTS payments_tenant_appointment_idx
  ON public.payments (tenant_id, appointment_id);

CREATE OR REPLACE FUNCTION public.get_sales_summary(
  p_tenant_id uuid,
  p_today_start timestamptz,
  p_today_end timestamptz,
  p_week_start timestamptz,
  p_month_start timestamptz,
  p_month_end timestamptz,
  p_prev_month_start timestamptz,
  p_prev_month_end timestamptz
)
RETURNS TABLE (
  revenue_today numeric,
  revenue_week numeric,
  revenue_month numeric,
  revenue_previous_month numeric,
  revenue_services_month numeric,
  revenue_products_month numeric,
  appointments_completed_today bigint,
  appointments_completed_month bigint,
  top_service_name text,
  top_service_count bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH base_appointments AS (
    SELECT a.id, a.start_time
    FROM public.appointments AS a
    WHERE a.tenant_id = p_tenant_id
      AND a.status = 'completed'
      AND a.deleted_at IS NULL
      AND a.start_time >= LEAST(p_prev_month_start, p_week_start, p_today_start)
      AND a.start_time <= GREATEST(p_month_end, p_prev_month_end, p_today_end)
  ),
  service_totals AS (
    SELECT
      ba.id AS appointment_id,
      COALESCE(SUM(aps.price_at_booking), 0)::numeric AS service_total
    FROM base_appointments AS ba
    LEFT JOIN public.appointment_services AS aps
      ON aps.appointment_id = ba.id
     AND aps.tenant_id = p_tenant_id
    GROUP BY ba.id
  ),
  product_totals AS (
    SELECT
      ba.id AS appointment_id,
      COALESCE(SUM(COALESCE(ap.price_at_sale, 0) * COALESCE(ap.quantity, 1)), 0)::numeric AS product_total
    FROM base_appointments AS ba
    LEFT JOIN public.appointment_products AS ap
      ON ap.appointment_id = ba.id
     AND ap.tenant_id = p_tenant_id
    GROUP BY ba.id
  ),
  appointment_totals AS (
    SELECT
      ba.id,
      ba.start_time,
      COALESCE(st.service_total, 0)::numeric AS service_total,
      COALESCE(pt.product_total, 0)::numeric AS product_total,
      (COALESCE(st.service_total, 0) + COALESCE(pt.product_total, 0))::numeric AS total_revenue
    FROM base_appointments AS ba
    LEFT JOIN service_totals AS st ON st.appointment_id = ba.id
    LEFT JOIN product_totals AS pt ON pt.appointment_id = ba.id
  ),
  summary AS (
    SELECT
      COALESCE(SUM(at.total_revenue) FILTER (
        WHERE at.start_time >= p_today_start AND at.start_time <= p_today_end
      ), 0)::numeric AS revenue_today,
      COALESCE(SUM(at.total_revenue) FILTER (
        WHERE at.start_time >= p_week_start AND at.start_time <= p_today_end
      ), 0)::numeric AS revenue_week,
      COALESCE(SUM(at.total_revenue) FILTER (
        WHERE at.start_time >= p_month_start AND at.start_time <= p_month_end
      ), 0)::numeric AS revenue_month,
      COALESCE(SUM(at.total_revenue) FILTER (
        WHERE at.start_time >= p_prev_month_start AND at.start_time <= p_prev_month_end
      ), 0)::numeric AS revenue_previous_month,
      COALESCE(SUM(at.service_total) FILTER (
        WHERE at.start_time >= p_month_start AND at.start_time <= p_month_end
      ), 0)::numeric AS revenue_services_month,
      COALESCE(SUM(at.product_total) FILTER (
        WHERE at.start_time >= p_month_start AND at.start_time <= p_month_end
      ), 0)::numeric AS revenue_products_month,
      COUNT(*) FILTER (
        WHERE at.start_time >= p_today_start AND at.start_time <= p_today_end
      )::bigint AS appointments_completed_today,
      COUNT(*) FILTER (
        WHERE at.start_time >= p_month_start AND at.start_time <= p_month_end
      )::bigint AS appointments_completed_month
    FROM appointment_totals AS at
  ),
  top_service AS (
    SELECT
      COALESCE(s.name, 'Servizio') AS top_service_name,
      COUNT(*)::bigint AS top_service_count
    FROM base_appointments AS ba
    JOIN public.appointment_services AS aps
      ON aps.appointment_id = ba.id
     AND aps.tenant_id = p_tenant_id
    LEFT JOIN public.services AS s
      ON s.id = aps.service_id
     AND s.tenant_id = p_tenant_id
    WHERE ba.start_time >= p_month_start
      AND ba.start_time <= p_month_end
    GROUP BY aps.service_id, COALESCE(s.name, 'Servizio')
    ORDER BY COUNT(*) DESC, COALESCE(s.name, 'Servizio')
    LIMIT 1
  )
  SELECT
    summary.revenue_today,
    summary.revenue_week,
    summary.revenue_month,
    summary.revenue_previous_month,
    summary.revenue_services_month,
    summary.revenue_products_month,
    summary.appointments_completed_today,
    summary.appointments_completed_month,
    top_service.top_service_name,
    top_service.top_service_count
  FROM summary
  LEFT JOIN top_service ON TRUE;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_products(
  p_tenant_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS TABLE (
  product_id uuid,
  product_name text,
  brand text,
  total_qty bigint,
  total_revenue numeric,
  current_stock bigint,
  low_stock_alert boolean
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH filtered_appointments AS (
    SELECT a.id
    FROM public.appointments AS a
    WHERE a.tenant_id = p_tenant_id
      AND a.deleted_at IS NULL
      AND a.start_time >= p_from
      AND a.start_time <= p_to
  ),
  sold_products AS (
    SELECT
      ap.product_id,
      COALESCE(p.name, '—') AS product_name,
      p.brand,
      COALESCE(SUM(COALESCE(ap.quantity, 1)), 0)::bigint AS total_qty,
      COALESCE(SUM(COALESCE(ap.price_at_sale, 0) * COALESCE(ap.quantity, 1)), 0)::numeric AS total_revenue
    FROM public.appointment_products AS ap
    JOIN filtered_appointments AS fa ON fa.id = ap.appointment_id
    LEFT JOIN public.products AS p
      ON p.id = ap.product_id
     AND p.tenant_id = p_tenant_id
    WHERE ap.tenant_id = p_tenant_id
    GROUP BY ap.product_id, COALESCE(p.name, '—'), p.brand
  ),
  inventory AS (
    SELECT
      pi.product_id,
      COALESCE(SUM(COALESCE(pi.quantity, 0)), 0)::bigint AS current_stock,
      MAX(COALESCE(pi.low_stock_threshold, 0))::integer AS low_stock_threshold
    FROM public.product_inventory AS pi
    WHERE pi.tenant_id = p_tenant_id
    GROUP BY pi.product_id
  )
  SELECT
    sp.product_id,
    sp.product_name,
    sp.brand,
    sp.total_qty,
    sp.total_revenue,
    COALESCE(inv.current_stock, 0)::bigint AS current_stock,
    CASE
      WHEN inv.product_id IS NULL THEN FALSE
      ELSE COALESCE(inv.current_stock, 0) <= COALESCE(inv.low_stock_threshold, 0)
    END AS low_stock_alert
  FROM sold_products AS sp
  LEFT JOIN inventory AS inv ON inv.product_id = sp.product_id
  ORDER BY sp.total_revenue DESC, sp.product_name ASC;
$$;

CREATE OR REPLACE FUNCTION public.get_sales_appointments(
  p_tenant_id uuid,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  start_time timestamptz,
  status text,
  client_name text,
  staff_name text,
  service_names text[],
  total_amount numeric,
  paid_amount numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH filtered_appointments AS (
    SELECT
      a.id,
      a.start_time,
      a.status,
      a.client_id,
      a.staff_id
    FROM public.appointments AS a
    WHERE a.tenant_id = p_tenant_id
      AND a.deleted_at IS NULL
      AND (p_date_from IS NULL OR a.start_time >= p_date_from)
      AND (p_date_to IS NULL OR a.start_time <= p_date_to)
      AND (p_status IS NULL OR a.status = p_status)
    ORDER BY a.start_time DESC
    LIMIT 200
  ),
  service_lines AS (
    SELECT
      fa.id AS appointment_id,
      COALESCE(
        ARRAY_AGG(COALESCE(s.name, '') ORDER BY aps.created_at, aps.id)
          FILTER (WHERE aps.id IS NOT NULL),
        '{}'::text[]
      ) AS service_names,
      COALESCE(SUM(aps.price_at_booking), 0)::numeric AS service_total
    FROM filtered_appointments AS fa
    LEFT JOIN public.appointment_services AS aps
      ON aps.appointment_id = fa.id
     AND aps.tenant_id = p_tenant_id
    LEFT JOIN public.services AS s
      ON s.id = aps.service_id
     AND s.tenant_id = p_tenant_id
    GROUP BY fa.id
  ),
  product_totals AS (
    SELECT
      fa.id AS appointment_id,
      COALESCE(SUM(COALESCE(ap.price_at_sale, 0) * COALESCE(ap.quantity, 1)), 0)::numeric AS product_total
    FROM filtered_appointments AS fa
    LEFT JOIN public.appointment_products AS ap
      ON ap.appointment_id = fa.id
     AND ap.tenant_id = p_tenant_id
    GROUP BY fa.id
  ),
  payment_totals AS (
    SELECT
      fa.id AS appointment_id,
      COALESCE(SUM(COALESCE(p.amount, 0)), 0)::numeric AS paid_amount
    FROM filtered_appointments AS fa
    LEFT JOIN public.payments AS p
      ON p.appointment_id = fa.id
     AND p.tenant_id = p_tenant_id
    GROUP BY fa.id
  )
  SELECT
    fa.id,
    fa.start_time,
    fa.status,
    COALESCE(c.full_name, '—') AS client_name,
    COALESCE(pr.full_name, '—') AS staff_name,
    COALESCE(sl.service_names, '{}'::text[]) AS service_names,
    (COALESCE(sl.service_total, 0) + COALESCE(pt.product_total, 0))::numeric AS total_amount,
    COALESCE(pay.paid_amount, 0)::numeric AS paid_amount
  FROM filtered_appointments AS fa
  LEFT JOIN public.clients AS c
    ON c.id = fa.client_id
   AND c.tenant_id = p_tenant_id
  LEFT JOIN public.staff_members AS sm
    ON sm.id = fa.staff_id
   AND sm.tenant_id = p_tenant_id
  LEFT JOIN public.profiles AS pr ON pr.id = sm.profile_id
  LEFT JOIN service_lines AS sl ON sl.appointment_id = fa.id
  LEFT JOIN product_totals AS pt ON pt.appointment_id = fa.id
  LEFT JOIN payment_totals AS pay ON pay.appointment_id = fa.id
  ORDER BY fa.start_time DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_sales_summary(
  uuid,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_summary(
  uuid,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz,
  timestamptz
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_sales_products(uuid, timestamptz, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_products(uuid, timestamptz, timestamptz)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.get_sales_appointments(uuid, timestamptz, timestamptz, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_appointments(uuid, timestamptz, timestamptz, text)
  TO service_role;
