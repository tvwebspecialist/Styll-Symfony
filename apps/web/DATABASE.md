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
| `splash_color` | `text` |  Nullable |
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
| `email_verified` | `bool` |  |

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
| `applied_promotion_id` | `uuid` |  Nullable |

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
| `applied_promotion_id` | `uuid` |  Nullable |

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
| `is_active` | `bool` |  |

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
| `current_tier` | `text` |  |
| `tier_points_this_year` | `int4` |  |
| `tier_year` | `int4` |  |
| `tier_grace_expires_at` | `timestamptz` |  Nullable |

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
| `loyalty_config_version` | `int4` |  Nullable |

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
| `status` | `text` |  |
| `cover_image_url` | `text` |  Nullable |

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
| `promotion_id` | `uuid` |  Nullable |

## Table `email_verification_tokens`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `email` | `text` |  |
| `code` | `text` |  |
| `expires_at` | `timestamptz` |  |
| `used` | `bool` |  |
| `attempts` | `int4` |  |
| `locked_until` | `timestamptz` |  Nullable |
| `last_sent_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |

## Table `notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `profile_id` | `uuid` |  Nullable |
| `type` | `text` |  |
| `title` | `text` |  |
| `body` | `text` |  Nullable |
| `is_read` | `bool` |  |
| `meta` | `jsonb` |  |
| `created_at` | `timestamptz` |  |

## Table `message_automations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `type` | `text` |  |
| `enabled` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `promotion_services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `promotion_id` | `uuid` |  |
| `service_id` | `uuid` |  |
| `discount_type` | `text` |  |
| `discount_value` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## Table `promotion_products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `promotion_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `discount_type` | `text` |  |
| `discount_value` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## Table `badges`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `icon_url` | `text` |  Nullable |
| `condition_type` | `text` |  |
| `condition_value` | `int4` |  |
| `is_active` | `bool` |  |
| `display_order` | `int4` |  |
| `created_at` | `timestamptz` |  |

## Table `client_badges`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `client_id` | `uuid` |  |
| `badge_id` | `uuid` |  |
| `unlocked_at` | `timestamptz` |  |

## Tablee `tier_configs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `tier_name` | `text` |  |
| `tier_label` | `text` |  |
| `min_points` | `int4` |  |
| `benefits` | `jsonb` |  |
| `visual_style` | `jsonb` |  |
| `display_order` | `int4` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `inventory_movements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `product_id` | `uuid` |  |
| `location_id` | `uuid` |  Nullable |
| `appointment_id` | `uuid` |  Nullable |
| `movement_type` | `text` |  |
| `quantity` | `int4` |  |
| `notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `platform_notifications`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `type` | `text` |  |
| `title` | `text` |  |
| `body` | `text` |  Nullable |
| `tenant_id` | `uuid` |  Nullable |
| `related_profile_id` | `uuid` |  Nullable |
| `meta` | `jsonb` |  |
| `is_read` | `bool` |  |
| `created_at` | `timestamptz` |  |

## Table `site_sessions`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `anonymous_id` | `text` |  |
| `client_id` | `uuid` |  Nullable |
| `first_seen_at` | `timestamptz` |  |
| `last_seen_at` | `timestamptz` |  |
| `referrer` | `text` |  Nullable |
| `utm_source` | `text` |  Nullable |
| `utm_medium` | `text` |  Nullable |
| `utm_campaign` | `text` |  Nullable |
| `landing_page` | `text` |  Nullable |
| `device_type` | `text` |  |
| `created_at` | `timestamptz` |  |
| `app_surface` | `text` |  |

## Table `site_events`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `tenant_id` | `uuid` |  |
| `session_id` | `uuid` |  |
| `event_type` | `text` |  |
| `page_path` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `site_analytics_daily`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `tenant_id` | `uuid` | Primary |
| `date` | `date` | Primary |
| `unique_visitors` | `int4` |  |
| `sessions` | `int4` |  |
| `page_views` | `int4` |  |
| `booking_started_count` | `int4` |  |
| `booking_completed_count` | `int4` |  |
| `signup_count` | `int4` |  |
| `conversion_rate` | `numeric` |  |
| `top_referrers` | `jsonb` |  |
| `device_breakdown` | `jsonb` |  |
| `updated_at` | `timestamptz` |  |
| `app_surface` | `text` | Primary |

