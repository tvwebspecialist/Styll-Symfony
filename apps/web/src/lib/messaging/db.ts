import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/types'

export interface MessagingDatabase {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      clients: {
        Row: {
          deleted_at: string | null
          full_name: string
          id: string
          phone: string | null
          tenant_id: string
        }
        Insert: {
          deleted_at?: string | null
          full_name: string
          id?: string
          phone?: string | null
          tenant_id: string
        }
        Update: {
          deleted_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      inbox_conversations: {
        Row: {
          ai_paused_at: string | null
          assigned_staff_id: string | null
          channel: 'whatsapp'
          closed_at: string | null
          client_id: string | null
          contact_display_name: string | null
          contact_phone: string | null
          conversation_key: string
          created_at: string
          external_contact_id: string
          id: string
          integration_id: string | null
          last_business_message_at: string | null
          last_customer_message_at: string | null
          last_message_at: string | null
          last_message_preview: string | null
          last_template_message_at: string | null
          ownership_mode: 'ai' | 'human' | 'hybrid'
          provider: 'meta_whatsapp'
          provider_phone_number_id: string
          resolved_at: string | null
          service_window_expires_at: string | null
          status: string
          tenant_id: string
          unread_count: number
          updated_at: string
        }
        Insert: {
          ai_paused_at?: string | null
          assigned_staff_id?: string | null
          channel: 'whatsapp'
          closed_at?: string | null
          client_id?: string | null
          contact_display_name?: string | null
          contact_phone?: string | null
          conversation_key: string
          created_at?: string
          external_contact_id: string
          id?: string
          integration_id?: string | null
          last_business_message_at?: string | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_template_message_at?: string | null
          ownership_mode?: 'ai' | 'human' | 'hybrid'
          provider: 'meta_whatsapp'
          provider_phone_number_id: string
          resolved_at?: string | null
          service_window_expires_at?: string | null
          status?: string
          tenant_id: string
          unread_count?: number
          updated_at?: string
        }
        Update: {
          ai_paused_at?: string | null
          assigned_staff_id?: string | null
          channel?: 'whatsapp'
          closed_at?: string | null
          client_id?: string | null
          contact_display_name?: string | null
          contact_phone?: string | null
          conversation_key?: string
          created_at?: string
          external_contact_id?: string
          id?: string
          integration_id?: string | null
          last_business_message_at?: string | null
          last_customer_message_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          last_template_message_at?: string | null
          ownership_mode?: 'ai' | 'human' | 'hybrid'
          provider?: 'meta_whatsapp'
          provider_phone_number_id?: string
          resolved_at?: string | null
          service_window_expires_at?: string | null
          status?: string
          tenant_id?: string
          unread_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      inbox_messages: {
        Row: {
          author_kind: 'customer' | 'assistant' | 'human' | 'system'
          author_profile_id: string | null
          author_staff_id: string | null
          body_text: string | null
          conversation_id: string
          created_at: string
          direction: 'inbound' | 'outbound' | 'system'
          id: string
          media: Json
          messages_log_id: string | null
          meta_message_id: string | null
          provider: 'meta_whatsapp'
          provider_event_id: string | null
          raw_payload: Json
          tenant_id: string
          used_template: boolean
        }
        Insert: {
          author_kind: 'customer' | 'assistant' | 'human' | 'system'
          author_profile_id?: string | null
          author_staff_id?: string | null
          body_text?: string | null
          conversation_id: string
          created_at?: string
          direction: 'inbound' | 'outbound' | 'system'
          id?: string
          media?: Json
          messages_log_id?: string | null
          meta_message_id?: string | null
          provider: 'meta_whatsapp'
          provider_event_id?: string | null
          raw_payload?: Json
          tenant_id: string
          used_template?: boolean
        }
        Update: {
          author_kind?: 'customer' | 'assistant' | 'human' | 'system'
          author_profile_id?: string | null
          author_staff_id?: string | null
          body_text?: string | null
          conversation_id?: string
          created_at?: string
          direction?: 'inbound' | 'outbound' | 'system'
          id?: string
          media?: Json
          messages_log_id?: string | null
          meta_message_id?: string | null
          provider?: 'meta_whatsapp'
          provider_event_id?: string | null
          raw_payload?: Json
          tenant_id?: string
          used_template?: boolean
        }
        Relationships: []
      }
      inbox_assignments: {
        Row: {
          assigned_by_profile_id: string | null
          assigned_staff_id: string | null
          assignment_reason: string | null
          conversation_id: string
          created_at: string
          id: string
          released_at: string | null
          tenant_id: string
        }
        Insert: {
          assigned_by_profile_id?: string | null
          assigned_staff_id?: string | null
          assignment_reason?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          released_at?: string | null
          tenant_id: string
        }
        Update: {
          assigned_by_profile_id?: string | null
          assigned_staff_id?: string | null
          assignment_reason?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          released_at?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      inbox_ai_runs: {
        Row: {
          completed_at: string | null
          completion_tokens: number
          confidence: number | null
          conversation_id: string
          cost_cents: number
          created_at: string
          cited_source_summary: Json
          decision_kind: string | null
          deterministic_resolver: string | null
          error_category: string | null
          final_policy_decision: 'allow' | 'ask_customer' | 'ask_staff' | 'ask_owner' | 'deny_ai' | null
          handoff_reason: string | null
          id: string
          input_context: Json
          intent: string | null
          message_id: string | null
          mode: 'draft_only' | 'faq_auto' | 'transaction_prepare'
          model: string
          output_summary: string | null
          prompt_id: string | null
          prompt_version: string | null
          prompt_tokens: number
          provider_id: string | null
          reason_code: string | null
          status: 'queued' | 'started' | 'completed' | 'failed' | 'blocked' | 'skipped'
          tenant_id: string
          used_authoritative_knowledge: boolean
        }
        Insert: {
          completed_at?: string | null
          completion_tokens?: number
          confidence?: number | null
          conversation_id: string
          cost_cents?: number
          created_at?: string
          cited_source_summary?: Json
          decision_kind?: string | null
          deterministic_resolver?: string | null
          error_category?: string | null
          final_policy_decision?: 'allow' | 'ask_customer' | 'ask_staff' | 'ask_owner' | 'deny_ai' | null
          handoff_reason?: string | null
          id?: string
          input_context?: Json
          intent?: string | null
          message_id?: string | null
          mode: 'draft_only' | 'faq_auto' | 'transaction_prepare'
          model: string
          output_summary?: string | null
          prompt_id?: string | null
          prompt_version?: string | null
          prompt_tokens?: number
          provider_id?: string | null
          reason_code?: string | null
          status: 'queued' | 'started' | 'completed' | 'failed' | 'blocked' | 'skipped'
          tenant_id: string
          used_authoritative_knowledge?: boolean
        }
        Update: {
          completed_at?: string | null
          completion_tokens?: number
          confidence?: number | null
          conversation_id?: string
          cost_cents?: number
          created_at?: string
          cited_source_summary?: Json
          decision_kind?: string | null
          deterministic_resolver?: string | null
          error_category?: string | null
          final_policy_decision?: 'allow' | 'ask_customer' | 'ask_staff' | 'ask_owner' | 'deny_ai' | null
          handoff_reason?: string | null
          id?: string
          input_context?: Json
          intent?: string | null
          message_id?: string | null
          mode?: 'draft_only' | 'faq_auto' | 'transaction_prepare'
          model?: string
          output_summary?: string | null
          prompt_id?: string | null
          prompt_version?: string | null
          prompt_tokens?: number
          provider_id?: string | null
          reason_code?: string | null
          status?: 'queued' | 'started' | 'completed' | 'failed' | 'blocked' | 'skipped'
          tenant_id?: string
          used_authoritative_knowledge?: boolean
        }
        Relationships: []
      }
      messages_log: {
        Row: {
          body_sent: string | null
          channel: 'whatsapp' | 'sms' | 'email' | 'push'
          client_id: string | null
          conversation_id: string | null
          cost_cents: number
          created_at: string
          direction: 'inbound' | 'outbound'
          external_id: string | null
          id: string
          metadata: Json
          provider: string
          recipient: string | null
          sent_at: string | null
          status: string
          tenant_id: string
          type: string
        }
        Insert: {
          body_sent?: string | null
          channel: 'whatsapp' | 'sms' | 'email' | 'push'
          client_id?: string | null
          conversation_id?: string | null
          cost_cents?: number
          created_at?: string
          direction: 'inbound' | 'outbound'
          external_id?: string | null
          id?: string
          metadata?: Json
          provider: string
          recipient?: string | null
          sent_at?: string | null
          status: string
          tenant_id: string
          type: string
        }
        Update: {
          body_sent?: string | null
          channel?: 'whatsapp' | 'sms' | 'email' | 'push'
          client_id?: string | null
          conversation_id?: string | null
          cost_cents?: number
          created_at?: string
          direction?: 'inbound' | 'outbound'
          external_id?: string | null
          id?: string
          metadata?: Json
          provider?: string
          recipient?: string | null
          sent_at?: string | null
          status?: string
          tenant_id?: string
          type?: string
        }
        Relationships: []
      }
      messaging_outbox: {
        Row: {
          appointment_id: string | null
          attempts: number
          channel: 'whatsapp' | 'sms' | 'email' | 'push'
          client_id: string | null
          conversation_id: string | null
          created_at: string
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          last_error: string | null
          messages_log_id: string | null
          payload: Json
          provider: 'meta_whatsapp' | 'messagebird' | 'infobip' | 'twilio' | 'resend' | 'web_push'
          recipient: string
          scheduled_for: string
          status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          appointment_id?: string | null
          attempts?: number
          channel: 'whatsapp' | 'sms' | 'email' | 'push'
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          last_error?: string | null
          messages_log_id?: string | null
          payload?: Json
          provider: 'meta_whatsapp' | 'messagebird' | 'infobip' | 'twilio' | 'resend' | 'web_push'
          recipient: string
          scheduled_for?: string
          status?: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          appointment_id?: string | null
          attempts?: number
          channel?: 'whatsapp' | 'sms' | 'email' | 'push'
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          last_error?: string | null
          messages_log_id?: string | null
          payload?: Json
          provider?: 'meta_whatsapp' | 'messagebird' | 'infobip' | 'twilio' | 'resend' | 'web_push'
          recipient?: string
          scheduled_for?: string
          status?: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled'
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      tenant_integrations: {
        Row: {
          connected_at: string | null
          created_at: string
          disconnected_at: string | null
          external_account_id: string | null
          id: string
          metadata: Json
          provider: 'google_calendar' | 'instagram' | 'stripe' | 'meta_whatsapp'
          tenant_id: string
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          external_account_id?: string | null
          id?: string
          metadata?: Json
          provider: 'google_calendar' | 'instagram' | 'stripe' | 'meta_whatsapp'
          tenant_id: string
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          external_account_id?: string | null
          id?: string
          metadata?: Json
          provider?: 'google_calendar' | 'instagram' | 'stripe' | 'meta_whatsapp'
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events_inbox: {
        Row: {
          error: string | null
          event_type: string
          external_id: string
          id: string
          integration_id: string | null
          payload: Json
          processed_at: string | null
          provider: string
          received_at: string
          signature: string | null
          status: 'received' | 'processed' | 'skipped' | 'failed'
          tenant_id: string | null
        }
        Insert: {
          error?: string | null
          event_type: string
          external_id: string
          id?: string
          integration_id?: string | null
          payload?: Json
          processed_at?: string | null
          provider: string
          received_at?: string
          signature?: string | null
          status?: 'received' | 'processed' | 'skipped' | 'failed'
          tenant_id?: string | null
        }
        Update: {
          error?: string | null
          event_type?: string
          external_id?: string
          id?: string
          integration_id?: string | null
          payload?: Json
          processed_at?: string | null
          provider?: string
          received_at?: string
          signature?: string | null
          status?: 'received' | 'processed' | 'skipped' | 'failed'
          tenant_id?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type MessagingAdminClient = SupabaseClient<MessagingDatabase>

export function createMessagingAdminClient(): MessagingAdminClient {
  return createClient<MessagingDatabase>(
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    (process.env.SUPABASE_SECRET_KEY ?? '').trim()
  )
}
