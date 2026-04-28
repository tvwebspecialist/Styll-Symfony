'use client'

import * as React from 'react'
import { Upload, Trash2, Eye, EyeOff, X, Pencil } from 'lucide-react'
import {
  getPortfolio,
  getServicesForTags,
  addPortfolioPhoto,
  deletePortfolioPhoto,
  togglePhotoVisibility,
  type PortfolioPhoto,
  type ServiceOption,
  type SubscriptionInfo,
} from '@/lib/actions/profilo'
import { primaryButtonStyle, outlineButtonStyle, Toast } from '../ui'

const STARTER_LIMIT = 20

export function Portfolio({ subscription }: { subscription: SubscriptionInfo }) {
  const [photos, setPhotos] = React.useState<PortfolioPhoto[]>([])
  const [services, setServices] = React.useState<ServiceOption[]>([])
  const [loading, setLoading] = React.useState(true)
  const [msg, setMsg] = React.useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [modalOpen, setModalOpen] = React.useState(false)
  const [pendingFile, setPendingFile] = React.useState<File | null>(null)
  const [pendingPreview, setPendingPreview] = React.useState<string | null>(null)
  const [pendingTags, setPendingTags] = React.useState<string[]>([])
  const [pendingVisible, setPendingVisible] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)

  const fileRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    Promise.all([getPortfolio(), getServicesForTags()])
      .then(([p, s]) => {
        if (!cancelled) {
          setPhotos(p)
          setServices(s)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const limit = subscription.isPro ? Infinity : STARTER_LIMIT
  const reachedLimit = photos.length >= limit

  const openPicker = () => {
    if (reachedLimit) return
    fileRef.current?.click()
  }

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPendingFile(f)
    setPendingPreview(URL.createObjectURL(f))
    setPendingTags([])
    setPendingVisible(true)
    setModalOpen(true)
    e.target.value = ''
  }

  const handleSubmitNew = async () => {
    if (!pendingFile) return
    setSubmitting(true)
    setMsg(null)
    const fd = new FormData()
    fd.append('file', pendingFile)
    fd.append('tags', pendingTags.join(','))
    fd.append('visible', String(pendingVisible))
    const res = await addPortfolioPhoto(fd)
    setSubmitting(false)
    if (res.ok) {
      setPhotos((prev) => [res.photo, ...prev])
      closeModal()
      setMsg({ kind: 'success', text: 'Foto aggiunta' })
    } else {
      setMsg({ kind: 'error', text: res.error })
    }
  }

  const closeModal = () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview)
    setModalOpen(false)
    setPendingFile(null)
    setPendingPreview(null)
    setPendingTags([])
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questa foto?')) return
    const res = await deletePortfolioPhoto(id)
    if (res.ok) setPhotos((prev) => prev.filter((p) => p.id !== id))
  }

  const handleToggle = async (photo: PortfolioPhoto) => {
    const next = !photo.isVisible
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, isVisible: next } : p)))
    const res = await togglePhotoVisibility(photo.id, next)
    if (!res.ok) {
      setPhotos((prev) =>
        prev.map((p) => (p.id === photo.id ? { ...p, isVisible: !next } : p)),
      )
    }
  }

  const toggleTag = (id: string) => {
    setPendingTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ fontSize: 14, color: '#B0B0B0' }}>
          {loading ? 'Caricamento…' : `${photos.length} foto`}
        </div>
        <button onClick={openPicker} disabled={reachedLimit} style={primaryButtonStyle}>
          + Aggiungi foto
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={onFileSelected}
        />
      </div>

      {msg && <Toast message={msg.text} kind={msg.kind} />}

      {!subscription.isPro && (
        <div
          style={{
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 13,
            color: '#9A3412',
          }}
        >
          Hai usato {Math.min(photos.length, STARTER_LIMIT)}/{STARTER_LIMIT} foto. Passa a Growth
          per foto illimitate.
        </div>
      )}

      {loading ? (
        <div style={{ padding: 24, textAlign: 'center', color: '#B0B0B0' }}>Caricamento…</div>
      ) : photos.length === 0 ? (
        <button
          type="button"
          onClick={openPicker}
          disabled={reachedLimit}
          style={{
            border: '2px dashed #E9E9E9',
            borderRadius: 12,
            aspectRatio: '1',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: 'transparent',
            cursor: reachedLimit ? 'not-allowed' : 'pointer',
            color: '#B0B0B0',
            maxWidth: 260,
          }}
        >
          <Upload size={28} color="#B0B0B0" />
          <span style={{ fontSize: 13, color: '#B0B0B0' }}>Aggiungi foto</span>
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {photos.map((p) => (
            <PhotoCard
              key={p.id}
              photo={p}
              services={services}
              onDelete={() => handleDelete(p.id)}
              onToggle={() => handleToggle(p)}
            />
          ))}
          {!reachedLimit && (
            <button
              type="button"
              onClick={openPicker}
              style={{
                border: '2px dashed #E9E9E9',
                borderRadius: 12,
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'transparent',
                cursor: 'pointer',
                color: '#B0B0B0',
              }}
            >
              <Upload size={24} color="#B0B0B0" />
              <span style={{ fontSize: 13, color: '#B0B0B0' }}>Aggiungi foto</span>
            </button>
          )}
        </div>
      )}

      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            justifyContent: 'flex-end',
            zIndex: 100,
          }}
          onClick={closeModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 'min(420px, 100%)',
              height: '100%',
              background: '#FFFFFF',
              padding: 24,
              overflowY: 'auto',
              animation: 'tabFadeIn 200ms ease-out',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: '#222222' }}>Nuova foto</div>
              <button
                onClick={closeModal}
                aria-label="Chiudi"
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} color="#222222" />
              </button>
            </div>

            {pendingPreview && (
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginBottom: 16,
                  background: `center / cover no-repeat url(${pendingPreview})`,
                }}
              />
            )}

            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 11,
                  textTransform: 'uppercase',
                  color: '#B0B0B0',
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  marginBottom: 8,
                }}
              >
                Servizi
              </div>
              {services.length === 0 ? (
                <div style={{ fontSize: 13, color: '#B0B0B0' }}>
                  Nessun servizio configurato.
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {services.map((s) => {
                    const active = pendingTags.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleTag(s.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 100,
                          fontSize: 12,
                          fontWeight: 500,
                          cursor: 'pointer',
                          background: active ? '#222222' : '#FFFFFF',
                          color: active ? '#FFFFFF' : '#222222',
                          border: active ? '1px solid #222222' : '1px solid #E9E9E9',
                        }}
                      >
                        {s.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#222222',
                marginBottom: 24,
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={pendingVisible}
                onChange={(e) => setPendingVisible(e.target.checked)}
              />
              Visibile ai clienti
            </label>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={closeModal} style={outlineButtonStyle}>
                Annulla
              </button>
              <button
                onClick={handleSubmitNew}
                disabled={submitting}
                style={primaryButtonStyle}
              >
                {submitting ? 'Caricamento…' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PhotoCard({
  photo,
  services,
  onDelete,
  onToggle,
}: {
  photo: PortfolioPhoto
  services: ServiceOption[]
  onDelete: () => void
  onToggle: () => void
}) {
  const [hover, setHover] = React.useState(false)
  const firstTag = photo.serviceTags[0]
  const tagLabel = firstTag ? services.find((s) => s.id === firstTag)?.name ?? firstTag : null
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative',
        aspectRatio: '1',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#F0F0F0',
      }}
    >
      {photo.photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.photoUrl}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      )}

      <button
        type="button"
        onClick={onToggle}
        aria-label={photo.isVisible ? 'Nascondi' : 'Mostra'}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 28,
          height: 28,
          borderRadius: 100,
          background: '#FFFFFF',
          color: photo.isVisible ? '#222222' : '#B0B0B0',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
        }}
      >
        {photo.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>

      {tagLabel && (
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.6)',
            color: '#FFFFFF',
            fontSize: 11,
          }}
        >
          {tagLabel}
        </div>
      )}

      {hover && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={onToggle}
            aria-label="Modifica"
            style={{
              width: 36,
              height: 36,
              borderRadius: 100,
              background: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pencil size={16} color="#222222" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label="Elimina"
            style={{
              width: 36,
              height: 36,
              borderRadius: 100,
              background: '#FFFFFF',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Trash2 size={16} color="#DC2626" />
          </button>
        </div>
      )}
    </div>
  )
}
