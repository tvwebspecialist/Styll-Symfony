## Table `subscription_plans`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `name` | `text` |  |
| `slug` | `text` |  Unique |
| `price_monthly` | `numeric` |  |
| `max_staff` | `int4` |  Nullable |
| `max_locations` | `int4` |  Nullable |
| `feature_flags` | `jsonb` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `tenants`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `business_name` | `text` |  |
| `slug` | `text` |  Unique |
| `timezone` | `text` |  |
| `logo_url` | `text` |  Nullable |
| `primary_color` | `text` |  Nullable |
| `secondary_color` | `text` |  Nullable |
| `font_family` | `text` |  Nullable |
| `settings` | `jsonb` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `tagline` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `hero_image_url` | `text` |  Nullable |
| `about_image_url` | `text` |  Nullable |
| `google_rating` | `numeric` |  Nullable |
| `google_reviews_count` | `int4` |  Nullable |
| `social_links` | `jsonb` |  Nullable |

## Table `locations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `name` | `text` |  |
| `address` | `text` |  Nullable |
| `city` | `text` |  Nullable |
| `zip_code` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `latitude` | `numeric` |  Nullable |
| `longitude` | `numeric` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `photo_url` | `text` |  Nullable |
| `photos` | `_text` |  Nullable |
| `show_on_website` | `bool` |  Nullable |

## Table `tenant_subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `plan_id` | `uuid` |  |
| `status` | `text` |  |
| `trial_ends_at` | `timestamptz` |  Nullable |
| `current_period_start` | `timestamptz` |  |
| `current_period_end` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_type` | `text` |  |
| `full_name` | `text` |  Nullable |
| `phone` | `text` |  Nullable |
| `avatar_url` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `email` | `text` |  Nullable |
| `work_mode` | `text` |  Nullable |
| `onboarding_completed` | `bool` |  Nullable |
| `is_superadmin` | `bool` |  |
| `bio` | `text` |  Nullable |
| `language` | `text` |  Nullable |
| `timezone` | `text` |  Nullable |
| `notification_preferences` | `jsonb` |  |

## Table `staff_members`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `profile_id` | `uuid` |  |
| `role` | `text` |  |
| `bio` | `text` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `show_on_website` | `bool` |  Nullable |
| `specialization` | `text` |  Nullable |
| `display_order` | `int4` |  Nullable |

## Table `staff_locations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `staff_id` | `uuid` |  |
| `location_id` | `uuid` |  |
| `created_at` | `timestamptz` |  |

## Table `services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `price` | `numeric` |  |
| `duration_minutes` | `int4` |  |
| `category` | `text` |  Nullable |
| `display_order` | `int4` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `color` | `text` |  Nullable |
| `show_on_website` | `bool` |  Nullable |

## Table `staff_services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `staff_id` | `uuid` |  |
| `service_id` | `uuid` |  |

## Table `products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `name` | `text` |  |
| `brand` | `text` |  Nullable |
| `price_sell` | `numeric` |  |
| `price_cost` | `numeric` |  Nullable |
| `sku` | `text` |  Nullable |
| `photo_url` | `text` |  Nullable |
| `category` | `text` |  Nullable |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `description` | `text` |  Nullable |
| `show_on_site` | `bool` |  |
| `display_order` | `int4` |  |
| `is_new` | `bool` |  |

## Table `product_inventory`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `location_id` | `uuid` |  |
| `quantity` | `int4` |  |
| `low_stock_threshold` | `int4` |  |
| `updated_at` | `timestamptz` |  |

## Table `clients`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `profile_id` | `uuid` |  Nullable |
| `full_name` | `text` |  |
| `phone` | `text` |  Nullable |
| `email` | `text` |  Nullable |
| `date_of_birth` | `date` |  Nullable |
| `preferred_contact_channel` | `text` |  Nullable |
| `marketing_consent` | `bool` |  |
| `tags` | `jsonb` |  |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `client_notes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `client_id` | `uuid` |  |
| `staff_id` | `uuid` |  |
| `note_text` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `working_hours`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `staff_id` | `uuid` |  |
| `day_of_week` | `int4` |  |
| `start_time` | `time` |  |
| `end_time` | `time` |  |
| `created_at` | `timestamptz` |  |
| `location_id` | `uuid` |  Nullable |

## Table `working_hour_overrides`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `staff_id` | `uuid` |  |
| `date` | `date` |  |
| `is_closed` | `bool` |  |
| `start_time` | `time` |  Nullable |
| `end_time` | `time` |  Nullable |
| `reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `appointments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `client_id` | `uuid` |  |
| `staff_id` | `uuid` |  |
| `location_id` | `uuid` |  |
| `start_time` | `timestamptz` |  |
| `end_time` | `timestamptz` |  |
| `status` | `text` |  |
| `booking_source` | `text` |  |
| `booked_by` | `uuid` |  Nullable |
| `notes` | `text` |  Nullable |
| `deleted_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `appointment_services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `appointment_id` | `uuid` |  |
| `service_id` | `uuid` |  |
| `price_at_booking` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## Table `appointment_products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `appointment_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `quantity` | `int4` |  |
| `price_at_sale` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## Table `payments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `appointment_id` | `uuid` |  Nullable |
| `client_id` | `uuid` |  |
| `amount` | `numeric` |  |
| `tip_amount` | `numeric` |  |
| `payment_method` | `text` |  |
| `status` | `text` |  |
| `notes` | `text` |  Nullable |
| `paid_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `loyalty_configs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `template` | `text` |  |
| `points_per_visit` | `int4` |  Nullable |
| `points_per_euro` | `int4` |  Nullable |
| `streak_threshold_days` | `int4` |  |
| `version` | `int4` |  |
| `started_at` | `timestamptz` |  |
| `ended_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `rewards`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `points_cost` | `int4` |  |
| `reward_type` | `text` |  |
| `display_order` | `int4` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `client_loyalty`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `client_id` | `uuid` |  |
| `total_points` | `int4` |  |
| `available_points` | `int4` |  |
| `current_streak` | `int4` |  |
| `longest_streak` | `int4` |  |
| `last_visit_date` | `date` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `loyalty_transactions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `client_id` | `uuid` |  |
| `type` | `text` |  |
| `points` | `int4` |  |
| `description` | `text` |  Nullable |
| `appointment_id` | `uuid` |  Nullable |
| `staff_id` | `uuid` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `reward_redemptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `client_id` | `uuid` |  |
| `reward_id` | `uuid` |  |
| `points_spent` | `int4` |  |
| `confirmed_by` | `uuid` |  Nullable |
| `confirmed_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `admin_audit_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `actor_id` | `uuid` |  Nullable |
| `action` | `text` |  |
| `entity_type` | `text` |  |
| `entity_id` | `text` |  Nullable |
| `tenant_id` | `uuid` |  Nullable |
| `details` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `admin_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `key` | `text` | Primary |
| `value` | `jsonb` |  |
| `updated_at` | `timestamptz` |  Nullable |
| `updated_by` | `uuid` |  Nullable |

## Table `email_templates`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `slug` | `text` |  Unique |
| `name` | `text` |  |
| `subject` | `text` |  |
| `body` | `text` |  |
| `variables` | `jsonb` |  Nullable |
| `is_active` | `bool` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  Nullable |

### Pattern — sendTemplatedEmail

Usare `sendTemplatedEmail()` in `src/lib/email.ts` per inviare qualsiasi email da template DB.
Legge il template via admin client (bypassa RLS), interpola `{{variabile}}` con regex globale,
wrappa in layout HTML brandizzato con `buildEmailHtml()`, invia via Resend.

```typescript
await sendTemplatedEmail({
  to: client.email,
  templateSlug: 'booking_confirmed',
  variables: { client_name: 'Luca', staff_name: 'Tommaso', date: '17 giugno', time: '10:00', services: 'Taglio' },
  tenant: { business_name: 'Tommy Barber', primary_color: '#1A1A2E' },
})
```

Variabile non trovata nel dict → `{{variabile}}` resta visibile (fail-safe, no crash).

### Template attivi in DB

| slug | evento | variabili |
|------|--------|-----------|
| `reminder` | Promemoria appuntamento (esiste già) | client_name, date, time, staff_name |
| `welcome` | Benvenuto cliente (esiste già) | client_name, business_name |
| `win_back` | Win-back cliente silenzioso (esiste già) | client_name, business_name, days |
| `booking_confirmed` | Prenotazione confermata | client_name, staff_name, date, time, services |
| `post_visit_thanks` | Ringraziamento post-visita | client_name, business_name |
| `review_request` | Richiesta recensione | client_name, business_name, review_url |
| `loyalty_points` | Punti guadagnati | client_name, points, total_points, business_name |
| `loyalty_streak` | Streak visite | client_name, streak, business_name |
| `loyalty_reward` | Premio sbloccato | client_name, reward_name, business_name |

## Table `portfolio_photos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `staff_id` | `uuid` |  Nullable |
| `photo_url` | `text` |  |
| `service_tags` | `_text` |  |
| `is_visible` | `bool` |  |
| `display_order` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `team_invitations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `email` | `text` |  |
| `token` | `text` |  Unique |
| `role` | `text` |  |
| `created_by` | `uuid` |  |
| `created_at` | `timestamptz` |  |
| `expires_at` | `timestamptz` |  |
| `accepted_at` | `timestamptz` |  Nullable |
| `status` | `text` |  |

## Table `client_analytics`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `client_id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `total_visits` | `int4` |  |
| `avg_frequency_days` | `numeric` |  Nullable |
| `last_visit_date` | `timestamptz` |  Nullable |
| `days_since_last_visit` | `int4` |  Nullable |
| `churn_status` | `text` |  |
| `computed_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

### Calcolo (Silent Churn Detector)

Aggiornata da cron giornaliero `/api/cron/recalculate-analytics` (06:00 UTC),
che chiama RPC `recompute_all_client_analytics()` (loop su
`recompute_client_analytics(p_client_id)` per ogni cliente non soft-deleted).

- `total_visits`: COUNT appointments con `status='completed'` AND `deleted_at IS NULL`
- `last_visit_date`: MAX(start_time) sui completed
- `avg_frequency_days`: media dei delta in giorni tra completed consecutivi
  (window function LAG); richiede `total_visits >= 2`, altrimenti NULL
- `days_since_last_visit`: `CURRENT_DATE - last_visit_date::date` (≥ 0)

Soglie semaforo churn (in `recompute_client_analytics`):
- `unknown` — `avg_frequency_days IS NULL` o nessuna visita
- `green`   — `days_since <= avg_frequency_days` (1.0x)
- `yellow`  — `days_since <= avg_frequency_days * 1.5`
- `red`     — oltre 1.5x

### Nota tecnica — invio push churn_alert

`insertStaffNotification` è **awaited** nelle server action/cron per garantire
l'esecuzione in Vercel Lambda. La funzione itera sugli staff attivi del tenant
con 2 SELECT + 1 chiamata web-push per membro.
Latenza stimata: 200-500ms per 1-5 staff. Accettabile oggi.
Con 10+ staff per tenant, considerare una coda asincrona vera (es. Vercel Queue,
Upstash, o pg_notify + worker) per spostare l'invio push fuori dalla request.

## Table `client_import_jobs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `initiated_by` | `uuid` |  Nullable |
| `source` | `text` |  Nullable |
| `filename` | `text` |  Nullable |
| `total_rows` | `int4` |  |
| `imported_count` | `int4` |  |
| `skipped_count` | `int4` |  |
| `error_count` | `int4` |  |
| `errors` | `jsonb` |  Nullable |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `promotions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `title` | `text` |  |
| `description` | `text` |  Nullable |
| `discount_type` | `text` |  Nullable |
| `discount_value` | `numeric` |  Nullable |
| `service_id` | `uuid` |  Nullable |
| `valid_from` | `timestamptz` |  |
| `valid_until` | `timestamptz` |  Nullable |
| `show_on_landing` | `bool` |  |
| `show_in_app` | `bool` |  |
| `is_active` | `bool` |  |
| `display_order` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `website_photos`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `url` | `text` |  |
| `sort_order` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `client_product_wishlist`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `client_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `created_at` | `timestamptz` |  |

## Table `push_subscriptions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `profile_id` | `uuid` |  |
| `endpoint` | `text` |  Unique |
| `p256dh` | `text` |  |
| `auth` | `text` |  |
| `user_agent` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `last_seen_at` | `timestamptz` |  |

## Table `notification_log`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `profile_id` | `uuid` |  Nullable |
| `appointment_id` | `uuid` |  Nullable |
| `type` | `text` |  |
| `sent_at` | `timestamptz` |  |

