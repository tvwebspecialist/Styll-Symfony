import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ──────────────────────────────────────────────────────────────
// create-guest-booking — Supabase Edge Function
//
// Use case: create a guest appointment from any client that does
// NOT have access to the service role key (mobile apps, third-
// party integrations). The Next.js PWA uses Server Actions with
// createAdminClient() instead, which is equally secure and adds
// server-side slot re-verification before calling this function.
//
// Request body (JSON):
//   tenantId        string   required
//   staffId         string   required
//   locationId      string   required
//   serviceIds      string[] required, min 1
//   startTime       string   required  ISO-8601 UTC
//   endTime         string   required  ISO-8601 UTC
//   clientName      string   required
//   clientPhone     string   required
//   clientEmail     string   optional
//   notes           string   optional
//   marketingConsent boolean optional, default false
//   pricesSnapshot  { serviceId: string; price: number }[]  optional
//
// Response:
//   { success: true,  appointmentId: string }
//   { success: false, error: string }
// ──────────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface PriceSnapshot {
  serviceId: string
  price: number
}

interface RequestBody {
  tenantId: string
  staffId: string
  locationId: string
  serviceIds: string[]
  startTime: string
  endTime: string
  clientName: string
  clientPhone: string
  clientEmail?: string
  notes?: string
  marketingConsent?: boolean
  pricesSnapshot?: PriceSnapshot[]
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405)
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // bypass RLS
    )

    const body: RequestBody = await req.json()
    const {
      tenantId,
      staffId,
      locationId,
      serviceIds,
      startTime,
      endTime,
      clientName,
      clientPhone,
      clientEmail,
      notes,
      marketingConsent = false,
      pricesSnapshot = [],
    } = body

    // ── Validation ──────────────────────────────────────────────
    if (
      !tenantId || !staffId || !locationId ||
      !serviceIds?.length || !startTime || !endTime ||
      !clientName?.trim() || !clientPhone?.trim()
    ) {
      return json({ success: false, error: 'Parametri obbligatori mancanti.' }, 400)
    }

    // Basic ISO-8601 check
    if (isNaN(Date.parse(startTime)) || isNaN(Date.parse(endTime))) {
      return json({ success: false, error: 'startTime o endTime non validi.' }, 400)
    }

    // ── 1. Fetch service prices if no snapshot provided ──────────
    let prices: PriceSnapshot[] = pricesSnapshot

    if (prices.length === 0) {
      const { data: serviceRows, error: svcErr } = await supabase
        .from('services')
        .select('id, price')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .in('id', serviceIds)

      if (svcErr || !serviceRows?.length) {
        return json({ success: false, error: 'Servizi non trovati.' }, 400)
      }

      prices = serviceRows.map((s) => ({
        serviceId: s.id as string,
        price: Number(s.price ?? 0),
      }))
    }

    // ── 2. Upsert client ────────────────────────────────────────
    const phone = clientPhone.replace(/\s+/g, ' ').trim()
    const email = clientEmail?.trim() || null

    const { data: existingClients } = await supabase
      .from('clients')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('phone', phone)
      .is('deleted_at', null)
      .limit(1)

    let clientId: string

    if (existingClients && existingClients.length > 0) {
      clientId = (existingClients[0] as { id: string }).id
      await supabase.from('clients').update({
        full_name: clientName.trim(),
        ...(email ? { email } : {}),
        marketing_consent: marketingConsent,
        updated_at: new Date().toISOString(),
      }).eq('id', clientId)
    } else {
      const { data: newClient, error: clientErr } = await supabase
        .from('clients')
        .insert({
          tenant_id: tenantId,
          full_name: clientName.trim(),
          phone,
          email,
          marketing_consent: marketingConsent,
          preferred_contact_channel: 'whatsapp',
          tags: '["active"]',
        })
        .select('id')
        .single()

      if (clientErr || !newClient) {
        console.error('client insert error:', clientErr)
        return json({ success: false, error: 'Errore creazione cliente.' }, 500)
      }

      clientId = (newClient as { id: string }).id
    }

    // ── 3. Create appointment ───────────────────────────────────
    const { data: appointment, error: apptErr } = await supabase
      .from('appointments')
      .insert({
        tenant_id: tenantId,
        client_id: clientId,
        staff_id: staffId,
        location_id: locationId,
        start_time: startTime,
        end_time: endTime,
        status: 'confirmed',
        booking_source: 'pwa',
        notes: notes?.trim() || null,
        booked_by: null,
      })
      .select('id')
      .single()

    if (apptErr || !appointment) {
      if (apptErr?.code === '23P01') {
        return new Response(
          JSON.stringify({ error: 'Lo slot selezionato non è più disponibile. Scegli un altro orario.' }),
          { status: 409, headers: { 'Content-Type': 'application/json' } }
        )
      }

      console.error('appointment insert error:', apptErr)
      return json({ success: false, error: 'Errore creazione appuntamento.' }, 500)
    }

    const appointmentId = (appointment as { id: string }).id

    // ── 4. Create appointment_services (price snapshot) ─────────
    const appointmentServices = serviceIds.map((serviceId) => ({
      tenant_id: tenantId,
      appointment_id: appointmentId,
      service_id: serviceId,
      price_at_booking:
        prices.find((p) => p.serviceId === serviceId)?.price ?? 0,
    }))

    const { error: svcLinkErr } = await supabase
      .from('appointment_services')
      .insert(appointmentServices)

    if (svcLinkErr) {
      // Roll back appointment on partial failure
      await supabase.from('appointments').delete().eq('id', appointmentId)
      console.error('appointment_services insert error:', svcLinkErr)
      return json({ success: false, error: 'Errore salvataggio servizi.' }, 500)
    }

    return json({ success: true, appointmentId })
  } catch (err) {
    console.error('Unexpected error:', err)
    return json({ success: false, error: 'Errore interno del server.' }, 500)
  }
})

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
