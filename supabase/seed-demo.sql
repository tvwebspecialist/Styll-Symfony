-- ============================================================
-- Seed dati demo — Styll Client PWA
-- ============================================================
-- Questo file crea un tenant demo completo per testare il
-- booking flow end-to-end.
--
-- COME USARLO
-- -----------
-- 1. Aprire Supabase Dashboard → SQL Editor
-- 2. Incollare questo file ed eseguirlo
-- 3. Leggere la sezione "⚠️ STAFF MEMBER" più in basso:
--    richiede un passo manuale prima di poter testare il booking.
--
-- PULIZIA
-- -------
-- Per rimuovere tutti i dati demo:
--   DELETE FROM public.tenants WHERE slug = 'demo-marco';
-- (cascade elimina locations, services, staff, appointments, ecc.)
-- ============================================================


-- ──────────────────────────────────────────────
-- 0. Costanti — aggiorna questi UUID se necessario
-- ──────────────────────────────────────────────
-- I fixed UUID facilitano l'idempotenza: l'insert non duplica
-- se eseguito più volte (grazie agli ON CONFLICT DO NOTHING).

DO $$
DECLARE
  v_tenant_id   uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  v_loc_id      uuid := 'aaaaaaaa-0002-0001-0001-000000000001';
  v_svc1        uuid := 'aaaaaaaa-0003-0001-0001-000000000001';
  v_svc2        uuid := 'aaaaaaaa-0003-0002-0001-000000000001';
  v_svc3        uuid := 'aaaaaaaa-0003-0003-0001-000000000001';
  v_svc4        uuid := 'aaaaaaaa-0003-0004-0001-000000000001';
  v_svc5        uuid := 'aaaaaaaa-0003-0005-0001-000000000001';
BEGIN

  -- ──────────────────────────────────────────────
  -- 1. Tenant
  -- ──────────────────────────────────────────────
  INSERT INTO public.tenants (
    id, business_name, slug, timezone,
    primary_color, secondary_color, font_family,
    status, settings
  )
  VALUES (
    v_tenant_id,
    'Marco Ferretti Barber',
    'demo-marco',
    'Europe/Rome',
    '#1a1a2e',
    '#e94560',
    'outfit',
    'active',
    '{}'
  )
  ON CONFLICT (id) DO NOTHING;

  -- ──────────────────────────────────────────────
  -- 2. Location
  -- ──────────────────────────────────────────────
  INSERT INTO public.locations (
    id, tenant_id, name, address, city, phone, is_active
  )
  VALUES (
    v_loc_id,
    v_tenant_id,
    'Marco Ferretti Barber',
    'Via Roma 42',
    'Napoli',
    '+39 081 123 4567',
    true
  )
  ON CONFLICT (id) DO NOTHING;

  -- ──────────────────────────────────────────────
  -- 3. Servizi
  -- ──────────────────────────────────────────────
  INSERT INTO public.services (
    id, tenant_id, name, price, duration_minutes,
    category, display_order, is_active
  )
  VALUES
    (v_svc1, v_tenant_id, 'Taglio Classico',  18, 30, 'Taglio', 1, true),
    (v_svc2, v_tenant_id, 'Taglio + Barba',   28, 45, 'Taglio', 2, true),
    (v_svc3, v_tenant_id, 'Rifinitura Barba', 12, 20, 'Barba',  3, true),
    (v_svc4, v_tenant_id, 'Shampoo + Taglio', 25, 45, 'Taglio', 4, true),
    (v_svc5, v_tenant_id, 'Colorazione',      45, 60, 'Colore', 5, true)
  ON CONFLICT (id) DO NOTHING;

  -- ──────────────────────────────────────────────
  -- 4. Loyalty config
  -- ──────────────────────────────────────────────
  INSERT INTO public.loyalty_configs (
    tenant_id, template, points_per_visit,
    streak_threshold_days, version, started_at
  )
  VALUES (
    v_tenant_id,
    'classic',
    100,
    45,
    1,
    now()
  )
  ON CONFLICT DO NOTHING;

  -- ──────────────────────────────────────────────
  -- 5. Rewards
  -- ──────────────────────────────────────────────
  INSERT INTO public.rewards (
    tenant_id, name, description,
    points_cost, reward_type, display_order, is_active
  )
  VALUES
    (
      v_tenant_id,
      'Prodotto Styling',
      'Un prodotto a scelta dal nostro banco',
      800, 'product', 1, true
    ),
    (
      v_tenant_id,
      'Rifinitura Gratis',
      'Rifinitura barba completamente gratis',
      1200, 'service', 2, true
    ),
    (
      v_tenant_id,
      'Taglio Gratis',
      'Un taglio completo in omaggio',
      2000, 'service', 3, true
    )
  ON CONFLICT DO NOTHING;

  -- ──────────────────────────────────────────────
  -- 6. Promozione attiva
  -- ──────────────────────────────────────────────
  INSERT INTO public.promotions (
    tenant_id, title, description,
    discount_type, discount_value,
    valid_from, valid_until,
    show_on_landing, show_in_app, is_active, display_order
  )
  VALUES (
    v_tenant_id,
    '🎉 Primo Taglio -20%',
    'Per i nuovi clienti, il primo taglio con uno sconto speciale del 20%.',
    'percent',
    20,
    now(),
    now() + interval '30 days',
    true, true, true, 1
  )
  ON CONFLICT DO NOTHING;

END $$;


-- ============================================================
-- ⚠️  STAFF MEMBER — PASSO MANUALE OBBLIGATORIO
-- ============================================================
-- `staff_members.profile_id` è NOT NULL con FK verso auth.users.
-- Non puoi inserire uno staff "phantom" senza un utente reale.
--
-- HAI 2 OPZIONI:
--
-- OPZIONE A — Usare un utente esistente (raccomandato)
-- ─────────────────────────────────────────────────────
-- 1. Vai su Supabase Dashboard → Authentication → Users
-- 2. Copia il UUID di un utente già esistente (es. te stesso)
-- 3. Esegui le query qui sotto sostituendo YOUR_USER_UUID
--
-- OPZIONE B — Creare un utente demo
-- ─────────────────────────────────
-- 1. Vai su Supabase Dashboard → Authentication → Users → Add user
-- 2. Email: demo-staff@styll.it  Password: Demo1234!
-- 3. Copia il UUID generato automaticamente
-- 4. Esegui le query qui sotto sostituendo YOUR_USER_UUID
--
-- Sostituisci YOUR_USER_UUID e YOUR_PROFILE_NAME qui sotto:
-- ============================================================

/*

-- Step 1: Assicurati che esista un profilo per questo utente
INSERT INTO public.profiles (id, full_name, role)
VALUES (
  'YOUR_USER_UUID',            -- UUID da auth.users
  'Marco Ferretti',            -- Nome visualizzato nel booking
  'owner'
)
ON CONFLICT (id) DO UPDATE
  SET full_name = EXCLUDED.full_name;

-- Step 2: Crea lo staff member
INSERT INTO public.staff_members (
  id, tenant_id, profile_id, role, bio, is_active
)
VALUES (
  'aaaaaaaa-0004-0001-0001-000000000001',
  'aaaaaaaa-0001-0001-0001-000000000001',  -- demo-marco tenant
  'YOUR_USER_UUID',                         -- ← sostituisci
  'owner',
  'Barbiere professionista con 10 anni di esperienza.',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Associa lo staff alla location
INSERT INTO public.staff_locations (staff_id, location_id)
VALUES (
  'aaaaaaaa-0004-0001-0001-000000000001',
  'aaaaaaaa-0002-0001-0001-000000000001'
)
ON CONFLICT DO NOTHING;

-- Step 4: Associa lo staff ai servizi
INSERT INTO public.staff_services (staff_id, service_id, tenant_id)
VALUES
  ('aaaaaaaa-0004-0001-0001-000000000001', 'aaaaaaaa-0003-0001-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001'),
  ('aaaaaaaa-0004-0001-0001-000000000001', 'aaaaaaaa-0003-0002-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001'),
  ('aaaaaaaa-0004-0001-0001-000000000001', 'aaaaaaaa-0003-0003-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001'),
  ('aaaaaaaa-0004-0001-0001-000000000001', 'aaaaaaaa-0003-0004-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001'),
  ('aaaaaaaa-0004-0001-0001-000000000001', 'aaaaaaaa-0003-0005-0001-000000000001', 'aaaaaaaa-0001-0001-0001-000000000001')
ON CONFLICT DO NOTHING;

-- Step 5: Orari lavorativi (Lun-Sab, 9:00-19:00)
-- day_of_week: 0=dom, 1=lun, 2=mar, 3=mer, 4=gio, 5=ven, 6=sab
INSERT INTO public.working_hours (staff_id, day_of_week, start_time, end_time)
VALUES
  ('aaaaaaaa-0004-0001-0001-000000000001', 1, '09:00', '19:00'),
  ('aaaaaaaa-0004-0001-0001-000000000001', 2, '09:00', '19:00'),
  ('aaaaaaaa-0004-0001-0001-000000000001', 3, '09:00', '19:00'),
  ('aaaaaaaa-0004-0001-0001-000000000001', 4, '09:00', '19:00'),
  ('aaaaaaaa-0004-0001-0001-000000000001', 5, '09:00', '19:00'),
  ('aaaaaaaa-0004-0001-0001-000000000001', 6, '09:00', '14:00')
ON CONFLICT DO NOTHING;

*/

-- ============================================================
-- VERIFICA (esegui dopo aver completato il passo manuale)
-- ============================================================
-- SELECT t.business_name, t.slug, t.status,
--        COUNT(DISTINCT l.id) AS locations,
--        COUNT(DISTINCT s.id) AS services,
--        COUNT(DISTINCT sm.id) AS staff,
--        COUNT(DISTINCT wh.id) AS working_hours
-- FROM public.tenants t
-- LEFT JOIN public.locations l       ON l.tenant_id = t.id
-- LEFT JOIN public.services s        ON s.tenant_id = t.id
-- LEFT JOIN public.staff_members sm  ON sm.tenant_id = t.id
-- LEFT JOIN public.working_hours wh  ON wh.staff_id = sm.id
-- WHERE t.slug = 'demo-marco'
-- GROUP BY t.business_name, t.slug, t.status;
-- ============================================================
