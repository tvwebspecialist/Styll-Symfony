// Auto-generated database types for Supabase
// These represent the full database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          business_name: string
          slug: string
          timezone: string
          logo_url: string | null
          primary_color: string
          secondary_color: string
          font_family: string
          feature_flag_overrides: Json
          settings: Json
          status: 'active' | 'suspended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          business_name: string
          slug: string
          timezone?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          font_family?: string
          feature_flag_overrides?: Json
          settings?: Json
          status?: 'active' | 'suspended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          business_name?: string
          slug?: string
          timezone?: string
          logo_url?: string | null
          primary_color?: string
          secondary_color?: string
          font_family?: string
          feature_flag_overrides?: Json
          settings?: Json
          status?: 'active' | 'suspended'
          updated_at?: string
        }
      }
      locations: {
        Row: {
          id: string
          tenant_id: string
          name: string
          address: string
          city: string
          zip_code: string
          phone: string | null
          email: string | null
          latitude: number | null
          longitude: number | null
          timezone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          address: string
          city: string
          zip_code: string
          phone?: string | null
          email?: string | null
          latitude?: number | null
          longitude?: number | null
          timezone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          address?: string
          city?: string
          zip_code?: string
          phone?: string | null
          email?: string | null
          latitude?: number | null
          longitude?: number | null
          timezone?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          slug: string
          price_monthly: number
          max_staff: number
          max_locations: number
          max_messages_month: number
          feature_flags: Json
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          price_monthly: number
          max_staff: number
          max_locations: number
          max_messages_month: number
          feature_flags?: Json
          is_active?: boolean
          created_at?: string
        }
        Update: {
          name?: string
          price_monthly?: number
          max_staff?: number
          max_locations?: number
          max_messages_month?: number
          feature_flags?: Json
          is_active?: boolean
        }
      }
      tenant_subscriptions: {
        Row: {
          id: string
          tenant_id: string
          plan_id: string
          status: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled'
          trial_ends_at: string | null
          current_period_start: string | null
          current_period_end: string | null
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          plan_id: string
          status?: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled'
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          plan_id?: string
          status?: 'trial' | 'active' | 'past_due' | 'suspended' | 'cancelled'
          trial_ends_at?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          user_type: 'staff' | 'client' | 'admin'
          full_name: string
          phone: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          user_type: 'staff' | 'client' | 'admin'
          full_name: string
          phone?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_type?: 'staff' | 'client' | 'admin'
          full_name?: string
          phone?: string | null
          avatar_url?: string | null
          updated_at?: string
        }
      }
      staff_members: {
        Row: {
          id: string
          tenant_id: string
          profile_id: string
          role: 'owner' | 'manager' | 'staff' | 'receptionist'
          bio: string | null
          photo_url: string | null
          notification_preferences: Json
          is_active: boolean
          deleted_at: string | null
          deleted_by: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          profile_id: string
          role: 'owner' | 'manager' | 'staff' | 'receptionist'
          bio?: string | null
          photo_url?: string | null
          notification_preferences?: Json
          is_active?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          role?: 'owner' | 'manager' | 'staff' | 'receptionist'
          bio?: string | null
          photo_url?: string | null
          notification_preferences?: Json
          is_active?: boolean
          deleted_at?: string | null
          deleted_by?: string | null
          updated_at?: string
        }
      }
      staff_locations: {
        Row: {
          id: string
          tenant_id: string
          staff_id: string
          location_id: string
        }
        Insert: {
          id?: string
          tenant_id: string
          staff_id: string
          location_id: string
        }
        Update: {
          staff_id?: string
          location_id?: string
        }
      }
      services: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          price: number
          duration_minutes: number
          category: string | null
          display_order: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          price: number
          duration_minutes: number
          category?: string | null
          display_order?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          price?: number
          duration_minutes?: number
          category?: string | null
          display_order?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      staff_services: {
        Row: {
          id: string
          tenant_id: string
          staff_id: string
          service_id: string
        }
        Insert: {
          id?: string
          tenant_id: string
          staff_id: string
          service_id: string
        }
        Update: {
          staff_id?: string
          service_id?: string
        }
      }
      products: {
        Row: {
          id: string
          tenant_id: string
          name: string
          brand: string | null
          price_sell: number
          price_cost: number | null
          sku: string | null
          photo_url: string | null
          category: string | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          brand?: string | null
          price_sell: number
          price_cost?: number | null
          sku?: string | null
          photo_url?: string | null
          category?: string | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          brand?: string | null
          price_sell?: number
          price_cost?: number | null
          sku?: string | null
          photo_url?: string | null
          category?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      product_inventory: {
        Row: {
          id: string
          tenant_id: string
          product_id: string
          location_id: string
          quantity: number
          low_stock_threshold: number
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          product_id: string
          location_id: string
          quantity?: number
          low_stock_threshold?: number
          updated_at?: string
        }
        Update: {
          quantity?: number
          low_stock_threshold?: number
          updated_at?: string
        }
      }
      working_hours: {
        Row: {
          id: string
          tenant_id: string
          staff_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          staff_id: string
          day_of_week: number
          start_time: string
          end_time: string
          created_at?: string
        }
        Update: {
          day_of_week?: number
          start_time?: string
          end_time?: string
        }
      }
      working_hour_overrides: {
        Row: {
          id: string
          tenant_id: string
          staff_id: string
          date: string
          is_closed: boolean
          start_time: string | null
          end_time: string | null
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          staff_id: string
          date: string
          is_closed?: boolean
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
          created_at?: string
        }
        Update: {
          is_closed?: boolean
          start_time?: string | null
          end_time?: string | null
          reason?: string | null
        }
      }
      appointments: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          staff_id: string
          location_id: string
          start_time: string
          end_time: string
          status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          booking_source: string
          booked_by: string | null
          notes: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          staff_id: string
          location_id: string
          start_time: string
          end_time: string
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          booking_source?: string
          booked_by?: string | null
          notes?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          staff_id?: string
          location_id?: string
          start_time?: string
          end_time?: string
          status?: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
          notes?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          updated_at?: string
        }
      }
      appointment_services: {
        Row: {
          id: string
          tenant_id: string
          appointment_id: string
          service_id: string
          price_at_booking: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          appointment_id: string
          service_id: string
          price_at_booking: number
          created_at?: string
        }
        Update: {
          price_at_booking?: number
        }
      }
      appointment_products: {
        Row: {
          id: string
          tenant_id: string
          appointment_id: string
          product_id: string
          quantity: number
          price_at_sale: number
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          appointment_id: string
          product_id: string
          quantity?: number
          price_at_sale: number
          created_at?: string
        }
        Update: {
          quantity?: number
          price_at_sale?: number
        }
      }
      payments: {
        Row: {
          id: string
          tenant_id: string
          appointment_id: string | null
          client_id: string
          amount: number
          tip_amount: number
          payment_method: 'cash' | 'card_terminal' | 'stripe_online' | 'bank_transfer' | 'other'
          status: 'pending' | 'completed' | 'refunded' | 'partial_refund' | 'failed'
          stripe_payment_id: string | null
          notes: string | null
          paid_at: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          appointment_id?: string | null
          client_id: string
          amount: number
          tip_amount?: number
          payment_method: 'cash' | 'card_terminal' | 'stripe_online' | 'bank_transfer' | 'other'
          status?: 'pending' | 'completed' | 'refunded' | 'partial_refund' | 'failed'
          stripe_payment_id?: string | null
          notes?: string | null
          paid_at?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          status?: 'pending' | 'completed' | 'refunded' | 'partial_refund' | 'failed'
          payment_method?: 'cash' | 'card_terminal' | 'stripe_online' | 'bank_transfer' | 'other'
          tip_amount?: number
          notes?: string | null
        }
      }
      clients: {
        Row: {
          id: string
          tenant_id: string
          profile_id: string | null
          full_name: string
          phone: string
          email: string | null
          date_of_birth: string | null
          preferred_contact_channel: 'push' | 'whatsapp' | 'sms' | 'email'
          tags: Json
          referred_by: string | null
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          profile_id?: string | null
          full_name: string
          phone: string
          email?: string | null
          date_of_birth?: string | null
          preferred_contact_channel?: 'push' | 'whatsapp' | 'sms' | 'email'
          tags?: Json
          referred_by?: string | null
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string
          phone?: string
          email?: string | null
          date_of_birth?: string | null
          preferred_contact_channel?: 'push' | 'whatsapp' | 'sms' | 'email'
          tags?: Json
          referred_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          updated_at?: string
        }
      }
      client_notes: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          staff_id: string
          note_text: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          staff_id: string
          note_text: string
          created_at?: string
        }
        Update: {
          note_text?: string
        }
      }
      client_consents: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          consent_type: 'marketing_sms' | 'marketing_whatsapp' | 'marketing_email' | 'marketing_push' | 'data_processing'
          granted: boolean
          granted_at: string | null
          revoked_at: string | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          consent_type: 'marketing_sms' | 'marketing_whatsapp' | 'marketing_email' | 'marketing_push' | 'data_processing'
          granted?: boolean
          granted_at?: string | null
          revoked_at?: string | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          granted?: boolean
          granted_at?: string | null
          revoked_at?: string | null
        }
      }
      loyalty_configs: {
        Row: {
          id: string
          tenant_id: string
          is_active: boolean
          template: 'classic' | 'streak_master' | 'vip_club'
          points_per_visit: number
          points_per_euro: number
          streak_threshold_days: number
          version: number
          started_at: string
          ended_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          is_active?: boolean
          template?: 'classic' | 'streak_master' | 'vip_club'
          points_per_visit?: number
          points_per_euro?: number
          streak_threshold_days?: number
          version?: number
          started_at?: string
          ended_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          is_active?: boolean
          template?: 'classic' | 'streak_master' | 'vip_club'
          points_per_visit?: number
          points_per_euro?: number
          streak_threshold_days?: number
          ended_at?: string | null
          updated_at?: string
        }
      }
      rewards: {
        Row: {
          id: string
          tenant_id: string
          name: string
          description: string | null
          points_cost: number
          reward_type: 'product' | 'service' | 'discount' | 'custom'
          display_order: number
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          description?: string | null
          points_cost: number
          reward_type: 'product' | 'service' | 'discount' | 'custom'
          display_order?: number
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          points_cost?: number
          reward_type?: 'product' | 'service' | 'discount' | 'custom'
          display_order?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      client_loyalty: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          total_points: number
          available_points: number
          current_streak: number
          longest_streak: number
          current_tier: 'bronze' | 'silver' | 'gold' | 'platinum'
          tier_points_this_year: number
          tier_year: number
          tier_grace_expires_at: string | null
          last_visit_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          total_points?: number
          available_points?: number
          current_streak?: number
          longest_streak?: number
          current_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          tier_points_this_year?: number
          tier_year?: number
          tier_grace_expires_at?: string | null
          last_visit_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          total_points?: number
          available_points?: number
          current_streak?: number
          longest_streak?: number
          current_tier?: 'bronze' | 'silver' | 'gold' | 'platinum'
          tier_points_this_year?: number
          tier_year?: number
          tier_grace_expires_at?: string | null
          last_visit_date?: string | null
          updated_at?: string
        }
      }
      loyalty_transactions: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          type: 'earn' | 'redeem' | 'bonus' | 'import' | 'expire' | 'adjustment'
          points: number
          description: string | null
          appointment_id: string | null
          staff_id: string | null
          loyalty_config_version: number | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          type: 'earn' | 'redeem' | 'bonus' | 'import' | 'expire' | 'adjustment'
          points: number
          description?: string | null
          appointment_id?: string | null
          staff_id?: string | null
          loyalty_config_version?: number | null
          created_at?: string
        }
        Update: {
          description?: string | null
        }
      }
      reward_redemptions: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          reward_id: string
          points_spent: number
          confirmed_by: string
          confirmed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          reward_id: string
          points_spent: number
          confirmed_by: string
          confirmed_at?: string
          created_at?: string
        }
        Update: {
          confirmed_at?: string
        }
      }
      client_analytics: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          total_visits: number
          total_spent_services: number
          total_spent_products: number
          average_spend_per_visit: number
          last_visit_date: string | null
          days_since_last_visit: number | null
          average_days_between_visits: number | null
          churn_status: 'green' | 'yellow' | 'red'
          vip_score: number
          no_show_count: number
          cancellation_count: number
          referral_count: number
          last_reconciled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          total_visits?: number
          total_spent_services?: number
          total_spent_products?: number
          average_spend_per_visit?: number
          last_visit_date?: string | null
          days_since_last_visit?: number | null
          average_days_between_visits?: number | null
          churn_status?: 'green' | 'yellow' | 'red'
          vip_score?: number
          no_show_count?: number
          cancellation_count?: number
          referral_count?: number
          last_reconciled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          total_visits?: number
          total_spent_services?: number
          total_spent_products?: number
          average_spend_per_visit?: number
          last_visit_date?: string | null
          days_since_last_visit?: number | null
          average_days_between_visits?: number | null
          churn_status?: 'green' | 'yellow' | 'red'
          vip_score?: number
          no_show_count?: number
          cancellation_count?: number
          referral_count?: number
          last_reconciled_at?: string | null
          updated_at?: string
        }
      }
      message_templates: {
        Row: {
          id: string
          tenant_id: string
          name: string
          type: 'reminder' | 'confirmation' | 'win_back' | 'review_request' | 'loyalty_update' | 'custom'
          channel: 'sms' | 'whatsapp' | 'email' | 'push'
          subject: string | null
          body: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          name: string
          type: 'reminder' | 'confirmation' | 'win_back' | 'review_request' | 'loyalty_update' | 'custom'
          channel: 'sms' | 'whatsapp' | 'email' | 'push'
          subject?: string | null
          body: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          type?: 'reminder' | 'confirmation' | 'win_back' | 'review_request' | 'loyalty_update' | 'custom'
          channel?: 'sms' | 'whatsapp' | 'email' | 'push'
          subject?: string | null
          body?: string
          is_active?: boolean
          updated_at?: string
        }
      }
      messages_log: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          template_id: string | null
          channel: 'sms' | 'whatsapp' | 'email' | 'push'
          type: string
          recipient: string
          body_sent: string
          status: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'
          cost: number | null
          external_id: string | null
          sent_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          template_id?: string | null
          channel: 'sms' | 'whatsapp' | 'email' | 'push'
          type: string
          recipient: string
          body_sent: string
          status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'
          cost?: number | null
          external_id?: string | null
          sent_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'bounced'
          sent_at?: string | null
          external_id?: string | null
        }
      }
      staff_notifications: {
        Row: {
          id: string
          tenant_id: string
          staff_id: string | null
          type: 'churn_alert' | 'low_stock' | 'new_booking' | 'cancellation' | 'review_received' | 'system'
          title: string
          body: string
          data: Json
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          staff_id?: string | null
          type: 'churn_alert' | 'low_stock' | 'new_booking' | 'cancellation' | 'review_received' | 'system'
          title: string
          body: string
          data?: Json
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          is_read?: boolean
          read_at?: string | null
        }
      }
      review_requests: {
        Row: {
          id: string
          tenant_id: string
          client_id: string
          appointment_id: string | null
          google_review_url: string
          status: 'sent' | 'clicked' | 'completed'
          sent_at: string
          clicked_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          client_id: string
          appointment_id?: string | null
          google_review_url: string
          status?: 'sent' | 'clicked' | 'completed'
          sent_at?: string
          clicked_at?: string | null
          created_at?: string
        }
        Update: {
          status?: 'sent' | 'clicked' | 'completed'
          clicked_at?: string | null
        }
      }
      admin_users: {
        Row: {
          id: string
          profile_id: string
          role: 'superadmin' | 'support'
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          role?: 'superadmin' | 'support'
          created_at?: string
        }
        Update: {
          role?: 'superadmin' | 'support'
        }
      }
      tenant_activity_log: {
        Row: {
          id: string
          tenant_id: string
          last_login_at: string | null
          appointments_this_month: number
          active_clients_count: number
          total_revenue_this_month: number
          recorded_at: string
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          last_login_at?: string | null
          appointments_this_month?: number
          active_clients_count?: number
          total_revenue_this_month?: number
          recorded_at?: string
          created_at?: string
        }
        Update: {
          last_login_at?: string | null
          appointments_this_month?: number
          active_clients_count?: number
          total_revenue_this_month?: number
          recorded_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          tenant_id: string
          actor_id: string
          action: 'create' | 'update' | 'delete' | 'status_change'
          entity_type: string
          entity_id: string
          changes: Json
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          actor_id: string
          action: 'create' | 'update' | 'delete' | 'status_change'
          entity_type: string
          entity_id: string
          changes?: Json
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          changes?: Json
        }
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: Record<string, never>
  }
}
