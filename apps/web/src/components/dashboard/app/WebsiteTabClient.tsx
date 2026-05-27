'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  ImagePlus,
  Trash2,
  GripVertical,
  Loader2,
  Star,
  AlertTriangle,
  Package,
  Info,
  ImageIcon,
  Users,
  FileText,
  MapPin,
  Scissors,
  ShoppingBag,
  Phone,
  Mail,
  MessageCircle,
  Music2,
  Facebook,
  Instagram,
  Plus,
  X,
  Wand2,
  ExternalLink,
  Monitor,
  Smartphone,
} from 'lucide-react'
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
  uploadHeroImage,
  saveSiteContent,
} from '@/lib/actions/app-settings'
import type {
  AppSettings,
  WebsiteData,
  WebsitePhoto,
  WebsiteStaff,
  WebsiteService,
  WebsiteProduct,
} from '@/lib/actions/app-settings'

// ─── Section tips ─────────────────────────────────────────────────────────────

const TIPS = {
  hero: {
    title: 'La prima impressione conta',
    tip: 'Usa una foto del tuo salone o di te al lavoro. Evita immagini generiche. Il titolo deve essere breve e diretto — i clienti lo leggono in 2 secondi.',
  },
  team: {
    title: 'Il tuo team fa la differenza',
    tip: 'Mostra solo i barbieri che lavorano attivamente. Aggiungi la specializzazione per ogni membro — aiuta i clienti a scegliere con chi prenotare.',
  },
  about: {
    title: 'Raccontati con autenticità',
    tip: 'Non scrivere "Siamo i migliori". Scrivi la tua storia vera: da quando lavori, cosa ami del tuo mestiere, cosa ti distingue. I clienti si fidelizzano alle persone, non ai servizi.',
  },
  locations: {
    title: 'Le tue sedi',
    tip: "Aggiungi una foto di ogni sede — preferibilmente scattata di giorno con buona luce. L'indirizzo preciso è fondamentale per Google Maps.",
  },
  services: {
    title: 'I tuoi servizi',
    tip: 'Rendi visibili solo i servizi che vuoi promuovere. Nascondere servizi non li elimina dal gestionale — restano prenotabili internamente.',
  },
  products: {
    title: 'La tua vetrina prodotti',
    tip: 'Mostra solo i prodotti disponibili in stock. Nascondili temporaneamente se sono esauriti — un prodotto esaurito visibile dà una cattiva impressione.',
  },
  contacts: {
    title: 'Come ti trovano i clienti',
    tip: 'Inserisci almeno telefono e Instagram. Il WhatsApp è opzionale ma molto usato in Italia. I social vengono mostrati nel footer del sito.',
  },
  photos: {
    title: 'Le foto del sito',
    tip: "La prima foto diventa l'immagine hero principale. Usa foto orizzontali di almeno 1200px per una resa ottimale.",
  },
}

// ─── SectionCard ─────────────────────────────────────────────────────────────

type LucideIcon = React.ComponentType<{ size?: number; style?: React.CSSProperties; color?: string }>

function SectionCard({
  title,
  icon: Icon,
  tipTitle,
  tip,
  badge,
  children,
}: {
  title: string
  icon: LucideIcon
  tipTitle: string
  tip: string
  badge?: string
  children: React.ReactNode
}) {
  const [showTip, setShowTip] = React.useState(false)
  const tipRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!showTip) return
    function handleClickOutside(e: MouseEvent) {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) {
        setShowTip(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowTip(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showTip])

  return (
    <div
      style={{
        background: '#FFF',
        borderRadius: 16,
        padding: 24,
        border: '1px solid rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={20} style={{ color: '#111827', flexShrink: 0 }} />
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {badge && (
            <span style={{ fontSize: 11, fontWeight: 600, background: '#F0F0F0', color: '#6B7280', borderRadius: 100, padding: '2px 8px', whiteSpace: 'nowrap' }}>
              {badge}
            </span>
          )}
          <div ref={tipRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowTip((v) => !v)}
              style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: showTip ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.3)', borderRadius: 6, transition: 'color 120ms ease' }}
              aria-label="Suggerimento"
            >
              <Info size={16} />
            </button>
            {showTip && (
              <div
                role="tooltip"
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 36,
                  width: 280,
                  background: '#1A1A1A',
                  color: '#FFF',
                  borderRadius: 12,
                  padding: '14px 16px',
                  zIndex: 999,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                }}
              >
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700 }}>{tipTitle}</p>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.8)' }}>{tip}</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: '#F3F4F6' }} />
      {children}
    </div>
  )
}

// ─── MagicWand ────────────────────────────────────────────────────────────────

type MagicField = 'tagline' | 'description' | 'about_title' | 'about_text' | 'team_description'

interface MagicContext {
  business_name: string
  city: string
  services: string[]
  staff_count: number
  staff_names?: string[]
}

const MAGIC_TEMPLATES: Record<MagicField, (ctx: MagicContext) => string[]> = {
  tagline: (ctx) => [
    `Il tuo barbiere di fiducia${ctx.city ? ` a ${ctx.city}` : ''}`,
    `Dove ogni taglio racconta una storia`,
    `Stile, cura e precisione — ogni volta`,
    `${ctx.business_name}: l'arte del grooming`,
    `Non solo un taglio. Un'esperienza`,
  ],
  description: (ctx) => [
    `Prenota il tuo appuntamento e lascia fare a noi`,
    ctx.services.length >= 2
      ? `${ctx.services[0]}, ${ctx.services[1]} e molto altro — sempre al massimo`
      : `Servizi professionali sempre al massimo livello`,
    `Artigianato e stile${ctx.city ? ` nel cuore di ${ctx.city}` : ''}`,
  ],
  about_title: (ctx) => [
    `La nostra storia`,
    `Chi c'è dietro ${ctx.business_name}`,
    `Passione che si vede`,
    `Nati per fare questo`,
    `${ctx.business_name} — dal taglio alla cura`,
  ],
  about_text: (ctx) => {
    const staffLine =
      ctx.staff_count > 1
        ? `Il nostro team di ${ctx.staff_count} professionisti`
        : `Con anni di esperienza`
    const servicesLine =
      ctx.services.length >= 2
        ? `Dai ${ctx.services[0]} alla ${ctx.services[1]}`
        : ctx.services[0] ? `Dal ${ctx.services[0]}` : `Da ogni servizio`
    const namesLine =
      (ctx.staff_names?.length ?? 0) >= 2
        ? `${ctx.staff_names![0]} e ${ctx.staff_names![1]} ti aspettano`
        : 'Ti aspettiamo'
    return [
      `Da ${ctx.business_name} non trovi solo un taglio — trovi un posto dove sentirti a tuo agio.\n${staffLine} lavora ogni giorno per offrirti il meglio.\n${servicesLine}, curiamo ogni dettaglio.`,
      `${ctx.city ? `${ctx.city}, ` : ''}${ctx.business_name}.\nUn posto dove il tempo si ferma e tu sei al centro.\n${namesLine} per un'esperienza che non dimenticherai.`,
      `Crediamo che ogni cliente meriti il meglio.\nPer questo in ${ctx.business_name} usiamo solo prodotti selezionati e tecniche aggiornate — per un risultato che parla da solo.`,
    ]
  },
  team_description: (ctx) => [
    `Chi ti servirà con passione e competenza`,
    `Il team che fa la differenza`,
    `${ctx.staff_count > 0 ? `${ctx.staff_count} professionisti` : 'Professionisti'} al tuo servizio`,
    `Mani esperte, risultati garantiti`,
  ],
}

function typeWriter(text: string, setValue: (v: string) => void) {
  setValue('')
  let i = 0
  const interval = setInterval(() => {
    setValue(text.slice(0, i + 1))
    i++
    if (i >= text.length) clearInterval(interval)
  }, 18)
}

function MagicWandButton({
  field,
  context,
  onResult,
  disabled,
}: {
  field: MagicField
  context: MagicContext
  onResult: (text: string) => void
  disabled?: boolean
}) {
  const [currentIndex, setCurrentIndex] = React.useState(0)

  function handleClick() {
    if (disabled || !context.business_name) return
    const options = MAGIC_TEMPLATES[field](context)
    const nextIndex = currentIndex % options.length
    setCurrentIndex(nextIndex + 1)
    onResult(options[nextIndex])
  }

  const total = MAGIC_TEMPLATES[field](context).length
  const isDisabled = disabled || !context.business_name

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isDisabled}
      title={!context.business_name ? 'Configura prima il nome del salone' : 'Genera testo'}
      style={{
        position: 'relative',
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '3px 10px', borderRadius: 20, border: 'none',
        fontSize: 11, fontWeight: 700, color: '#FFF',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        backgroundSize: '200% 200%',
        animation: isDisabled ? 'none' : 'wand-gradient 3s ease infinite',
        cursor: isDisabled ? 'default' : 'pointer',
        opacity: isDisabled ? 0.4 : 1,
        overflow: 'hidden',
        transition: 'transform 120ms ease, opacity 120ms ease',
        boxShadow: isDisabled ? 'none' : '0 2px 10px rgba(102,126,234,0.35)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, opacity: 0.25,
          background: 'linear-gradient(90deg, transparent 0%, white 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: isDisabled ? 'none' : 'wand-shimmer 2s infinite',
        }}
      />
      <Wand2 size={11} style={{ position: 'relative', zIndex: 1 }} />
      <span style={{ position: 'relative', zIndex: 1 }}>Genera</span>
      {total > 1 && (
        <span style={{ position: 'relative', zIndex: 1, opacity: 0.7 }}>
          {(currentIndex % total) + 1}/{total}
        </span>
      )}
    </button>
  )
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

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
        style={{ width: 44, height: 24, borderRadius: 12, padding: 2, border: 'none', cursor: 'pointer', background: isOn ? '#111827' : '#D1D5DB', flexShrink: 0, position: 'relative', transition: 'background 150ms ease' }}
        aria-label={isOn ? 'Disabilita' : 'Abilita'}
      >
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FFF', position: 'absolute', top: 2, left: isOn ? 22 : 2, transition: 'left 150ms ease', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )
}

// ─── ProductToggleRow ─────────────────────────────────────────────────────────

function ProductToggleRow({ product, onChange }: { product: WebsiteProduct; onChange: (id: string, value: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #F3F4F6' }}>
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
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: product.showOnSite ? '#111827' : '#9CA3AF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</p>
          {product.isOutOfStock && (
            <span title="Prodotto esaurito" style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '1px 6px', borderRadius: 4, background: '#FFF7ED', border: '1px solid #FDBA74', fontSize: 10, fontWeight: 700, color: '#C2410C', flexShrink: 0, cursor: 'help' }}>
              <AlertTriangle size={9} />Esaurito
            </span>
          )}
        </div>
        <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF' }}>{[product.brand, `€ ${product.priceSell.toFixed(2)}`].filter(Boolean).join(' · ')}</p>
        {!product.showOnSite && <p style={{ margin: '1px 0 0', fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' }}>Non visibile nel sito</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(product.id, !product.showOnSite)}
        style={{ width: 44, height: 24, borderRadius: 12, padding: 2, border: 'none', cursor: 'pointer', background: product.showOnSite ? '#111827' : '#D1D5DB', flexShrink: 0, position: 'relative', transition: 'background 150ms ease' }}
        aria-label={product.showOnSite ? 'Rimuovi dal sito' : 'Mostra sul sito'}
      >
        <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FFF', position: 'absolute', top: 2, left: product.showOnSite ? 22 : 2, transition: 'left 150ms ease', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )
}

// ─── SortableWebsitePhoto ─────────────────────────────────────────────────────

function SortableWebsitePhoto({ photo, isHero, onDelete }: { photo: WebsitePhoto; isHero: boolean; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id })
  const [hovering, setHovering] = React.useState(false)
  const [confirmDelete, setConfirmDelete] = React.useState(false)

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1, borderRadius: 12, overflow: 'hidden', position: 'relative', aspectRatio: '4/3', background: '#E5E7EB', cursor: isDragging ? 'grabbing' : 'default', boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.15)' : undefined }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setConfirmDelete(false) }}
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
          <button type="button" title="Trascina per riordinare" {...attributes} {...listeners} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'grab', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GripVertical size={16} color="#FFF" />
          </button>
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={16} color="#FFF" />
            </button>
          ) : (
            <button type="button" onClick={() => onDelete(photo.id)} style={{ padding: '6px 10px', borderRadius: 8, background: '#ef4444', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#FFF' }}>
              Elimina?
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── getInitials ──────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = (name ?? '').trim().split(/\s+/)
  if (parts.length >= 2) return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WebsiteTabClient({
  initialData,
  initialSettings,
}: {
  initialData: WebsiteData
  initialSettings: AppSettings | null
}) {
  // ── text form state ──────────────────────────────────────────────────────────
  const init = {
    tagline: initialSettings?.heroTagline ?? '',
    description: initialSettings?.heroDescription ?? '',
    teamDescription: initialSettings?.teamDescription ?? '',
    aboutTitle: initialSettings?.aboutTitle ?? '',
    aboutText: initialSettings?.aboutText ?? '',
    locationsDescription: initialSettings?.locationsDescription ?? '',
    contactPhone: initialSettings?.contactPhone ?? (initialData.locations[0]?.phone ?? ''),
    contactEmail: initialSettings?.contactEmail ?? (initialData.locations[0]?.email ?? ''),
    contactWhatsapp: initialSettings?.contactWhatsapp ?? '',
    socialInstagram: initialSettings?.socialInstagram ?? '',
    socialFacebook: initialSettings?.socialFacebook ?? '',
    socialTiktok: initialSettings?.socialTiktok ?? '',
  }

  const [values, setValues] = React.useState(init)
  const [savedValues, setSavedValues] = React.useState(init)
  const [isSaving, setIsSaving] = React.useState(false)

  const isDirty = JSON.stringify(values) !== JSON.stringify(savedValues)

  function setValue<K extends keyof typeof values>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }))
  }

  function handleDiscard() {
    setValues(savedValues)
  }

  async function handleSave() {
    setIsSaving(true)
    const result = await saveSiteContent({
      tagline: values.tagline.trim() || null,
      description: values.description.trim() || null,
      teamDescription: values.teamDescription.trim() || null,
      aboutTitle: values.aboutTitle.trim() || null,
      aboutText: values.aboutText.trim() || null,
      locationsDescription: values.locationsDescription.trim() || null,
      contactPhone: values.contactPhone.trim() || null,
      contactEmail: values.contactEmail.trim() || null,
      contactWhatsapp: values.contactWhatsapp.trim() || null,
      socialInstagram: values.socialInstagram.trim() || null,
      socialFacebook: values.socialFacebook.trim() || null,
      socialTiktok: values.socialTiktok.trim() || null,
    })
    setIsSaving(false)

    if (result.ok) {
      setSavedValues(values)
      toast.success('Sito salvato')
      if (iframeRef.current) {
        iframeRef.current.contentWindow?.location.reload()
        setLastSaved(new Date())
      }
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio')
    }
  }

  // ── image state (saved immediately on upload) ────────────────────────────────
  const [heroImageUrl, setHeroImageUrl] = React.useState(initialSettings?.heroImageUrl ?? null)
  const [aboutImageUrl, setAboutImageUrl] = React.useState(initialSettings?.aboutImageUrl ?? null)
  const [uploadingHero, setUploadingHero] = React.useState(false)
  const [uploadingAbout, setUploadingAbout] = React.useState(false)
  const heroFileRef = React.useRef<HTMLInputElement>(null)
  const aboutFileRef = React.useRef<HTMLInputElement>(null)

  async function handleHeroImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return }
    setUploadingHero(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadHeroImage(fd)
    setUploadingHero(false)
    if (result.ok && result.url) { setHeroImageUrl(result.url); toast.success('Foto hero aggiornata') }
    else toast.error(result.error ?? 'Errore upload')
  }

  async function handleAboutImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingAbout(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadAboutImage(fd)
    setUploadingAbout(false)
    if (result.ok && result.url) { setAboutImageUrl(result.url); toast.success('Foto about aggiornata') }
    else toast.error(result.error ?? 'Errore upload')
  }

  // ── toggleable data (saves immediately) ─────────────────────────────────────
  const [staff, setStaff] = React.useState<WebsiteStaff[]>(initialData.staff)
  const [locations, setLocations] = React.useState(initialData.locations)
  const [services, setServices] = React.useState<WebsiteService[]>(initialData.services)
  const [products, setProducts] = React.useState<WebsiteProduct[]>(initialData.products)
  const [photos, setPhotos] = React.useState<WebsitePhoto[]>(initialData.photos)
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false)
  const photoFileRef = React.useRef<HTMLInputElement>(null)
  const pendingRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  React.useEffect(() => {
    return () => { for (const t of Object.values(pendingRef.current)) clearTimeout(t) }
  }, [])

  function handleToggle(table: 'staff_members' | 'services' | 'locations', id: string, value: boolean) {
    if (table === 'staff_members') setStaff((prev) => prev.map((m) => m.id === id ? { ...m, showOnWebsite: value } : m))
    if (table === 'locations') setLocations((prev) => prev.map((l) => l.id === id ? { ...l, showOnWebsite: value } : l))
    if (table === 'services') setServices((prev) => prev.map((s) => s.id === id ? { ...s, showOnWebsite: value } : s))
    clearTimeout(pendingRef.current[id])
    pendingRef.current[id] = setTimeout(async () => {
      const result = await updateShowOnWebsite(table, id, value)
      delete pendingRef.current[id]
      if (!result.ok) {
        toast.error(result.error ?? 'Errore salvataggio')
        if (table === 'staff_members') setStaff((prev) => prev.map((m) => m.id === id ? { ...m, showOnWebsite: !value } : m))
        if (table === 'locations') setLocations((prev) => prev.map((l) => l.id === id ? { ...l, showOnWebsite: !value } : l))
        if (table === 'services') setServices((prev) => prev.map((s) => s.id === id ? { ...s, showOnWebsite: !value } : s))
      }
    }, 400)
  }

  async function handleProductToggle(id: string, value: boolean) {
    const prev = products.find((p) => p.id === id)
    if (!prev) return
    if (value && prev.isOutOfStock && !window.confirm('Questo prodotto è esaurito. Mostrarlo comunque?')) return
    setProducts((ps) => ps.map((p) => p.id === id ? { ...p, showOnSite: value } : p))
    const result = await updateProductShowOnSite(id, value)
    if (!result.ok) {
      toast.error(result.error ?? 'Errore salvataggio')
      setProducts((ps) => ps.map((p) => p.id === id ? { ...p, showOnSite: !value } : p))
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (photos.length >= 10) { toast.error('Massimo 10 foto'); return }
    setUploadingPhoto(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadWebsitePhoto(fd)
    setUploadingPhoto(false)
    if (result.ok && result.photo) { setPhotos((prev) => [...prev, result.photo!]); toast.success('Foto aggiunta') }
    else toast.error(result.error ?? 'Errore upload')
  }

  async function handlePhotoDelete(id: string) {
    const prev = photos
    setPhotos((p) => p.filter((ph) => ph.id !== id))
    const result = await deleteWebsitePhoto(id)
    if (!result.ok) { toast.error(result.error ?? 'Errore eliminazione'); setPhotos(prev) }
    else toast.success('Foto eliminata')
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setPhotos((prev) => {
      const oldIndex = prev.findIndex((p) => p.id === active.id)
      const newIndex = prev.findIndex((p) => p.id === over.id)
      const reordered = arrayMove(prev, oldIndex, newIndex)
      reorderWebsitePhotos(reordered.map((p) => p.id)).catch(() => toast.error('Errore riordinamento'))
      return reordered
    })
  }

  // ── preview ──────────────────────────────────────────────────────────────────
  const iframeRef = React.useRef<HTMLIFrameElement>(null)
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null)
  const [previewDevice, setPreviewDevice] = React.useState<'desktop' | 'mobile'>('desktop')
  const [isMobile, setIsMobile] = React.useState(false)
  const tenantSlug = initialSettings?.slug ?? null
  const siteUrl = tenantSlug ? `https://${tenantSlug}.styll.it` : null

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 1024px)')
    setIsMobile(mql.matches)
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', h)
    return () => mql.removeEventListener('change', h)
  }, [])

  // ── AI context ───────────────────────────────────────────────────────────────
  const magicContext: MagicContext = {
    business_name: initialSettings?.businessName ?? '',
    city: initialData.locations[0]?.city ?? initialData.locations[0]?.address?.split(',').pop()?.trim() ?? '',
    services: initialData.services.map((s) => s.name).slice(0, 6),
    staff_count: initialData.staff.length,
    staff_names: initialData.staff.map((m) => m.fullName ?? '').filter(Boolean).slice(0, 3),
  }

  // ── Extra social channels ────────────────────────────────────────────────────
  type ExtraChannel = { id: string; type: 'gmaps' | 'youtube' | 'telegram' | 'website'; value: string }
  const [extraChannels, setExtraChannels] = React.useState<ExtraChannel[]>([])
  const [showChannelPicker, setShowChannelPicker] = React.useState(false)

  const CHANNEL_TYPES = [
    { type: 'gmaps' as const, label: 'Google Maps link' },
    { type: 'youtube' as const, label: 'YouTube' },
    { type: 'telegram' as const, label: 'Telegram' },
    { type: 'website' as const, label: 'Sito web esterno' },
  ]

  function addChannel(type: ExtraChannel['type']) {
    setExtraChannels((prev) => [...prev, { id: crypto.randomUUID(), type, value: '' }])
    setShowChannelPicker(false)
  }

  function updateChannel(id: string, value: string) {
    setExtraChannels((prev) => prev.map((c) => c.id === id ? { ...c, value } : c))
  }

  function removeChannel(id: string) {
    setExtraChannels((prev) => prev.filter((c) => c.id !== id))
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 14, borderRadius: 10,
    border: '1.5px solid #E5E7EB', outline: 'none', background: '#FFFFFF',
    color: '#111111', boxSizing: 'border-box', fontFamily: 'inherit',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  }

  const visibleStaff = staff.filter((m) => m.showOnWebsite).length
  const visibleServices = services.filter((s) => s.showOnWebsite).length
  const visibleProducts = products.filter((p) => p.showOnSite).length

  return (
    <>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        .magic-hover:hover { background: rgba(249,115,22,0.08) !important; }
        @keyframes wand-gradient { 0% { background-position: 0% 50% } 50% { background-position: 100% 50% } 100% { background-position: 0% 50% } }
        @keyframes wand-shimmer { 0% { background-position: -200% 0 } 100% { background-position: 200% 0 } }
      `}</style>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '540px 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* ── LEFT: editor ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 120 }}>

          {/* 1. HERO */}
          <SectionCard title="Hero — Prima impressione" icon={ImageIcon} tipTitle={TIPS.hero.title} tip={TIPS.hero.tip}>
            {/* Hero image */}
            <div>
              <label style={labelStyle}>
                <span>Foto di sfondo</span>
              </label>
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', background: '#F3F4F6', border: '1px solid #E5E7EB' }}>
                {heroImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9CA3AF' }}>
                    <ImageIcon size={36} />
                    <span style={{ fontSize: 13 }}>Nessuna foto caricata</span>
                  </div>
                )}
                {uploadingHero && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={32} color="#FFF" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                )}
              </div>
              <button type="button" onClick={() => heroFileRef.current?.click()} disabled={uploadingHero} style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploadingHero ? 'default' : 'pointer' }}>
                {uploadingHero ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={14} />}
                {uploadingHero ? 'Caricamento…' : heroImageUrl ? 'Cambia foto' : 'Carica foto'}
              </button>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>PNG, JPG, WebP — max 5MB</p>
              <input ref={heroFileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleHeroImageChange} />
            </div>

            {/* Tagline */}
            <div>
              <label style={labelStyle}>
                <span>Titolo hero <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(max 60 caratteri)</span></span>
                <MagicWandButton field="tagline" context={magicContext} disabled={isSaving}
                  onResult={(text) => typeWriter(text, (v) => setValue('tagline', v))} />
               </label>
               <input style={inputStyle} value={values.tagline} onChange={(e) => setValue('tagline', e.target.value.slice(0, 60))} placeholder="Es. Il tuo barbiere di fiducia" maxLength={60} />
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'right' }}>{values.tagline.length}/60</p>
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>
                <span>Descrizione breve <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(max 120 caratteri)</span></span>
                <MagicWandButton field="description" context={magicContext} disabled={isSaving}
                  onResult={(text) => typeWriter(text, (v) => setValue('description', v))} />
              </label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }} rows={3} value={values.description} onChange={(e) => setValue('description', e.target.value.slice(0, 120))} placeholder="Es. Taglio, barba e esperienza dal 2010" maxLength={120} />
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'right' }}>{values.description.length}/120</p>
            </div>
          </SectionCard>

          {/* 2. TEAM */}
          <SectionCard title="Il nostro Team" icon={Users} tipTitle={TIPS.team.title} tip={TIPS.team.tip} badge={`${visibleStaff} visibili`}>
            {/* Team description */}
            <div>
              <label style={labelStyle}>
                <span>Sottotitolo sezione <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(max 80 caratteri)</span></span>
                <MagicWandButton field="team_description" context={magicContext} disabled={isSaving}
                  onResult={(text) => typeWriter(text, (v) => setValue('teamDescription', v))} />
              </label>
              <input style={inputStyle} value={values.teamDescription} onChange={(e) => setValue('teamDescription', e.target.value.slice(0, 80))} placeholder="Chi ti servirà con passione e competenza" maxLength={80} />
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'right' }}>{values.teamDescription.length}/80</p>
            </div>

            <div style={{ height: 1, background: '#F3F4F6' }} />

            {/* Staff list */}
            {staff.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Nessun membro dello staff attivo.</p>}
            {staff.map((member) => (
              <ToggleRow
                key={member.id} id={member.id} label={member.fullName ?? 'Staff'}
                sublabel={member.role || undefined} photoUrl={member.photoUrl}
                initials={getInitials(member.fullName ?? '?')}
                isOn={member.showOnWebsite} onChange={(id, val) => handleToggle('staff_members', id, val)}
              />
            ))}

            {staff.length > 0 && visibleStaff < 2 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#FFF9ED', border: '1px solid #FDE68A', borderRadius: 10 }}>
                <AlertTriangle size={14} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                  Con {visibleStaff} {visibleStaff === 1 ? 'membro visibile' : 'membri visibili'} la sezione non apparirà sul sito.
                </p>
              </div>
            )}
          </SectionCard>

          {/* 3. ABOUT */}
          <SectionCard title="Chi siamo" icon={FileText} tipTitle={TIPS.about.title} tip={TIPS.about.tip}>
            <div>
              <label style={labelStyle}>
                <span>Titolo sezione <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(max 80 caratteri)</span></span>
                <MagicWandButton field="about_title" context={magicContext} disabled={isSaving}
                  onResult={(text) => typeWriter(text, (v) => setValue('aboutTitle', v))} />
              </label>
              <input style={inputStyle} value={values.aboutTitle} onChange={(e) => setValue('aboutTitle', e.target.value.slice(0, 80))} placeholder='Es. "Il tuo barbiere di fiducia a Milano"' maxLength={80} />
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'right' }}>{values.aboutTitle.length}/80</p>
            </div>

            <div>
              <label style={labelStyle}>
                <span>Testo di presentazione <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(max 400 caratteri)</span></span>
                <MagicWandButton field="about_text" context={magicContext} disabled={isSaving}
                  onResult={(text) => typeWriter(text, (v) => setValue('aboutText', v))} />
              </label>
              <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }} value={values.aboutText} onChange={(e) => setValue('aboutText', e.target.value.slice(0, 400))} placeholder='Es. "Dal 2018 offriamo taglio e barba nel cuore di Milano..."' maxLength={400} />
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0', textAlign: 'right' }}>{values.aboutText.length}/400</p>
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: 8 }}>Foto About</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {aboutImageUrl && (
                  <div style={{ width: 72, height: 72, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: '1px solid #E5E7EB' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={aboutImageUrl} alt="About" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <button type="button" onClick={() => aboutFileRef.current?.click()} disabled={uploadingAbout} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: uploadingAbout ? 'default' : 'pointer' }}>
                  {uploadingAbout ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={14} />}
                  {uploadingAbout ? 'Caricamento…' : aboutImageUrl ? 'Cambia foto' : 'Carica foto'}
                </button>
                <input ref={aboutFileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handleAboutImageChange} />
              </div>
              <p style={{ fontSize: 11, color: '#9CA3AF', margin: '6px 0 0' }}>Proporzione consigliata 6:5, min 730×600px</p>
            </div>
          </SectionCard>

          {/* 4. LOCATIONS */}
          <SectionCard title="Le nostre sedi" icon={MapPin} tipTitle={TIPS.locations.title} tip={TIPS.locations.tip} badge={`${locations.filter((l) => l.showOnWebsite).length} visibili`}>
            <div>
              <label style={labelStyle}>
                <span>Descrizione sezione <span style={{ color: '#9CA3AF', fontWeight: 400 }}>(opzionale)</span></span>
              </label>
              <input style={inputStyle} value={values.locationsDescription} onChange={(e) => setValue('locationsDescription', e.target.value.slice(0, 120))} placeholder="Es. Vieni a trovarci — ti aspettiamo" maxLength={120} />
            </div>
            <div style={{ height: 1, background: '#F3F4F6' }} />
            {locations.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Nessuna sede attiva.</p>}
            {locations.map((location) => (
              <ToggleRow
                key={location.id} id={location.id} label={location.name}
                sublabel={location.address ?? undefined}
                isOn={location.showOnWebsite} onChange={(id, val) => handleToggle('locations', id, val)}
              />
            ))}
          </SectionCard>

          {/* 5. SERVICES */}
          <SectionCard title="I nostri servizi" icon={Scissors} tipTitle={TIPS.services.title} tip={TIPS.services.tip} badge={`${visibleServices} visibili`}>
            {services.length === 0 && <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Nessun servizio attivo.</p>}
            {services.map((service) => (
              <ToggleRow
                key={service.id} id={service.id} label={service.name}
                sublabel={`€ ${service.price.toFixed(0)}${service.category ? ` · ${service.category}` : ''}`}
                isOn={service.showOnWebsite} onChange={(id, val) => handleToggle('services', id, val)}
              />
            ))}
          </SectionCard>

          {/* 6. PRODUCTS */}
          <SectionCard title="Prodotti in vetrina" icon={ShoppingBag} tipTitle={TIPS.products.title} tip={TIPS.products.tip} badge={`${visibleProducts} visibili`}>
            {products.length === 0 && (
              <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9CA3AF' }}>
                  <Package size={18} />
                  <p style={{ margin: 0, fontSize: 13 }}>Non hai ancora aggiunto prodotti al catalogo.</p>
                </div>
                <a href="../catalogo" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: '#111827', textDecoration: 'none' }}>
                  Vai al catalogo prodotti →
                </a>
              </div>
            )}
            {products.map((product) => (
              <ProductToggleRow key={product.id} product={product} onChange={handleProductToggle} />
            ))}
            {products.length > 0 && !products.some((p) => p.showOnSite) && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', background: '#FFF9ED', border: '1px solid #FDE68A', borderRadius: 10 }}>
                <AlertTriangle size={14} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
                <p style={{ margin: 0, fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>La sezione prodotti non sarà visibile finché non attivi almeno un prodotto.</p>
              </div>
            )}
          </SectionCard>

          {/* 7. CONTACTS */}
          <SectionCard title="Contatti e Social" icon={Phone} tipTitle={TIPS.contacts.title} tip={TIPS.contacts.tip}>
            {[
              { key: 'contactPhone' as const, label: 'Telefono principale', placeholder: '+39 000 000 0000', icon: Phone },
              { key: 'contactEmail' as const, label: 'Email', placeholder: 'info@tuosalone.it', icon: Mail },
              { key: 'contactWhatsapp' as const, label: 'WhatsApp', placeholder: '+39 000 000 0000', icon: MessageCircle },
              { key: 'socialInstagram' as const, label: 'Instagram', placeholder: '@tuosalone', icon: Instagram },
              { key: 'socialFacebook' as const, label: 'Facebook', placeholder: 'facebook.com/tuosalone', icon: Facebook },
              { key: 'socialTiktok' as const, label: 'TikTok', placeholder: '@tuosalone', icon: Music2 },
            ].map(({ key, label, placeholder, icon: FieldIcon }) => (
              <div key={key}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <FieldIcon size={13} />
                  {label}
                </label>
                <input style={inputStyle} value={values[key]} onChange={(e) => setValue(key, e.target.value)} placeholder={placeholder} />
              </div>
            ))}

            {extraChannels.map((ch) => (
              <div key={ch.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  value={ch.value}
                  onChange={(e) => updateChannel(ch.id, e.target.value)}
                  placeholder={CHANNEL_TYPES.find((c) => c.type === ch.type)?.label ?? ''}
                />
                <button type="button" onClick={() => removeChannel(ch.id)} style={{ width: 36, height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: '1px solid #E5E7EB', borderRadius: 8, cursor: 'pointer', color: '#9CA3AF' }}>
                  <X size={14} />
                </button>
              </div>
            ))}

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowChannelPicker((v) => !v)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'none', border: '1.5px dashed #D1D5DB', borderRadius: 8, fontSize: 13, color: '#6B7280', cursor: 'pointer', fontWeight: 500 }}
              >
                <Plus size={14} />
                Aggiungi canale
              </button>
              {showChannelPicker && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', overflow: 'hidden', zIndex: 100 }}>
                  {CHANNEL_TYPES.map((ct) => (
                    <button
                      key={ct.type}
                      type="button"
                      onClick={() => addChannel(ct.type)}
                      style={{ display: 'block', width: '100%', padding: '10px 16px', textAlign: 'left', fontSize: 13, color: '#111827', background: 'none', border: 'none', borderBottom: '1px solid #F3F4F6', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          {/* 8. PHOTOS */}
          <SectionCard title="Foto del sito" icon={ImageIcon} tipTitle={TIPS.photos.title} tip={TIPS.photos.tip} badge={`${photos.length}/10`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => photoFileRef.current?.click()}
                disabled={uploadingPhoto || photos.length >= 10}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', background: '#111827', color: '#FFF', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: uploadingPhoto || photos.length >= 10 ? 'default' : 'pointer', opacity: photos.length >= 10 ? 0.5 : 1 }}
              >
                {uploadingPhoto ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ImagePlus size={14} />}
                {uploadingPhoto ? 'Caricamento…' : 'Aggiungi foto'}
              </button>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{photos.length}/10 foto</span>
            </div>
            <input ref={photoFileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={handlePhotoUpload} />

            {photos.length === 0 && (
              <div style={{ padding: '32px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                Nessuna foto — aggiungine una per popolare la tua pagina pubblica
              </div>
            )}

            {photos.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={photos.map((p) => p.id)} strategy={rectSortingStrategy}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {photos.map((photo, index) => (
                      <SortableWebsitePhoto key={photo.id} photo={photo} isHero={index === 0} onDelete={handlePhotoDelete} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </SectionCard>

          {/* Main save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              fontSize: 15, fontWeight: 700, cursor: !isDirty || isSaving ? 'default' : 'pointer',
              background: !isDirty || isSaving ? '#D1D5DB' : '#111827',
              color: !isDirty || isSaving ? '#9CA3AF' : '#FFF',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'background 150ms ease, color 150ms ease',
            }}
          >
            {isSaving && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
            {isSaving ? 'Salvataggio…' : 'Salva modifiche sito'}
          </button>
        </div>

        {/* ── RIGHT: preview ─────────────────────────────────────────────────── */}
        {!isMobile && (
          <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 80px)' }}>
            {/* Preview header */}
            <div style={{ background: '#F8F8F8', borderRadius: '16px 16px 0 0', border: '1px solid rgba(0,0,0,0.08)', borderBottom: 'none', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Anteprima sito</span>
                {lastSaved && (
                  <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                    Aggiornata alle {lastSaved.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* Device toggles */}
                <div style={{ display: 'flex', background: '#EFEFEF', borderRadius: 8, padding: 2 }}>
                  {([['desktop', Monitor], ['mobile', Smartphone]] as const).map(([device, DevIcon]) => (
                    <button
                      key={device}
                      type="button"
                      onClick={() => setPreviewDevice(device)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, border: 'none', cursor: 'pointer', background: previewDevice === device ? '#FFF' : 'transparent', color: previewDevice === device ? '#111827' : '#9CA3AF', boxShadow: previewDevice === device ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', transition: 'all 120ms ease' }}
                      aria-label={device}
                    >
                      <DevIcon size={14} />
                    </button>
                  ))}
                </div>
                {siteUrl && (
                  <a href={siteUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB', background: '#FFF' }}>
                    <ExternalLink size={11} />
                    Apri
                  </a>
                )}
              </div>
            </div>

            {/* Iframe */}
            <div style={{ border: '1px solid rgba(0,0,0,0.08)', borderTop: 'none', borderRadius: '0 0 16px 16px', overflow: 'hidden', background: '#F3F4F6', display: 'flex', flex: 1, alignItems: 'flex-start', justifyContent: 'center' }}>
              {siteUrl ? (
                previewDevice === 'mobile' ? (
                  /* Mobile: narrow iframe centred */
                  <div style={{ width: 390, height: '100%', transition: 'width 300ms ease' }}>
                    <iframe
                      ref={iframeRef}
                      src={`${siteUrl}?preview=true`}
                      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                      title="Anteprima sito"
                    />
                  </div>
                ) : (
                  /* Desktop: 1440 px iframe scaled down to fit the panel */
                  <div style={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
                    <iframe
                      ref={iframeRef}
                      src={`${siteUrl}?preview=true`}
                      style={{
                        width: 1440,
                        height: '100%',
                        border: 'none',
                        display: 'block',
                        transform: 'scale(0.55)',
                        transformOrigin: 'top left',
                      }}
                      title="Anteprima sito"
                    />
                  </div>
                )
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#9CA3AF', padding: 40, textAlign: 'center', flex: 1 }}>
                  <Monitor size={40} />
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Il sito non è ancora configurato</p>
                  <p style={{ margin: 0, fontSize: 12 }}>Lo slug del tenant non è disponibile</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile preview link */}
        {isMobile && siteUrl && (
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 20px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: 12, fontSize: 14, fontWeight: 600, color: '#374151', textDecoration: 'none' }}
          >
            <ExternalLink size={16} />
            Vedi anteprima sito
          </a>
        )}
      </div>

      {/* ── Sticky dirty banner ────────────────────────────────────────────────── */}
      {isDirty && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
            background: '#1A1A1A', color: '#FFF',
            borderRadius: 14, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            animation: 'slideUp 250ms ease',
            maxWidth: 360,
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#F97316', flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: 13, fontWeight: 500, flex: 1 }}>Hai modifiche non salvate</span>
          <button
            type="button"
            onClick={handleDiscard}
            style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#FFF', cursor: 'pointer' }}
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            style={{ padding: '6px 14px', background: '#F97316', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, color: '#FFF', cursor: isSaving ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isSaving && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
            {isSaving ? 'Salvo…' : 'Salva'}
          </button>
        </div>
      )}
    </>
  )
}
