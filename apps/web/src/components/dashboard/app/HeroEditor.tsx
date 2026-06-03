'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { ImagePlus, Loader2, ExternalLink, Trash2 } from 'lucide-react'
import { uploadHeroImage, updateHeroContent, clearHeroImage } from '@/lib/actions/app-settings'

interface Props {
  initialImageUrl: string | null
  initialTagline: string | null
  initialDescription: string | null
  tenantSlug: string | null
}

export function HeroEditor({ initialImageUrl, initialTagline, initialDescription, tenantSlug }: Props) {
  const [imageUrl, setImageUrl] = React.useState(initialImageUrl ?? '')
  const [tagline, setTagline] = React.useState(initialTagline ?? '')
  const [description, setDescription] = React.useState(initialDescription ?? '')
  const [uploadingImage, setUploadingImage] = React.useState(false)
  const [removingImage, setRemovingImage] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  // Track last-saved values for dirty detection
  const [savedTagline, setSavedTagline] = React.useState(initialTagline ?? '')
  const [savedDescription, setSavedDescription] = React.useState(initialDescription ?? '')

  const fileRef = React.useRef<HTMLInputElement>(null)
  const dirty = tagline !== savedTagline || description !== savedDescription

  const siteUrl = tenantSlug ? `https://${tenantSlug}.styll.it` : null

  async function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Immagine troppo grande. Max 5MB')
      return
    }

    setUploadingImage(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadHeroImage(fd)
    setUploadingImage(false)

    if (result.ok && result.url) {
      setImageUrl(result.url)
      toast.success('Foto aggiornata ✓')
    } else {
      toast.error(result.error ?? 'Errore upload')
    }
  }

  async function handleRemoveImage() {
    setRemovingImage(true)
    const result = await clearHeroImage()
    setRemovingImage(false)

    if (result.ok) {
      setImageUrl('')
      toast.success('Foto rimossa ✓')
    } else {
      toast.error(result.error ?? 'Errore durante la rimozione')
    }
  }

  async function handleSave() {
    setSaving(true)
    const result = await updateHeroContent(tagline.trim() || null, description.trim() || null)
    setSaving(false)

    if (result.ok) {
      setSavedTagline(tagline)
      setSavedDescription(description)
      toast.success('Salvato ✓')
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <div
      style={{
        background: '#FFF',
        borderRadius: 16,
        padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Header */}
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>
          Hero — Prima impressione
        </h2>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
          La prima cosa che vedono i tuoi clienti quando visitano il tuo sito.
        </p>
      </div>

      {/* Hero image preview (16:9) */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
          Foto di sfondo
        </label>
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#F3F4F6',
            border: '1px solid #E5E7EB',
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt="Hero preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
                gap: 8,
                color: '#9CA3AF',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 500 }}>Nessuna foto caricata</span>
            </div>
          )}

          {/* Upload spinner overlay */}
          {uploadingImage && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Loader2 size={32} color="#FFF" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}
        </div>

        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploadingImage || removingImage}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: '#F3F4F6',
              color: '#374151',
              border: '1px solid #E5E7EB',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: uploadingImage || removingImage ? 'default' : 'pointer',
            }}
          >
            {uploadingImage
              ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              : <ImagePlus size={14} />}
            {uploadingImage ? 'Caricamento…' : imageUrl ? 'Cambia foto' : 'Carica foto'}
          </button>

          {imageUrl && (
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={uploadingImage || removingImage}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: uploadingImage || removingImage ? 'default' : 'pointer',
              }}
            >
              {removingImage
                ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                : <Trash2 size={14} />}
              {removingImage ? 'Rimozione…' : 'Rimuovi foto'}
            </button>
          )}
        </div>
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '6px 0 0' }}>
          PNG, JPG, WebP — max 5MB
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: 'none' }}
          onChange={handleImageChange}
        />
      </div>

      {/* Tagline */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
          Titolo hero
        </label>
        <input
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            borderRadius: 10,
            border: '1.5px solid #E5E7EB',
            outline: 'none',
            background: '#FFFFFF',
            color: '#111111',
            boxSizing: 'border-box',
          }}
          value={tagline}
          onChange={(e) => setTagline(e.target.value.slice(0, 60))}
          placeholder="Es. Il tuo barbiere di fiducia"
          maxLength={60}
        />
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'right' }}>
          {tagline.length}/60
        </p>
      </div>

      {/* Description */}
      <div>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
          Descrizione breve
        </label>
        <textarea
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: 14,
            borderRadius: 10,
            border: '1.5px solid #E5E7EB',
            outline: 'none',
            background: '#FFFFFF',
            color: '#111111',
            boxSizing: 'border-box',
            resize: 'vertical',
            minHeight: 80,
            fontFamily: 'inherit',
          }}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 120))}
          placeholder="Es. Taglio, barba e esperienza dal 2010"
          maxLength={120}
        />
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'right' }}>
          {description.length}/120
        </p>
      </div>

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !dirty}
        style={{
          width: '100%',
          padding: '12px',
          background: saving || !dirty ? '#D1D5DB' : '#111111',
          color: saving || !dirty ? '#9CA3AF' : '#FFFFFF',
          borderRadius: 10,
          border: 'none',
          fontSize: 14,
          fontWeight: 700,
          cursor: saving || !dirty ? 'default' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 150ms ease',
        }}
      >
        {saving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
        {saving ? 'Salvataggio…' : 'Salva modifiche'}
      </button>

      {/* Live preview banner */}
      <div
        style={{
          background: '#F0FDF4',
          border: '1px solid #BBF7D0',
          borderRadius: 10,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: '#166534', lineHeight: 1.4 }}>
          Le modifiche sono visibili sulla tua landing page in tempo reale
        </p>
        {siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              fontWeight: 600,
              color: '#15803D',
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Vedi il tuo sito <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  )
}
