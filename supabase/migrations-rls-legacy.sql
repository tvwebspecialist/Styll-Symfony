-- =============================================================
-- migrations-rls-legacy.sql
-- Estratto automaticamente dalle migrations Supabase.
-- Contiene tutte le RLS policy che usano auth.uid(), auth.jwt(),
-- trigger su auth.users, e policy Supabase-specifiche.
-- NON eseguire su PostgreSQL self-hosted — serve solo come riferimento
-- per la riscrittura del layer di autenticazione in Symfony.
-- =============================================================


-- === 20260425000001_profiles.sql ===
3:-- Profili utente (collegati a auth.users) + RLS + trigger di
10:  id uuid primary key references auth.users(id) on delete cascade,
63:  using (auth.uid() = id);
68:  with check (auth.uid() = id);
73:  using (auth.uid() = id)
74:  with check (auth.uid() = id);
106:drop trigger if exists on_auth_user_created on auth.users;
108:  after insert on auth.users

-- === 20260425000003_avatars_storage.sql ===
16:    and auth.role() = 'authenticated'
17:    and auth.uid()::text = (storage.foldername(name))[1]
24:    and auth.uid()::text = (storage.foldername(name))[1]
28:    and auth.uid()::text = (storage.foldername(name))[1]
35:    and auth.uid()::text = (storage.foldername(name))[1]

-- === 20260425000005_superadmin.sql ===
22:    (select p.is_superadmin from public.profiles p where p.id = auth.uid()),

-- === 20260426000001_admin_v2.sql ===
5:  actor_id uuid references auth.users(id) on delete set null,
25:      where p.id = auth.uid() and p.is_superadmin = true
34:  updated_by uuid references auth.users(id) on delete set null
44:      where p.id = auth.uid() and p.is_superadmin = true
50:      where p.id = auth.uid() and p.is_superadmin = true
74:      where p.id = auth.uid() and p.is_superadmin = true
80:      where p.id = auth.uid() and p.is_superadmin = true

-- === 20260427000001_portfolio.sql ===
41:        and sm.profile_id = auth.uid()
52:        and sm.profile_id = auth.uid()
59:        and sm.profile_id = auth.uid()
77:    and auth.role() = 'authenticated'
84:    and auth.role() = 'authenticated'
88:    and auth.role() = 'authenticated'
95:    and auth.role() = 'authenticated'

-- === 20260430000001_team_invitations.sql ===
45:        and sm.profile_id = auth.uid()
60:        and sm.profile_id = auth.uid()
65:    and created_by = auth.uid()
76:        and sm.profile_id = auth.uid()

-- === 20260501000001_client_analytics.sql ===
36:  WHERE profile_id = auth.uid()
43:ALTER TABLE public.client_analytics ENABLE ROW LEVEL SECURITY;
45:DROP POLICY IF EXISTS analytics_tenant_select ON public.client_analytics;
46:CREATE POLICY analytics_tenant_select ON public.client_analytics

-- === 20260513000001_rls_realtime_appointments.sql ===
31:ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
41:CREATE POLICY "appointments_select_staff"
48:      WHERE sm.profile_id  = auth.uid()
58:CREATE POLICY "appointments_select_client"
65:      WHERE c.profile_id = auth.uid()
75:--    If `supabase_realtime` publication does not exist yet, Supabase
78:ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
90:--   SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- === 20260514000001_service_categories.sql ===
16:ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
19:  CREATE POLICY "service_categories_tenant_access"
26:        WHERE sm.profile_id = auth.uid()
35:  CREATE POLICY "service_categories_admin_access"

-- === 20260521000001_gallery.sql ===
19:        where profile_id = auth.uid() and is_active = true and deleted_at is null

-- === 20260601000001_client_import_jobs.sql ===
8:  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
23:ALTER TABLE client_import_jobs ENABLE ROW LEVEL SECURITY;
25:DROP POLICY IF EXISTS "tenant members read import jobs" ON client_import_jobs;
26:CREATE POLICY "tenant members read import jobs" ON client_import_jobs
30:      WHERE profile_id = auth.uid() AND is_active = true

-- === 20260604000001_product_wishlist_and_is_new.sql ===
14:ALTER TABLE client_product_wishlist ENABLE ROW LEVEL SECURITY;
16:CREATE POLICY "wishlist_service_all"
23:CREATE POLICY "wishlist_owner_read"
30:      WHERE profile_id = auth.uid()

-- === 20260604170537_product_wishlist_and_is_new.sql ===
15:ALTER TABLE client_product_wishlist ENABLE ROW LEVEL SECURITY;
18:CREATE POLICY "wishlist_service_all"
25:CREATE POLICY "wishlist_owner_read"
32:      WHERE profile_id = auth.uid()

-- === 20260612131537_email_verification.sql ===
17:ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- === 20260616000001_public_pwa_rls.sql ===
57:ALTER TABLE public.promotions             ENABLE ROW LEVEL SECURITY;
58:ALTER TABLE public.services               ENABLE ROW LEVEL SECURITY;
59:ALTER TABLE public.locations              ENABLE ROW LEVEL SECURITY;
60:ALTER TABLE public.staff_members          ENABLE ROW LEVEL SECURITY;
61:ALTER TABLE public.staff_locations        ENABLE ROW LEVEL SECURITY;
62:ALTER TABLE public.staff_services         ENABLE ROW LEVEL SECURITY;
63:ALTER TABLE public.working_hours          ENABLE ROW LEVEL SECURITY;
64:ALTER TABLE public.working_hour_overrides ENABLE ROW LEVEL SECURITY;
65:ALTER TABLE public.loyalty_configs        ENABLE ROW LEVEL SECURITY;
66:ALTER TABLE public.rewards                ENABLE ROW LEVEL SECURITY;
67:ALTER TABLE public.tenants                ENABLE ROW LEVEL SECURITY;
79:  CREATE POLICY "public_read_active_tenants"
86:  CREATE POLICY "public_read_active_services"
93:  CREATE POLICY "public_read_active_locations"
100:  CREATE POLICY "public_read_active_staff"
107:  CREATE POLICY "public_read_staff_locations"
114:  CREATE POLICY "public_read_staff_services"
121:  CREATE POLICY "public_read_working_hours"
128:  CREATE POLICY "public_read_working_hour_overrides"
137:  CREATE POLICY "public_read_appointments_for_slots"
147:  CREATE POLICY "public_read_active_promotions"
157:  CREATE POLICY "public_read_loyalty_configs"
164:  CREATE POLICY "public_read_active_rewards"

-- === 20260619000001_email_verification.sql ===
23:ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- === 20260620000001_gamification_v2.sql ===
28:ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
31:CREATE POLICY "badges_select_staff" ON public.badges FOR SELECT
35:      WHERE sm.profile_id = auth.uid()
43:CREATE POLICY "badges_select_client" ON public.badges FOR SELECT
48:      WHERE c.profile_id = auth.uid()
68:ALTER TABLE public.client_badges ENABLE ROW LEVEL SECURITY;
71:CREATE POLICY "client_badges_select_staff" ON public.client_badges FOR SELECT
75:      WHERE sm.profile_id = auth.uid()
83:CREATE POLICY "client_badges_select_client" ON public.client_badges FOR SELECT
87:      WHERE c.profile_id = auth.uid()
135:ALTER TABLE public.tier_configs ENABLE ROW LEVEL SECURITY;
137:CREATE POLICY "tier_configs_select_staff" ON public.tier_configs FOR SELECT
141:      WHERE sm.profile_id = auth.uid()
148:CREATE POLICY "tier_configs_select_client" ON public.tier_configs FOR SELECT
152:      WHERE c.profile_id = auth.uid()

-- === 20260621000001_push_notifications.sql ===
22:ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
25:CREATE POLICY "service_role_all" ON push_subscriptions
50:ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
52:CREATE POLICY "service_role_all" ON notification_log

-- === 20260623000001_inventory_movements.sql ===
15:ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
17:CREATE POLICY "inventory_movements_select_staff"
22:      WHERE sm.profile_id = auth.uid()
28:CREATE POLICY "inventory_movements_insert_staff"
33:      WHERE sm.profile_id = auth.uid()

-- === 20260624000001_notifications_realtime.sql ===
11:-- 3. Adds the notifications table to the supabase_realtime publication.
18:ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
21:--    Wrapped in a DO block to be idempotent (no CREATE POLICY IF NOT EXISTS).
31:      CREATE POLICY notifications_select_staff
38:            WHERE sm.profile_id = auth.uid()
54:    WHERE pubname   = 'supabase_realtime'
57:    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
73:--   SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

-- === 20260625184339_gamification_v2.sql ===
21:ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
23:CREATE POLICY "badges_select_staff" ON public.badges FOR SELECT
27:      WHERE sm.profile_id = auth.uid()
34:CREATE POLICY "badges_select_client" ON public.badges FOR SELECT
39:      WHERE c.profile_id = auth.uid()
57:ALTER TABLE public.client_badges ENABLE ROW LEVEL SECURITY;
59:CREATE POLICY "client_badges_select_staff" ON public.client_badges FOR SELECT
63:      WHERE sm.profile_id = auth.uid()
70:CREATE POLICY "client_badges_select_client" ON public.client_badges FOR SELECT
74:      WHERE c.profile_id = auth.uid()
110:ALTER TABLE public.tier_configs ENABLE ROW LEVEL SECURITY;
112:CREATE POLICY "tier_configs_select_staff" ON public.tier_configs FOR SELECT
116:      WHERE sm.profile_id = auth.uid()
123:CREATE POLICY "tier_configs_select_client" ON public.tier_configs FOR SELECT
127:      WHERE c.profile_id = auth.uid()

-- === 20260625184401_inventory_movements_with_return.sql ===
13:ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
15:CREATE POLICY "inventory_movements_select_staff"
20:      WHERE sm.profile_id = auth.uid()
26:CREATE POLICY "inventory_movements_insert_staff"
31:      WHERE sm.profile_id = auth.uid()

-- === 20260626000001_promotion_services_products_rls.sql ===
43:ALTER TABLE public.promotion_services ENABLE ROW LEVEL SECURITY;
44:ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;
49:  CREATE POLICY "public_read_promotion_services"
55:  CREATE POLICY "public_read_promotion_products"

-- === 20260630133207_create_platform_notifications.sql ===
25:ALTER PUBLICATION supabase_realtime ADD TABLE platform_notifications;
36:ALTER TABLE platform_notifications ENABLE ROW LEVEL SECURITY;
38:CREATE POLICY "superadmin_select_platform_notifications"
43:      WHERE id = auth.uid() AND is_superadmin = true
47:CREATE POLICY "superadmin_update_platform_notifications"
52:      WHERE id = auth.uid() AND is_superadmin = true

-- === 20260704000001_site_analytics.sql ===
108:ALTER TABLE public.platform_leads ENABLE ROW LEVEL SECURITY;
110:DROP POLICY IF EXISTS "superadmin all platform_leads" ON public.platform_leads;
111:CREATE POLICY "superadmin all platform_leads"
114:    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_superadmin = true)
118:ALTER TABLE public.site_sessions ENABLE ROW LEVEL SECURITY;
120:DROP POLICY IF EXISTS "owner manager reads site_sessions" ON public.site_sessions;
121:CREATE POLICY "owner manager reads site_sessions"
127:      WHERE profile_id = auth.uid()
136:ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY;
138:DROP POLICY IF EXISTS "owner manager reads site_events" ON public.site_events;
139:CREATE POLICY "owner manager reads site_events"
145:      WHERE profile_id = auth.uid()
154:ALTER TABLE public.site_analytics_daily ENABLE ROW LEVEL SECURITY;
156:DROP POLICY IF EXISTS "owner manager reads site_analytics_daily" ON public.site_analytics_daily;
157:CREATE POLICY "owner manager reads site_analytics_daily"
163:      WHERE profile_id = auth.uid()

-- === 20260705000001_tighten_public_pwa_rls.sql ===
10:DROP POLICY IF EXISTS "public_read_active_tenants" ON public.tenants;
11:DROP POLICY IF EXISTS "public_read_active_services" ON public.services;
12:DROP POLICY IF EXISTS "public_read_active_locations" ON public.locations;
13:DROP POLICY IF EXISTS "public_read_active_staff" ON public.staff_members;
14:DROP POLICY IF EXISTS "public_read_staff_locations" ON public.staff_locations;
15:DROP POLICY IF EXISTS "public_read_staff_services" ON public.staff_services;
16:DROP POLICY IF EXISTS "public_read_working_hours" ON public.working_hours;
17:DROP POLICY IF EXISTS "public_read_working_hour_overrides" ON public.working_hour_overrides;
18:DROP POLICY IF EXISTS "public_read_appointments_for_slots" ON public.appointments;
19:DROP POLICY IF EXISTS "public_read_active_promotions" ON public.promotions;
20:DROP POLICY IF EXISTS "public_read_loyalty_configs" ON public.loyalty_configs;
21:DROP POLICY IF EXISTS "public_read_active_rewards" ON public.rewards;
22:DROP POLICY IF EXISTS "public_read_promotion_services" ON public.promotion_services;
23:DROP POLICY IF EXISTS "public_read_promotion_products" ON public.promotion_products;

-- === 20260705000002_restrict_push_notification_rls.sql ===
10:DROP POLICY IF EXISTS "service_role_all" ON public.push_subscriptions;
11:DROP POLICY IF EXISTS "service_role_all" ON public.notification_log;
13:CREATE POLICY "push_subscriptions_service_role_all"
20:CREATE POLICY "notification_log_service_role_all"

-- === 20260706175500_protect_profiles_privileged_updates.sql ===
19:  jwt_role text := auth.role();
34:  if auth.uid() is null then
39:  if old.id is distinct from auth.uid() or new.id is distinct from auth.uid() then

-- === 20260706181000_lock_portfolio_storage_by_tenant.sql ===
43:      where sm.profile_id = auth.uid()
55:    and auth.role() = 'authenticated'
60:      where sm.profile_id = auth.uid()
72:    and auth.role() = 'authenticated'
77:      where sm.profile_id = auth.uid()
85:    and auth.role() = 'authenticated'
90:      where sm.profile_id = auth.uid()
102:    and auth.role() = 'authenticated'
107:      where sm.profile_id = auth.uid()

-- === 20260706184500_harden_security_definer_rpcs.sql ===
32:  where profile_id = auth.uid()

-- === 20260706193000_harden_booking_pwa_rls_and_realtime.sql ===
24:      where actor.profile_id = auth.uid()
41:        and c.profile_id = auth.uid()
57:      where actor.profile_id = auth.uid()
62:    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
72:      where actor.profile_id = auth.uid()
77:    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
83:      where actor.profile_id = auth.uid()
88:    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
105:      where actor.profile_id = auth.uid()
126:      where actor.profile_id = auth.uid()
138:    and clients.profile_id = auth.uid()
148:      where actor.profile_id = auth.uid()
164:        and c.profile_id = auth.uid()
176:      where actor.profile_id = auth.uid()
192:        and c.profile_id = auth.uid()
204:      where actor.profile_id = auth.uid()
220:        and c.profile_id = auth.uid()
244:      where actor.profile_id = auth.uid()
258:      where actor.profile_id = auth.uid()
272:      where actor.profile_id = auth.uid()
286:      where actor.profile_id = auth.uid()
300:      where actor.profile_id = auth.uid()
314:      where actor.profile_id = auth.uid()
328:      where actor.profile_id = auth.uid()
342:      where actor.profile_id = auth.uid()
356:      where actor.profile_id = auth.uid()

-- === 20260706194500_fix_staff_membership_policy_recursion.sql ===
17:    where sm.profile_id = auth.uid()
42:    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
51:    and (notifications.profile_id is null or notifications.profile_id = auth.uid())
55:    and (notifications.profile_id is null or notifications.profile_id = auth.uid())

-- === 20260707000001_client_notifications_rls.sql ===
7:--     1. SELECT their own notifications (profile_id = auth.uid())
19:--   invisible to clients because NULL != auth.uid() (NULL != anything).
27:ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
39:      CREATE POLICY notifications_select_own
42:        USING (auth.uid() = profile_id)
60:      CREATE POLICY notifications_update_own_read
63:        USING (auth.uid() = profile_id)
64:        WITH CHECK (auth.uid() = profile_id)

-- === 20260707120000_harden_tenant_insert_storage_and_definer_fns.sql ===
20:DROP POLICY IF EXISTS "tenants_insert_owner" ON public.tenants;
28:DROP POLICY IF EXISTS "avatars_public_read"          ON storage.objects;
29:DROP POLICY IF EXISTS "locations_public_read"        ON storage.objects;
30:DROP POLICY IF EXISTS "Immagini prodotti pubbliche"  ON storage.objects;
31:DROP POLICY IF EXISTS "public read gfxl4g_0"         ON storage.objects;
32:DROP POLICY IF EXISTS "tenants_public_read"          ON storage.objects;
34:DROP POLICY IF EXISTS "public read 1desggg_0"        ON storage.objects;

-- === 20260709065237_onboarding_tokens.sql ===
6:  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
18:ALTER TABLE onboarding_tokens ENABLE ROW LEVEL SECURITY;;

-- === 20260711120000_consent_events_f05.sql ===
98:ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

-- === 20260711170000_analytics_consent_events_f06.sql ===
57:ALTER TABLE public.analytics_consent_events ENABLE ROW LEVEL SECURITY;

-- === 20260713090000_b2c_data_subject_rights_f08.sql ===
52:ALTER TABLE public.client_privacy_requests ENABLE ROW LEVEL SECURITY;
67:      CREATE POLICY client_privacy_requests_service_role_all
88:      CREATE POLICY client_privacy_requests_select_own
92:        USING (auth.uid() = profile_id)
108:      CREATE POLICY client_privacy_requests_select_staff_same_tenant

-- === 20260714193000_b2b_terms_acceptance.sql ===
26:  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
50:ALTER TABLE public.legal_acceptance_events ENABLE ROW LEVEL SECURITY;
71:  consumed_by_user_id uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
85:ALTER TABLE public.legal_acceptance_pending ENABLE ROW LEVEL SECURITY;

-- === 20260715001000_b2b_terms_acceptance_digest_fix.sql ===
191:    UPDATE auth.users

-- === 20260717093000_messaging_inbox_foundation.sql ===
105:      where actor.profile_id = auth.uid()
181:      where actor.profile_id = auth.uid()
242:      where actor.profile_id = auth.uid()
348:      where actor.profile_id = auth.uid()
392:      where actor.profile_id = auth.uid()
429:      where actor.profile_id = auth.uid()
474:      where actor.profile_id = auth.uid()
518:      where actor.profile_id = auth.uid()

-- EOF
