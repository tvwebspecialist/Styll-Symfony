'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { finalizeOnboardingSchema } from '@/lib/validations/auth'

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

// Mappa indice locale (0=Lun … 6=Dom) sulla convenzione DB (1=Lun … 6=Sab, 0=Dom)
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

  const { data: { session } } = await supabase.auth.getSession()
  console.log('=== AUTH DEBUG ===')
  console.log('user.id:', user?.id)
  console.log('access_token preview:', session?.access_token?.slice(0, 50))
  try {
    const payload = JSON.parse(
      Buffer.from(session?.access_token?.split('.')[1] ?? '', 'base64').toString()
    )
    console.log('token role:', payload.role)
    console.log('token sub:', payload.sub)
  } catch(e) {
    console.log('token parse error:', e)
  }

  const { step1, step2, step3, step4, staff } = parsed.data

  // 1) Trova il tenant esistente del proprietario (via staff_members owner)
  const { data: ownerStaff } = await db
    .from('staff_members')
    .select('id, tenant_id')
    .eq('profile_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  const existingTenantId = ownerStaff?.tenant_id ?? null
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

  // 2) Upsert tenants
  let tenantId = existingTenantId
  if (tenantId) {
    const { error: tErr } = await db
      .from('tenants')
      .update({
        business_name: step1.name,
        slug,
        timezone: 'Europe/Rome',
        settings: tenantSettings,
        status: 'active',
      })
      .eq('id', tenantId)
    if (tErr) return { success: false, error: tErr.message }
  } else {
    const { data: created, error: tErr } = await db
      .from('tenants')
      .insert({
        business_name: step1.name,
        slug,
        timezone: 'Europe/Rome',
        settings: tenantSettings,
        status: 'active',
      })
      .select('id')
      .single()
    if (tErr || !created) {
      return { success: false, error: tErr?.message ?? 'Impossibile creare il negozio' }
    }
    tenantId = created.id

    const { error: sErr } = await db.from('staff_members').insert({
      tenant_id: tenantId,
      profile_id: user.id,
      role: 'owner',
      is_active: true,
    })
    if (sErr) return { success: false, error: sErr.message }
  }

  // 3) Locations: una sola sede principale
  const locationPayload = {
    tenant_id: tenantId,
    name: step1.name,
    address: step1.address || null,
    city: step1.city || null,
    phone: step1.phone || null,
    is_active: true,
  }
  const { data: existingLoc } = await db
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
    if (lErr) return { success: false, error: lErr.message }
  } else {
    const { error: lErr } = await db.from('locations').insert(locationPayload)
    if (lErr) return { success: false, error: lErr.message }
  }

  // 4) Services: reset & insert
  await db.from('services').delete().eq('tenant_id', tenantId)
  if (step3.services.length > 0) {
    const { error: svcErr } = await db.from('services').insert(
      step3.services.map((s, idx) => ({
        tenant_id: tenantId,
        name: s.name,
        price: s.price,
        duration_minutes: s.duration_minutes,
        display_order: idx,
        is_active: true,
      }))
    )
    if (svcErr) return { success: false, error: svcErr.message }
  }

  // 5) Working hours dell'owner
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
        }))
      )
      if (whErr) return { success: false, error: whErr.message }
    }
  }

  // 6) Staff invites (path team)
  if (step2.work_mode === 'team' && pendingInvites.length > 0) {
    const { error: invErr } = await db.from('staff_members').insert(
      pendingInvites.map((m) => ({
        tenant_id: tenantId,
        profile_id: null,
        role: m.role,
        is_active: true,
      }))
    )
    if (invErr) return { success: false, error: invErr.message }
  }

  // 7) Update profile
  const { data: existingProfile } = await db
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()
  const profileUpdate: Record<string, unknown> = {
    onboarding_completed: true,
    work_mode: step2.work_mode,
    updated_at: new Date().toISOString(),
  }
  if (!existingProfile?.full_name) profileUpdate.full_name = step1.name
  const { error: profileErr } = await db
    .from('profiles')
    .update(profileUpdate)
    .eq('id', user.id)
  if (profileErr) return { success: false, error: profileErr.message }

  revalidatePath('/', 'layout')
  return { success: true }
}
