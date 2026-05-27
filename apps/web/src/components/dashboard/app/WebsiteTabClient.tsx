'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { ImagePlus, Trash2, GripVertical, Loader2, Star, AlertTriangle, Package } from 'lucide-react'
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
  uploadAboutImage,
  uploadWebsitePhoto,
  deleteWebsitePhoto,
  reorderWebsitePhotos,
  updateShowOnWebsite,
  updateProductShowOnSite,
} from '@/lib/actions/app-settings'
import type {
  WebsiteData,
  WebsitePhoto,
  WebsiteStaff,
  WebsiteLocation,
  WebsiteService,
  WebsiteProduct,
} from '@/lib/actions/app-settings'
import { HeroEditor } from './HeroEditor'
import { TeamEditor } from './TeamEditor'

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

function AboutImageUploader({ currentUrl, onUploaded }: { currentUrl: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadAboutImage(fd)
    setUploading(false)
    if (result.ok && result.url) {
      onUploaded(result.url)
      toast.success('Immagine caricata')
    } else {
      toast.error(result.error ?? 'Errore upload')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploading ? 'default' : 'pointer' }}
      >
        {uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={14} />}
        {uploading ? 'Caricamento…' : currentUrl ? 'Cambia foto' : 'Carica foto'}
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

export function WebsiteTabClient({
  initialData,
  aboutTitle,
  aboutText,
  aboutImageUrl,
  onAboutTitleChange,
  onAboutTextChange,
  onAboutImageUrlChange,
  heroImageUrl,
  heroTagline,
  heroDescription,
  tenantSlug,
  teamDescription,
}: {
  initialData: WebsiteData
  aboutTitle: string
  aboutText: string
  aboutImageUrl: string
  onAboutTitleChange: (v: string) => void
  onAboutTextChange: (v: string) => void
  onAboutImageUrlChange: (v: string) => void
  heroImageUrl: string | null
  heroTagline: string | null
  heroDescription: string | null
  tenantSlug: string | null
  teamDescription: string | null
}) {
  const [photos, setPhotos] = React.useState<WebsitePhoto[]>(initialData.photos)
  const [staff, setStaff] = React.useState<WebsiteStaff[]>(initialData.staff)
  const [locations, setLocations] = React.useState<WebsiteLocation[]>(initialData.locations)
  const [services, setServices] = React.useState<WebsiteService[]>(initialData.services)
  const [products, setProducts] = React.useState<WebsiteProduct[]>(initialData.products)
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

  async function handleProductToggle(id: string, value: boolean) {
    const prev = products.find((p) => p.id === id)
    if (!prev) return

    if (value && prev.isOutOfStock) {
      const confirmed = window.confirm(
        'Attenzione: questo prodotto è esaurito. Sei sicuro di volerlo mostrare sul sito?',
      )
      if (!confirmed) return
    }

    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, showOnSite: value } : p)))
    const result = await updateProductShowOnSite(id, value)
    if (!result.ok) {
      toast.error(result.error ?? 'Errore salvataggio')
      setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, showOnSite: !value } : p)))
    }
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
      {/* ── Hero — always first ─────────────────────────────────────────────── */}
      <HeroEditor
        initialImageUrl={heroImageUrl}
        initialTagline={heroTagline}
        initialDescription={heroDescription}
        tenantSlug={tenantSlug}
      />

      {/* ── Team — always second ─────────────────────────────────────────────── */}
      <TeamEditor
        staff={staff}
        onToggle={(id, val) => handleToggle('staff_members', id, val)}
        initialTeamDescription={teamDescription}
      />

      <SectionCard
        title="Chi siamo"
        description="Presentati ai tuoi clienti con un titolo, un testo e una foto."
      >
        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            Titolo <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(max 80 caratteri)</span>
          </label>
          <input
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10, border: '1.5px solid #E5E7EB', outline: 'none', background: '#FFFFFF', color: '#111111', boxSizing: 'border-box' }}
            value={aboutTitle}
            onChange={(e) => onAboutTitleChange(e.target.value.slice(0, 80))}
            placeholder='Es. "Il tuo barbiere di fiducia a Milano"'
            maxLength={80}
          />
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'right' }}>{aboutTitle.length}/80</p>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
            Testo di presentazione <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(max 400 caratteri)</span>
          </label>
          <textarea
            style={{ width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10, border: '1.5px solid #E5E7EB', outline: 'none', background: '#FFFFFF', color: '#111111', boxSizing: 'border-box', minHeight: 100, resize: 'vertical' }}
            value={aboutText}
            onChange={(e) => onAboutTextChange(e.target.value.slice(0, 400))}
            placeholder='Es. "Dal 2018 offriamo taglio e barba nel cuore di Milano..."'
            maxLength={400}
          />
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'right' }}>{aboutText.length}/400</p>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 8 }}>
            Foto About
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {aboutImageUrl && (
              <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1px solid #E5E7EB' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={aboutImageUrl} alt="About" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <AboutImageUploader currentUrl={aboutImageUrl} onUploaded={onAboutImageUrlChange} />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#F8F8F8', borderRadius: 8, padding: 12, marginTop: 10 }}>
            <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <p style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)', margin: 0, lineHeight: 1.5 }}>
              Per un risultato ottimale usa un&apos;immagine orizzontale di almeno <strong>730 × 600 px</strong> (proporzione 6:5). Foto verticali o quadrate verranno tagliate lateralmente.
            </p>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
          💡 Premi &quot;Salva impostazioni&quot; nel tab App per salvare le modifiche.
        </p>
      </SectionCard>

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

      <SectionCard
        title="Prodotti in vetrina"
        description="Scegli quali prodotti mostrare nella sezione prodotti della tua pagina pubblica."
      >
        {products.length === 0 && (
          <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9CA3AF' }}>
              <Package size={18} />
              <p style={{ margin: 0, fontSize: 13 }}>Non hai ancora aggiunto prodotti al catalogo.</p>
            </div>
            <a
              href="../catalogo"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#111827', textDecoration: 'none' }}
            >
              Vai al catalogo prodotti →
            </a>
          </div>
        )}

        {products.length > 0 && (
          <>
            {products.map((product) => (
              <ProductToggleRow
                key={product.id}
                product={product}
                onChange={handleProductToggle}
              />
            ))}
            <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>
              {products.filter((p) => p.showOnSite).length} prodott{products.filter((p) => p.showOnSite).length === 1 ? 'o visibile' : 'i visibili'} sul sito
            </p>
          </>
        )}

        {products.length > 0 && !products.some((p) => p.showOnSite) && (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#FFF9ED', border: '1px solid #FDE68A', borderRadius: 10, marginTop: 4 }}>
            <AlertTriangle size={14} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
              La sezione prodotti non sarà visibile sul tuo sito finché non attivi almeno un prodotto.
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  )
}

function ProductToggleRow({
  product,
  onChange,
}: {
  product: WebsiteProduct
  onChange: (id: string, value: boolean) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
      {/* Thumbnail */}
      <div style={{ width: 40, height: 40, borderRadius: 8, background: '#F3F4F6', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>
        {product.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Package size={16} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: product.showOnSite ? '#111827' : '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.name}
          </p>
          {product.isOutOfStock && (
            <span
              title="Questo prodotto è esaurito. Valuta se nasconderlo dal sito"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 4, background: '#FFF7ED', border: '1px solid #FDBA74', fontSize: 10, fontWeight: 700, color: '#C2410C', flexShrink: 0, cursor: 'help' }}
            >
              <AlertTriangle size={9} />
              Esaurito
            </span>
          )}
        </div>
        <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF' }}>
          {[product.brand, `€ ${product.priceSell.toFixed(2)}`].filter(Boolean).join(' · ')}
        </p>
        {!product.showOnSite && <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>Non visibile nel sito</p>}
      </div>

      {/* Toggle */}
      <button
        type="button"
        onClick={() => onChange(product.id, !product.showOnSite)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 12,
          padding: 2,
          border: 'none',
          cursor: 'pointer',
          background: product.showOnSite ? '#111827' : '#D1D5DB',
          flexShrink: 0,
          position: 'relative',
          transition: 'background 150ms ease',
        }}
        aria-label={product.showOnSite ? 'Rimuovi dal sito' : 'Mostra sul sito'}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: '#FFF',
            position: 'absolute',
            top: 2,
            left: product.showOnSite ? 22 : 2,
            transition: 'left 150ms ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )
}
