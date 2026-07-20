'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildDpaAcceptanceFields,
  ensureTenantDpaAcceptance,
} from '@/lib/legal/dpa'
import {
  hasAnyB2bTermsAcceptanceForUser,
  linkB2bTermsAcceptanceToTenant,
} from '@/lib/legal/b2b-register-acceptance'
import { finalizeOnboardingSchema } from '@/lib/validations/auth'
import { sendWelcomeEmail } from '@/lib/email'
import type { Json, TablesUpdate } from '@/types'

export interface FinalizeResult {
  success: boolean
  error?: string
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-')
      .slice(0, 50) || `studio-${Math.random().toString(36).slice(2, 8)}`
  )
}

async function ensureUniqueSlug(
  db: ReturnType<typeof createAdminClient>,
  base: string,
  selfTenantId: string | null
): Promise<string> {
  let candidate = base
  for (let i = 0; i < 10; i++) {
    const { data } = await db
      .from('tenants')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (!data || data.id === selfTenantId) return candidate
    candidate = `${base}-${Math.random().toString(36).slice(2, 5)}`
  }
  return candidate
}

// Maps local index (0=Mon … 6=Sun) to DB convention (1=Mon … 6=Sat, 0=Sun)
function toDbDayOfWeek(localIdx: number): number {
  return (localIdx + 1) % 7
}

export async function finalizeOnboarding(input: unknown): Promise<FinalizeResult> {
  const parsed = finalizeOnboardingSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Dati non validi' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: "Sessione non valida. Effettua di nuovo l'accesso." }
  }

  const db = createAdminClient()
  const { step1, step2, step3, step4, staff } = parsed.data
  const dpaAcceptance = buildDpaAcceptanceFields({ acceptedBy: user.id })

  // Track any newly-created tenant so we can roll it back on failure.
  let createdTenantId: string | null = null

  try {
    // 0) Defensive profile upsert — ensures a profiles row exists before any
    //    FK-constrained table (staff_members) references it. The
    //    handle_new_user() trigger handles this on sign-up, but we guard
    //    against trigger failures or schema drift here.
    const { error: profileError } = await db.from('profiles').upsert(
      {
        id: user.id,
        email: user.email ?? null,
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          (user.user_metadata?.name as string | undefined) ??
          null,
        avatar_url:
          (user.user_metadata?.avatar_url as string | undefined) ??
          (user.user_metadata?.picture as string | undefined) ??
          null,
        user_type: 'staff', // satisfies NOT NULL constraint; 'staff' covers owner/manager/etc.
      },
      { onConflict: 'id' }
    )
    if (profileError) throw new Error('Errore sincronizzazione profilo: ' + profileError.message)

    // 1) Find existing owner record (re-run = update, not re-create)
    let { data: ownerStaff } = await db
      .from('staff_members')
      .select('id, tenant_id')
      .eq('profile_id', user.id)
      .eq('role', 'owner')
      .maybeSingle()

    const existingTenantId = ownerStaff?.tenant_id ?? null
    if (!existingTenantId) {
      const hasAcceptedTerms = await hasAnyB2bTermsAcceptanceForUser({
        db: db as any,
        userId: user.id,
      })
      if (!hasAcceptedTerms) {
        return {
          success: false,
          error: 'Per completare l’onboarding devi registrarti accettando prima i Termini di Servizio.',
        }
      }
    }

    const baseSlug = slugify(step1.name)
    const slug = await ensureUniqueSlug(db, baseSlug, existingTenantId)

    const pendingInvites =
      step2.work_mode === 'team' && staff.members.length > 0
        ? staff.members.map((m) => ({
            email: m.email.toLowerCase(),
            name: m.name || null,
            role: m.role,
            status: 'pending' as const,
          }))
        : []

    const tenantSettings: Record<string, unknown> = {
      work_mode: step2.work_mode,
      business_type: step1.business_type ?? null,
      pending_invites: pendingInvites,
    }

    // 2) Upsert tenant
    let tenantId = existingTenantId
    if (tenantId) {
      const { error: tErr } = await db
        .from('tenants')
        .update({
          business_name: step1.name,
          slug,
          timezone: 'Europe/Rome',
          settings: tenantSettings as unknown as Json,
          status: 'active',
        })
        .eq('id', tenantId)
      if (tErr) throw new Error(tErr.message)
    } else {
      const { data: created, error: tErr } = await db
        .from('tenants')
        .insert({
          business_name: step1.name,
          ...dpaAcceptance,
          slug,
          timezone: 'Europe/Rome',
          settings: tenantSettings as unknown as Json,
          status: 'active',
        })
        .select('id')
        .single()
      if (tErr || !created) throw new Error(tErr?.message ?? 'Impossibile creare il negozio')
      tenantId = created.id
      createdTenantId = tenantId // track for rollback

      // Every tenant must have exactly one owner record.
      const { data: newOwner, error: sErr } = await db.from('staff_members').insert({
        tenant_id: tenantId,
        profile_id: user.id,
        role: 'owner',
        is_active: true,
      }).select('id').single()
      if (sErr || !newOwner) throw new Error(`Creazione owner fallita: ${sErr?.message ?? 'Errore sconosciuto'}`)
      if (newOwner.id) {
        ;(ownerStaff as typeof ownerStaff) = { id: newOwner.id, tenant_id: tenantId }
      }
    }

    await ensureTenantDpaAcceptance(db, tenantId, dpaAcceptance)
    await linkB2bTermsAcceptanceToTenant({ db: db as any, tenantId, userId: user.id })

    // 3) Location (single main location, upsert)
    const locationPayload = {
      tenant_id: tenantId,
      name: step1.name,
      address: step1.address || null,
      city: step1.city || null,
      phone: step1.phone || null,
      is_active: true,
    }
    let { data: existingLoc } = await db
      .from('locations')
      .select('id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (existingLoc?.id) {
      const { error: lErr } = await db
        .from('locations')
        .update(locationPayload)
        .eq('id', existingLoc.id)
      if (lErr) throw new Error(lErr.message)
    } else {
      const { data: newLoc, error: lErr } = await db.from('locations').insert(locationPayload).select('id').single()
      if (lErr || !newLoc) throw new Error(lErr?.message ?? 'Impossibile creare location')
      existingLoc = { id: newLoc.id }
    }

    // 3b) Link owner to location via staff_locations
    const locationId = existingLoc!.id
    if (ownerStaff?.id && locationId) {
      const { error: slErr } = await db.from('staff_locations').insert({
        tenant_id: tenantId,
        staff_id: ownerStaff.id,
        location_id: locationId,
      })
      if (slErr) throw new Error(`Errore collegamento staff a location: ${slErr.message}`)
    }

    // 4) Services — full reset and re-insert
    await db.from('services').delete().eq('tenant_id', tenantId)
    if (step3.services.length > 0) {
      const { data: insertedServices, error: svcErr } = await db.from('services').insert(
        step3.services.map((s, idx) => ({
          tenant_id: tenantId,
          name: s.name,
          price: s.price,
          duration_minutes: s.duration_minutes,
          display_order: idx,
          is_active: true,
        }))
      ).select('id')
      if (svcErr) throw new Error(svcErr.message)

      // 4b) Link owner to all services via staff_services (required for booking flow)
      const currentOwnerStaffId = ownerStaff?.id
      if (currentOwnerStaffId && insertedServices && insertedServices.length > 0) {
        await db.from('staff_services').delete().eq('staff_id', currentOwnerStaffId)
        const { error: ssErr } = await db.from('staff_services').insert(
          insertedServices.map((svc) => ({
            tenant_id: tenantId,
            staff_id: currentOwnerStaffId,
            service_id: svc.id,
          }))
        )
        if (ssErr) throw new Error(`Errore collegamento servizi staff: ${ssErr.message}`)
      }
    }

    // 5) Working hours for the owner
    const ownerStaffId =
      ownerStaff?.id ??
      (
        await db
          .from('staff_members')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('profile_id', user.id)
          .eq('role', 'owner')
          .maybeSingle()
      ).data?.id

    if (ownerStaffId) {
      await db
        .from('working_hours')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('staff_id', ownerStaffId)

      const openRows = step4.hours.filter((h) => h.is_open)
      if (openRows.length > 0) {
        const { error: whErr } = await db.from('working_hours').insert(
          openRows.map((h) => ({
            tenant_id: tenantId,
            staff_id: ownerStaffId,
            day_of_week: toDbDayOfWeek(h.day_of_week),
            start_time: h.open_time,
            end_time: h.close_time,
            location_id: locationId ?? null,
          }))
        )
        if (whErr) throw new Error(whErr.message)
      }
    }

    // 6) Staff invites (team path only)
    if (step2.work_mode === 'team' && pendingInvites.length > 0) {
      const { data: invitedStaff, error: invErr } = await db
        .from('staff_members')
        .insert(
          pendingInvites.map((m) => ({
            tenant_id: tenantId,
            profile_id: null as unknown as string,
            role: m.role,
            is_active: true,
          }))
        )
        .select('id')
      if (invErr) throw new Error(invErr.message)

      // Link every invited staff member to all tenant locations and active services.
      // (staff_locations is required for the booking flow; staff_services defaults
      //  to everything — the member can customise during their own onboarding.)
      if (invitedStaff && invitedStaff.length > 0 && locationId) {
        const slRows = invitedStaff.map((s) => ({
          tenant_id: tenantId,
          staff_id: s.id,
          location_id: locationId,
        }))
        const { error: slErr } = await db.from('staff_locations').insert(slRows)
        if (slErr) throw new Error(`Errore collegamento staff invitato a location: ${slErr.message}`)
      }
    }

    // 7) Mark profile as onboarded
    const { data: existingProfile } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()
    const profileUpdate: TablesUpdate<'profiles'> = {
      onboarding_completed: true,
      work_mode: step2.work_mode,
      updated_at: new Date().toISOString(),
    }
    if (!existingProfile?.full_name) profileUpdate.full_name = step1.name
    const { error: profileErr } = await db
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)
    if (profileErr) throw new Error(profileErr.message)

    revalidatePath('/', 'layout')

    // 8) Welcome email — awaited but never throws; failure only logs
    if (user.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://styll.it'
      await sendWelcomeEmail({
        email: user.email,
        businessName: step1.name,
        slug,
        dashboardUrl: `${appUrl}/dashboard`,
      })
    }

    return { success: true }
  } catch (err) {
    // Roll back the newly-created tenant (cascade deletes staff, locations,
    // services and working_hours) so we don't leave orphaned data.
    if (createdTenantId) {
      await db.from('tenants').delete().eq('id', createdTenantId)
    }
    const message = err instanceof Error ? err.message : 'Errore sconosciuto'
    return { success: false, error: message }
  }
}
