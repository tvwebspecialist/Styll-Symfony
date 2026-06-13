'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Loader2, Building2, MapPin, CreditCard, Plus, Pencil, Trash2, Check, ImagePlus, X as XIcon, Images, Phone } from 'lucide-react'
import { StyllModal } from '@/components/ui/styll-modal'
import { createClient } from '@/lib/supabase/client'
import {
  updateTenant,
  upsertLocation,
  deleteLocation,
} from '@/lib/actions/impostazioni'
import type { ImpostazioniData, LocationSettings } from '@/lib/actions/impostazioni'

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-fg-secondary)' }}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 12, color: 'var(--color-fg-muted)', margin: 0 }}>{hint}</p>}
    </div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--color-fg-secondary)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>{title}</p>
        <p style={{ fontSize: 13, color: 'var(--color-fg-muted)', margin: '3px 0 0' }}>{description}</p>
      </div>
    </div>
  )
}

// ─── Business tab ─────────────────────────────────────────────────────────────

function BusinessTab({ tenant }: { tenant: ImpostazioniData['tenant'] }) {
  const [businessName, setBusinessName] = React.useState(tenant?.businessName ?? '')
  const [primaryColor, setPrimaryColor] = React.useState(tenant?.primaryColor ?? '')
  const [logoUrl, setLogoUrl] = React.useState(tenant?.logoUrl ?? '')
  const [logoUploading, setLogoUploading] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function handleLogoUpload(file: File) {
    setLogoUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `logos/${tenant?.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      console.log(path)
      const { error: uploadError } = await supabase.storage.from('tenants').upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('tenants').getPublicUrl(path)
      setLogoUrl(urlData.publicUrl)
      toast.success('Logo caricato')
    } catch (err: unknown) {
      toast.error('Errore upload: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await updateTenant({ businessName: businessName.trim(), primaryColor: primaryColor || null, logoUrl: logoUrl || null })
    setLoading(false)
    if (result.success) toast.success('Dati business aggiornati')
    else toast.error(result.error ?? 'Errore durante il salvataggio')
  }

  return (
    <div>
      <SectionHeader
        icon={<Building2 size={20} />}
        title="Business"
        description="Informazioni sulla tua attività"
      />
      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
        <Field label="Logo attività">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 72, height: 72, borderRadius: 16,
                border: '2px dashed var(--color-border)',
                background: 'var(--color-bg-secondary)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-fg-muted)',
              }}
            >
              {logoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <ImagePlus size={24} />
              }
            </div>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '9px 16px',
                  background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                  borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-fg)',
                  cursor: logoUploading ? 'not-allowed' : 'pointer',
                  opacity: logoUploading ? 0.6 : 1, minHeight: 38,
                }}
              >
                {logoUploading
                  ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  : <ImagePlus size={14} />}
                {logoUploading ? 'Caricamento…' : 'Carica logo'}
                <input
                  type="file" accept="image/*" style={{ display: 'none' }}
                  disabled={logoUploading}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f) }}
                />
              </label>
              {logoUrl && (
                <button type="button" onClick={() => setLogoUrl('')}
                  style={{ display: 'block', marginTop: 6, fontSize: 12, color: 'var(--color-fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Rimuovi logo
                </button>
              )}
            </div>
          </div>
        </Field>
        <Field label="Nome attività">
          <input
            className="styll-input"
            style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Il mio salone"
          />
        </Field>
        <Field label="Slug" hint="L'URL pubblico della tua attività. Non modificabile.">
          <input
            className="styll-input"
            style={{ padding: '10px 12px', fontSize: 15, width: '100%', opacity: 0.6, cursor: 'not-allowed', fontFamily: 'monospace' }}
            value={tenant?.slug ?? ''}
            readOnly
            disabled
          />
        </Field>
        <Field label="Colore primario">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
                  background: primaryColor || '#F3F4F6',
                  border: '2px solid var(--color-border)',
                  cursor: 'pointer',
                }}
              />
              <input
                type="color"
                value={primaryColor || '#000000'}
                onChange={(e) => setPrimaryColor(e.target.value)}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer', border: 'none', padding: 0 }}
              />
            </div>
            <input
              className="styll-input"
              style={{ padding: '10px 12px', fontSize: 14, flex: 1, fontFamily: 'monospace', letterSpacing: '0.04em' }}
              value={primaryColor}
              onChange={(e) => {
                let v = e.target.value
                if (v && !v.startsWith('#')) v = '#' + v
                if (/^#[0-9A-Fa-f]{0,6}$/.test(v) || v === '') setPrimaryColor(v)
              }}
              placeholder="#000000"
              maxLength={7}
            />
            {primaryColor && (
              <button
                type="button"
                onClick={() => setPrimaryColor('')}
                style={{ fontSize: 12, color: 'var(--color-fg-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                Rimuovi
              </button>
            )}
          </div>
        </Field>
        <button
          type="submit"
          disabled={loading}
          className="styll-btn-primary"
          style={{ alignSelf: 'flex-start', padding: '12px 24px', fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
          Salva modifiche
        </button>
      </form>
    </div>
  )
}

// ─── Photos Uploader (multi-upload for location photos) ──────────────────────

function PhotosUploader({
  photos,
  onChange,
  maxPhotos = 10,
  tenantId,
}: {
  photos: string[]
  onChange: (photos: string[]) => void
  maxPhotos?: number
  tenantId: string
}) {
  const [uploading, setUploading] = React.useState(false)

  async function handleFilesSelect(files: FileList) {
    const slots = maxPhotos - photos.length
    if (slots <= 0) { toast.error(`Massimo ${maxPhotos} foto consentite`); return }
    const toUpload = Array.from(files).slice(0, slots)
    setUploading(true)
    try {
      const supabase = createClient()
      const urls: string[] = []
      for (const file of toUpload) {
        const ext = file.name.split('.').pop() ?? 'jpg'
        const path = `locations/${tenantId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        console.log(path)
        const { error } = await supabase.storage.from('tenants').upload(path, file, { upsert: true })
        if (error) throw error
        const { data: urlData } = supabase.storage.from('tenants').getPublicUrl(path)
        urls.push(urlData.publicUrl)
      }
      onChange([...photos, ...urls])
      toast.success(`${urls.length} foto ${urls.length === 1 ? 'caricata' : 'caricate'}`)
    } catch (err: unknown) {
      toast.error('Errore upload: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {photos.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 8,
          marginBottom: 10,
        }}>
          {photos.map((url, i) => (
            <div
              key={url}
              style={{
                position: 'relative',
                aspectRatio: '16/9',
                borderRadius: 10,
                overflow: 'hidden',
                border: '1px solid var(--color-border)',
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Foto ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {i === 0 && (
                <span style={{
                  position: 'absolute', top: 4, left: 4,
                  fontSize: 10, fontWeight: 700,
                  background: '#111827', color: '#fff',
                  padding: '2px 6px', borderRadius: 999,
                }}>
                  Principale
                </span>
              )}
              <button
                type="button"
                onClick={() => onChange(photos.filter((_, j) => j !== i))}
                aria-label="Rimuovi foto"
                style={{
                  position: 'absolute', top: 4, right: 4,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.6)', color: '#fff',
                  border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, lineHeight: 1,
                }}
              >
                <XIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {photos.length < maxPhotos && (
        <label
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 16px',
            background: 'var(--color-bg-secondary)', border: '1px dashed var(--color-border)',
            borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--color-fg)',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading
            ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
            : <Images size={14} />}
          {uploading ? 'Caricamento…' : `Aggiungi foto (${photos.length}/${maxPhotos})`}
          <input
            type="file" accept="image/*" multiple style={{ display: 'none' }}
            disabled={uploading}
            onChange={(e) => { if (e.target.files?.length) void handleFilesSelect(e.target.files) }}
          />
        </label>
      )}
    </div>
  )
}

// ─── Location Form (inside modal) ─────────────────────────────────────────────

function LocationForm({
  location,
  onClose,
  onSaved,
  tenantId,
}: {
  location: LocationSettings | null
  onClose: () => void
  onSaved: (loc: LocationSettings) => void
  tenantId: string
}) {
  const [name, setName] = React.useState(location?.name ?? '')
  const [address, setAddress] = React.useState(location?.address ?? '')
  const [phone, setPhone] = React.useState(location?.phone ?? '')
  const [isActive, setIsActive] = React.useState(location?.isActive ?? true)
  const [photos, setPhotos] = React.useState<string[]>(location?.photos ?? [])
  const [loading, setLoading] = React.useState(false)

  const isEdit = Boolean(location?.id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Il nome è obbligatorio'); return }
    setLoading(true)
    const result = await upsertLocation({
      id: location?.id,
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      isActive,
      photos,
    })
    setLoading(false)
    if (result.success) {
      toast.success(isEdit ? 'Sede aggiornata' : 'Sede creata')
      onSaved({
        id: result.id ?? location?.id ?? '',
        name: name.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        isActive,
        photos,
      })
      onClose()
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Field label="Nome sede" >
        <input
          className="styll-input"
          style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Es. Sede principale"
          required
        />
      </Field>
      <Field label="Indirizzo">
        <input
          className="styll-input"
          style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Via Roma 1, Milano"
        />
      </Field>
      <Field label="Telefono">
        <input
          className="styll-input"
          type="tel"
          style={{ padding: '10px 12px', fontSize: 15, width: '100%' }}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+39 02 000 0000"
        />
      </Field>
      <Field label="Foto sede">
        <PhotosUploader photos={photos} onChange={setPhotos} tenantId={tenantId} />
      </Field>
      {/* FIX 4: sticky footer so Save button is always accessible on mobile */}
      <div style={{
        display: 'flex', gap: 10,
        paddingTop: 8, borderTop: '1px solid var(--color-border)', marginTop: 4,
        position: 'sticky', bottom: 0,
        background: '#fff', paddingBottom: 4,
      }}>
        <button type="button" onClick={onClose} className="styll-btn-secondary" style={{ flex: 1, padding: '12px 16px', fontSize: 14, minHeight: 44 }}>
          Annulla
        </button>
        <button type="submit" disabled={loading} className="styll-btn-primary" style={{ flex: 2, padding: '12px 16px', fontSize: 14, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
          {isEdit ? 'Salva modifiche' : 'Crea sede'}
        </button>
      </div>
    </form>
  )
}

// ─── Location Card (horizontal) ───────────────────────────────────────────────

function LocationCard({
  loc,
  onEdit,
  onDelete,
  isDeleting,
}: {
  loc: LocationSettings
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex',
        height: 148,
        border: '1px solid var(--color-border)',
        background: 'var(--color-bg)',
        boxShadow: hovered ? '0 8px 28px rgba(0,0,0,0.10)' : '0 2px 10px rgba(0,0,0,0.05)',
        transform: hovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'box-shadow 280ms ease, transform 280ms ease',
        opacity: loc.isActive ? 1 : 0.65,
      }}
    >
      {/* Left — photo panel */}
      <div
        style={{
          width: 156,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--color-bg-secondary)',
        }}
      >
        {loc.photos[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={loc.photos[0]}
            alt={loc.name}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              transform: hovered ? 'scale(1.07)' : 'scale(1)',
              transition: 'transform 350ms ease',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-fg-muted)',
              }}
            >
              <MapPin size={20} />
            </div>
          </div>
        )}

        {/* Photos count badge */}
        {loc.photos.length > 1 && (
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(0,0,0,0.55)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              borderRadius: 999,
              padding: '3px 8px',
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
            } as React.CSSProperties}
          >
            <Images size={10} />
            {loc.photos.length}
          </div>
        )}
      </div>

      {/* Right — info panel */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        {/* Top: name + status + address + phone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--color-fg)',
                margin: 0,
                lineHeight: 1.2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {loc.name}
            </p>
            {!loc.isActive && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--color-fg-muted)',
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 999,
                  padding: '2px 8px',
                  flexShrink: 0,
                }}
              >
                Inattiva
              </span>
            )}
          </div>

          {loc.address && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
              <MapPin size={12} color="var(--color-fg-muted)" style={{ marginTop: 2, flexShrink: 0 }} />
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--color-fg-secondary)',
                  margin: 0,
                  lineHeight: 1.4,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {loc.address}
              </p>
            </div>
          )}

          {loc.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Phone size={12} color="var(--color-fg-muted)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: 'var(--color-fg-muted)', margin: 0 }}>
                {loc.phone}
              </p>
            </div>
          )}
        </div>

        {/* Bottom: action buttons */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onEdit}
            title="Modifica sede"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: hovered ? 'var(--color-bg-secondary)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--color-fg-secondary)',
              transition: 'background 200ms ease',
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            title="Elimina sede"
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDeleting ? 'wait' : 'pointer',
              color: 'var(--color-danger)',
              transition: 'background 200ms ease',
            }}
          >
            {isDeleting
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <Trash2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Sedi tab ─────────────────────────────────────────────────────────────────

function SediTab({ locations: initialLocations, tenantId }: { locations: LocationSettings[]; tenantId: string }) {
  const [locations, setLocations] = React.useState<LocationSettings[]>(initialLocations)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingLoc, setEditingLoc] = React.useState<LocationSettings | null>(null)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [addHovered, setAddHovered] = React.useState(false)

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questa sede? L\'operazione è irreversibile.')) return
    setDeletingId(id)
    const result = await deleteLocation(id)
    setDeletingId(null)
    if (result.success) {
      setLocations((prev) => prev.filter((l) => l.id !== id))
      toast.success('Sede eliminata')
    } else {
      toast.error(result.error ?? 'Errore durante l\'eliminazione')
    }
  }

  function handleSaved(loc: LocationSettings) {
    if (loc.id) {
      setLocations((prev) => {
        const idx = prev.findIndex((l) => l.id === loc.id)
        if (idx === -1) return [...prev, loc]
        const next = [...prev]
        next[idx] = loc
        return next
      })
    }
  }

  return (
    <div>
      <SectionHeader
        icon={<MapPin size={20} />}
        title="Sedi"
        description="Gestisci le sedi della tua attività"
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {locations.map((loc) => (
          <LocationCard
            key={loc.id}
            loc={loc}
            onEdit={() => { setEditingLoc(loc); setModalOpen(true) }}
            onDelete={() => handleDelete(loc.id)}
            isDeleting={deletingId === loc.id}
          />
        ))}

        {/* Add new location */}
        <button
          type="button"
          onClick={() => { setEditingLoc(null); setModalOpen(true) }}
          onMouseEnter={() => setAddHovered(true)}
          onMouseLeave={() => setAddHovered(false)}
          style={{
            height: 148,
            borderRadius: 16,
            border: `2px dashed ${addHovered ? 'var(--color-fg-muted)' : 'var(--color-border)'}`,
            background: addHovered ? 'var(--color-bg-secondary)' : 'transparent',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            cursor: 'pointer',
            transition: 'background 200ms ease, border-color 200ms ease',
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: addHovered ? 'var(--color-bg)' : 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-fg-secondary)',
              transition: 'background 200ms ease',
            }}
          >
            <Plus size={18} />
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: addHovered ? 'var(--color-fg-secondary)' : 'var(--color-fg-muted)',
              transition: 'color 200ms ease',
            }}
          >
            Aggiungi sede
          </span>
        </button>
      </div>

      <StyllModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingLoc ? 'Modifica sede' : 'Nuova sede'}
        size="sm"
      >
        <LocationForm
          location={editingLoc}
          onClose={() => setModalOpen(false)}
          onSaved={handleSaved}
          tenantId={tenantId}
        />
      </StyllModal>
    </div>
  )
}

// ─── Subscription status badge ────────────────────────────────────────────────

function SubStatusBadge({ status }: { status: string }) {
  const styleMap: Record<string, { background: string; color: string; label: string }> = {
    trial: { background: '#FEF9C3', color: '#854D0E', label: 'In prova' },
    active: { background: '#F0FDF4', color: '#166534', label: 'Attivo' },
    past_due: { background: '#FEF2F2', color: '#991B1B', label: 'Scaduto' },
    cancelled: { background: '#F3F4F6', color: '#374151', label: 'Disdetto' },
  }
  const s = styleMap[status] ?? { background: '#F3F4F6', color: '#374151', label: status }
  return (
    <span
      style={{
        ...s,
        fontSize: 13,
        fontWeight: 600,
        padding: '4px 12px',
        borderRadius: 999,
        display: 'inline-block',
      }}
    >
      {s.label}
    </span>
  )
}

// ─── Abbonamento tab ──────────────────────────────────────────────────────────

function AbbonamentoTab({ subscription }: { subscription: ImpostazioniData['subscription'] }) {
  return (
    <div>
      <SectionHeader
        icon={<CreditCard size={20} />}
        title="Abbonamento"
        description="Dettagli del tuo piano attuale"
      />

      {!subscription ? (
        <div
          className="styll-card"
          style={{ padding: '24px', textAlign: 'center' }}
        >
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-fg)', margin: 0 }}>Nessun abbonamento attivo</p>
          <p style={{ fontSize: 13, color: 'var(--color-fg-muted)', margin: '8px 0 0' }}>
            Contatta il supporto per attivare un abbonamento.
          </p>
        </div>
      ) : (
        <div className="styll-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <p style={{ fontSize: 13, color: 'var(--color-fg-muted)', margin: '0 0 4px' }}>Piano</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>
                {subscription.planName ?? '—'}
              </p>
            </div>
            <SubStatusBadge status={subscription.status} />
          </div>

          {subscription.trialEndsAt && (
            <div
              style={{
                padding: '12px 16px',
                background: '#FEF9C3',
                border: '1px solid #FDE047',
                borderRadius: 10,
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: '#854D0E', margin: 0 }}>
                Periodo di prova attivo
              </p>
              <p style={{ fontSize: 12, color: '#A16207', margin: '3px 0 0' }}>
                Scade il{' '}
                {new Date(subscription.trialEndsAt).toLocaleDateString('it-IT', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}

          {subscription.planSlug && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--color-fg-muted)', margin: 0 }}>
                Slug piano: <code style={{ fontFamily: 'monospace', fontSize: 12 }}>{subscription.planSlug}</code>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ImpostazioniClient ───────────────────────────────────────────────────────

type Tab = 'business' | 'sedi' | 'abbonamento'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'business', label: 'Business', icon: <Building2 size={16} /> },
  { id: 'sedi', label: 'Sedi', icon: <MapPin size={16} /> },
  { id: 'abbonamento', label: 'Abbonamento', icon: <CreditCard size={16} /> },
]

export function ImpostazioniClient({ data }: { data: ImpostazioniData }) {
  const [activeTab, setActiveTab] = React.useState<Tab>('business')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="dashboard-page-title" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>Impostazioni</h1>
        <p style={{ fontSize: 14, color: 'var(--color-fg-muted)', margin: '4px 0 0' }}>
          Gestisci il tuo profilo, la tua attività e l&apos;abbonamento
        </p>
      </div>

      {/* Tab pills */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 32,
          overflowX: 'auto',
          padding: '4px 0',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '9px 18px',
              borderRadius: 999,
              border: activeTab === tab.id ? '1px solid #1A1A1A' : '1px solid #E9E9E9',
              background: activeTab === tab.id ? '#1A1A1A' : '#FFFFFF',
              color: activeTab === tab.id ? '#FFFFFF' : 'var(--color-fg-secondary)',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 150ms ease, color 150ms ease',
              minHeight: 40,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="styll-card" style={{ padding: '28px 24px' }}>
        {activeTab === 'business' && <BusinessTab tenant={data.tenant} />}
        {activeTab === 'sedi' && <SediTab locations={data.locations} tenantId={data.tenant?.id ?? ''} />}
        {activeTab === 'abbonamento' && <AbbonamentoTab subscription={data.subscription} />}
      </div>
    </div>
  )
}
