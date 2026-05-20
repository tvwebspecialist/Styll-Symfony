'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTenantId } from '@/lib/tenant-context'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GalleryPhoto {
  id: string
  tenantId: string
  photoUrl: string
  caption: string | null
  displayOrder: number
  isActive: boolean
  createdAt: string
}

// ─── getGalleryPhotos ─────────────────────────────────────────────────────────

export async function getGalleryPhotos(): Promise<GalleryPhoto[]> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return []

  const db = createAdminClient()
  const { data } = await db
    .from('gallery_photos')
    .select('id, tenant_id, photo_url, caption, display_order, is_active, created_at')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: true })

  if (!data) return []

  return (data as Record<string, unknown>[]).map((p) => ({
    id: p.id as string,
    tenantId: p.tenant_id as string,
    photoUrl: p.photo_url as string,
    caption: (p.caption as string | null) ?? null,
    displayOrder: (p.display_order as number) ?? 0,
    isActive: (p.is_active as boolean) ?? true,
    createdAt: p.created_at as string,
  }))
}

// ─── addGalleryPhoto ──────────────────────────────────────────────────────────

export async function addGalleryPhoto(input: {
  photo_url: string
  caption?: string
}): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()

  const { data: maxRow } = await db
    .from('gallery_photos')
    .select('display_order')
    .eq('tenant_id', tenantId)
    .order('display_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = ((maxRow as Record<string, unknown> | null)?.display_order as number ?? -1) + 1

  const { error } = await db.from('gallery_photos').insert({
    tenant_id: tenantId,
    photo_url: input.photo_url,
    caption: input.caption ?? null,
    display_order: nextOrder,
    is_active: true,
    created_at: new Date().toISOString(),
  })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/gallery')
  return { ok: true }
}

// ─── deleteGalleryPhoto ───────────────────────────────────────────────────────

export async function deleteGalleryPhoto(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()
  const { error } = await db
    .from('gallery_photos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return { ok: false, error: error.message }

  revalidatePath('/dashboard/gallery')
  return { ok: true }
}

// ─── reorderGalleryPhotos ─────────────────────────────────────────────────────

export async function reorderGalleryPhotos(
  orderedIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getActiveTenantId()
  if (!tenantId) return { ok: false, error: 'Tenant non trovato' }

  const db = createAdminClient()

  await Promise.all(
    orderedIds.map((id, index) =>
      db
        .from('gallery_photos')
        .update({ display_order: index })
        .eq('id', id)
        .eq('tenant_id', tenantId),
    ),
  )

  revalidatePath('/dashboard/gallery')
  return { ok: true }
}
