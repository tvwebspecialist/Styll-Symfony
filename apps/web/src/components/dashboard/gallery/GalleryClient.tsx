'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, GripVertical, Loader2, Images } from 'lucide-react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { addGalleryPhoto, deleteGalleryPhoto, reorderGalleryPhotos } from '@/lib/actions/gallery'
import type { GalleryPhoto } from '@/lib/actions/gallery'

// ─── SortablePhoto ─────────────────────────────────────────────────────────────

function SortablePhoto({
  photo,
  onDelete,
}: {
  photo: GalleryPhoto
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  })
  const [hovering, setHovering] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    aspectRatio: '1 / 1',
    background: '#E5E7EB',
    cursor: isDragging ? 'grabbing' : 'default',
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false)
        setConfirmDelete(false)
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.photoUrl}
        alt={photo.caption ?? 'Gallery photo'}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={(e) => {
          ;(e.target as HTMLImageElement).style.display = 'none'
        }}
      />

      {/* Hover overlay */}
      {hovering && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {/* Drag handle */}
          <button
            type="button"
            title="Trascina per riordinare"
            {...attributes}
            {...listeners}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <GripVertical size={16} />
          </button>

          {/* Delete button — double-click to confirm */}
          <button
            type="button"
            title={confirmDelete ? 'Clicca ancora per confermare' : 'Elimina foto'}
            onClick={() => {
              if (confirmDelete) {
                onDelete(photo.id)
              } else {
                setConfirmDelete(true)
              }
            }}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: confirmDelete ? '#EF4444' : 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              transition: 'background 150ms ease',
            }}
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Caption overlay */}
      {photo.caption && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '8px 10px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
            fontSize: 11,
            color: '#FFFFFF',
            fontWeight: 500,
            pointerEvents: 'none',
          }}
        >
          {photo.caption}
        </div>
      )}
    </div>
  )
}

// ─── GalleryClient ─────────────────────────────────────────────────────────────

export function GalleryClient({ initialPhotos }: { initialPhotos: GalleryPhoto[] }) {
  const [photos, setPhotos] = React.useState<GalleryPhoto[]>(initialPhotos)
  const [addOpen, setAddOpen] = React.useState(false)
  const [newUrl, setNewUrl] = React.useState('')
  const [newCaption, setNewCaption] = React.useState('')
  const [addLoading, setAddLoading] = React.useState(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = photos.findIndex((p) => p.id === active.id)
    const newIndex = photos.findIndex((p) => p.id === over.id)
    const reordered = arrayMove(photos, oldIndex, newIndex)
    setPhotos(reordered)
    void reorderGalleryPhotos(reordered.map((p) => p.id))
  }

  async function handleDelete(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
    const result = await deleteGalleryPhoto(id)
    if (!result.ok) {
      toast.error(result.error ?? 'Errore durante l\'eliminazione')
      setPhotos(initialPhotos)
    } else {
      toast.success('Foto eliminata')
    }
  }

  async function handleAdd() {
    if (!newUrl.trim()) {
      toast.error('Inserisci un URL valido')
      return
    }
    setAddLoading(true)
    const result = await addGalleryPhoto({
      photo_url: newUrl.trim(),
      caption: newCaption.trim() || undefined,
    })
    setAddLoading(false)
    if (result.ok) {
      toast.success('Foto aggiunta')
      setPhotos((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          tenantId: '',
          photoUrl: newUrl.trim(),
          caption: newCaption.trim() || null,
          displayOrder: prev.length,
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ])
      setNewUrl('')
      setNewCaption('')
      setAddOpen(false)
    } else {
      toast.error(result.error ?? 'Errore durante l\'aggiunta')
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    fontSize: 14,
    borderRadius: 10,
    border: '1.5px solid #E5E7EB',
    outline: 'none',
    background: '#FFFFFF',
    color: '#111111',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111111', margin: '0 0 4px' }}>
            Gallery
          </h1>
          <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
            {photos.length} {photos.length === 1 ? 'foto' : 'foto'} nel portfolio
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '10px 18px',
            background: '#111111',
            color: '#FFFFFF',
            borderRadius: 10,
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Aggiungi foto
        </button>
      </div>

      {/* Add photo panel */}
      {addOpen && (
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            padding: 24,
            marginBottom: 24,
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111111', margin: 0 }}>
            Aggiungi nuova foto
          </h3>
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                display: 'block',
                marginBottom: 6,
              }}
            >
              URL immagine *
            </label>
            <input
              className="styll-input"
              style={inputStyle}
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://esempio.com/foto.jpg"
            />
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
              Upload diretto Supabase Storage — coming soon
            </p>
          </div>
          <div>
            <label
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#374151',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Didascalia (opzionale)
            </label>
            <input
              className="styll-input"
              style={inputStyle}
              value={newCaption}
              onChange={(e) => setNewCaption(e.target.value)}
              placeholder="Descrizione della foto…"
            />
          </div>
          {newUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={newUrl}
              alt="Preview"
              style={{
                width: 80,
                height: 80,
                borderRadius: 10,
                objectFit: 'cover',
                border: '1px solid #E5E7EB',
              }}
            />
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => {
                setAddOpen(false)
                setNewUrl('')
                setNewCaption('')
              }}
              className="styll-btn-secondary"
              style={{ flex: 1, padding: '10px', fontSize: 14, borderRadius: 10, minHeight: 44 }}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={addLoading}
              className="styll-btn-primary"
              style={{
                flex: 2,
                padding: '10px',
                fontSize: 14,
                borderRadius: 10,
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              {addLoading && (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              )}
              Aggiungi
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {photos.length === 0 && !addOpen && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '64px 24px',
            gap: 16,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9CA3AF',
            }}
          >
            <Images size={32} />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: '#111111', margin: 0 }}>
              Nessuna foto
            </p>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '6px 0 0', maxWidth: 320 }}>
              Aggiungi il tuo lavoro migliore per mostrarlo ai clienti.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="styll-btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '11px 20px',
              fontSize: 14,
              borderRadius: 10,
              minHeight: 44,
            }}
          >
            <Plus size={16} />
            Aggiungi foto
          </button>
        </div>
      )}

      {/* Photo grid with DnD */}
      {photos.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 12,
              }}
            >
              {photos.map((photo) => (
                <SortablePhoto key={photo.id} photo={photo} onDelete={handleDelete} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}
