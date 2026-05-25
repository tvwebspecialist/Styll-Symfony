'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { ImagePlus, Trash2, GripVertical, Loader2, Star } from 'lucide-react'
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
import {
  uploadWebsitePhoto,
  deleteWebsitePhoto,
  reorderWebsitePhotos,
  updateShowOnWebsite,
} from '@/lib/actions/app-settings'
import type {
  WebsiteData,
  WebsitePhoto,
  WebsiteStaff,
  WebsiteLocation,
  WebsiteService,
} from '@/lib/actions/app-settings'

function SortableWebsitePhoto({
  photo,
  isHero,
  onDelete,
}: {
  photo: WebsitePhoto
  isHero: boolean
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  const [hovering, setHovering] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        aspectRatio: '4 / 3',
        background: '#E5E7EB',
        cursor: isDragging ? 'grabbing' : 'default',
        boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined,
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => {
        setHovering(false)
        setConfirmDelete(false)
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

      {isHero && (
        <div style={{ position: 'absolute', top: 6, left: 6, background: '#F97316', borderRadius: 6, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
          <Star size={9} color="#FFF" fill="#FFF" />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#FFF' }}>Hero</span>
        </div>
      )}

      {hovering && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <button
            type="button"
            title="Trascina per riordinare"
            {...attributes}
            {...listeners}
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <GripVertical size={16} color="#FFF" />
          </button>
          {!confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Trash2 size={16} color="#FFF" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDelete(photo.id)}
              style={{ padding: '6px 10px', borderRadius: 8, background: '#ef4444', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#FFF' }}
            >
              Elimina?
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ToggleRow({
  id,
  label,
  sublabel,
  photoUrl,
  initials,
  isOn,
  onChange,
}: {
  id: string
  label: string
  sublabel?: string
  photoUrl?: string | null
  initials?: string
  isOn: boolean
  onChange: (id: string, value: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
      {(photoUrl !== undefined || initials !== undefined) && (
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F3F4F6', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#6B7280' }}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials ?? '?'
          )}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: isOn ? '#111827' : '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
        {sublabel && <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF' }}>{sublabel}</p>}
        {!isOn && <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>Non visibile nel sito</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(id, !isOn)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          padding: 2,
          border: 'none',
          cursor: 'pointer',
          background: isOn ? '#111827' : '#D1D5DB',
          flexShrink: 0,
          position: 'relative',
          transition: 'background 150ms ease',
        }}
        aria-label={isOn ? 'Disabilita' : 'Abilita'}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#FFF',
            position: 'absolute',
            top: 2,
            left: isOn ? 22 : 2,
            transition: 'left 150ms ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFF', borderRadius: 16, padding: 24, border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h2>
        {description && <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>{description}</p>}
      </div>
      {children}
    </div>
  )
}

export function WebsiteTabClient({ initialData }: { initialData: WebsiteData }) {
  const [photos, setPhotos] = React.useState<WebsitePhoto[]>(initialData.photos)
  const [staff, setStaff] = React.useState<WebsiteStaff[]>(initialData.staff)
  const [locations, setLocations] = React.useState<WebsiteLocation[]>(initialData.locations)
  const [services, setServices] = React.useState<WebsiteService[]>(initialData.services)
  const [uploading, setUploading] = React.useState(false)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))
  const pendingRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  React.useEffect(() => {
    return () => {
      for (const timeout of Object.values(pendingRef.current)) {
        clearTimeout(timeout)
      }
    }
  }, [])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (photos.length >= 10) {
      toast.error('Massimo 10 foto')
      return
    }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadWebsitePhoto(fd)
    setUploading(false)

    if (result.ok && result.photo) {
      const uploadedPhoto = result.photo
      setPhotos((prev) => [...prev, uploadedPhoto])
      toast.success('Foto aggiunta')
    } else {
      toast.error(result.error ?? 'Errore upload')
    }
  }

  async function handlePhotoDelete(id: string) {
    const previousPhotos = photos
    setPhotos((prev) => prev.filter((photo) => photo.id !== id))
    const result = await deleteWebsitePhoto(id)
    if (!result.ok) {
      toast.error(result.error ?? 'Errore eliminazione')
      setPhotos(previousPhotos)
    } else {
      toast.success('Foto eliminata')
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setPhotos((prev) => {
      const oldIndex = prev.findIndex((photo) => photo.id === active.id)
      const newIndex = prev.findIndex((photo) => photo.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      reorderWebsitePhotos(reordered.map((photo) => photo.id)).catch(() => toast.error('Errore riordinamento'))
      return reordered
    })
  }

  function handleToggle(
    table: 'staff_members' | 'services' | 'locations',
    id: string,
    value: boolean,
  ) {
    if (table === 'staff_members') {
      setStaff((prev) => prev.map((member) => (member.id === id ? { ...member, showOnWebsite: value } : member)))
    }
    if (table === 'locations') {
      setLocations((prev) => prev.map((location) => (location.id === id ? { ...location, showOnWebsite: value } : location)))
    }
    if (table === 'services') {
      setServices((prev) => prev.map((service) => (service.id === id ? { ...service, showOnWebsite: value } : service)))
    }

    clearTimeout(pendingRef.current[id])
    pendingRef.current[id] = setTimeout(async () => {
      const result = await updateShowOnWebsite(table, id, value)
      delete pendingRef.current[id]
      if (!result.ok) {
        toast.error(result.error ?? 'Errore salvataggio')
        if (table === 'staff_members') {
          setStaff((prev) => prev.map((member) => (member.id === id ? { ...member, showOnWebsite: !value } : member)))
        }
        if (table === 'locations') {
          setLocations((prev) => prev.map((location) => (location.id === id ? { ...location, showOnWebsite: !value } : location)))
        }
        if (table === 'services') {
          setServices((prev) => prev.map((service) => (service.id === id ? { ...service, showOnWebsite: !value } : service)))
        }
      }
    }, 400)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <SectionCard
        title="Foto del sito"
        description="Le foto che appaiono nella tua pagina pubblica. La prima è la hero image principale."
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || photos.length >= 10}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '10px 16px',
              background: '#111827',
              color: '#FFF',
              border: 'none',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              cursor: uploading || photos.length >= 10 ? 'default' : 'pointer',
              opacity: photos.length >= 10 ? 0.5 : 1,
            }}
          >
            {uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={14} />}
            {uploading ? 'Caricamento…' : 'Aggiungi foto'}
          </button>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{photos.length}/10 foto</span>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handlePhotoUpload} />

        {photos.length === 0 && (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
            Nessuna foto — aggiunge la prima per popolare la tua pagina pubblica
          </div>
        )}

        {photos.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={photos.map((photo) => photo.id)} strategy={rectSortingStrategy}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {photos.map((photo, index) => (
                  <SortableWebsitePhoto key={photo.id} photo={photo} isHero={index === 0} onDelete={handlePhotoDelete} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </SectionCard>

      <SectionCard
        title="Team nel sito"
        description="Scegli quali membri del team mostrare nella sezione Team della tua pagina pubblica."
      >
        {staff.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Nessun membro dello staff attivo.</p>}
        {staff.map((member) => (
          <ToggleRow
            key={member.id}
            id={member.id}
            label={member.fullName ?? 'Staff'}
            sublabel={member.role}
            photoUrl={member.photoUrl}
            initials={(member.fullName ?? '?').charAt(0).toUpperCase()}
            isOn={member.showOnWebsite}
            onChange={(toggleId, nextValue) => handleToggle('staff_members', toggleId, nextValue)}
          />
        ))}
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>I membri disabilitati non appariranno nella sezione Team della tua app.</p>
      </SectionCard>

      <SectionCard
        title="Sedi nel sito"
        description="Controlla quali sedi sono visibili sulla tua pagina pubblica."
      >
        {locations.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Nessuna sede attiva.</p>}
        {locations.map((location) => (
          <ToggleRow
            key={location.id}
            id={location.id}
            label={location.name}
            sublabel={location.address ?? undefined}
            isOn={location.showOnWebsite}
            onChange={(toggleId, nextValue) => handleToggle('locations', toggleId, nextValue)}
          />
        ))}
      </SectionCard>

      <SectionCard
        title="Servizi nel sito"
        description="Scegli quali servizi mostrare. I servizi nascosti sono ancora prenotabili internamente."
      >
        {services.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Nessun servizio attivo.</p>}
        {services.map((service) => (
          <ToggleRow
            key={service.id}
            id={service.id}
            label={service.name}
            sublabel={`€ ${service.price.toFixed(0)}${service.category ? ` · ${service.category}` : ''}`}
            isOn={service.showOnWebsite}
            onChange={(toggleId, nextValue) => handleToggle('services', toggleId, nextValue)}
          />
        ))}
      </SectionCard>
    </div>
  )
}
