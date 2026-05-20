'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { ImagePlus, Loader2 } from 'lucide-react'
import { updateAppSettings, uploadTenantLogo } from '@/lib/actions/app-settings'
import type { AppSettings } from '@/lib/actions/app-settings'

// ─── Constants ─────────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  { value: 'outfit', label: 'Outfit — Moderno e pulito', family: 'Outfit' },
  { value: 'inter', label: 'Inter — Essenziale e leggibile', family: 'Inter' },
  { value: 'poppins', label: 'Poppins — Rotondo e amichevole', family: 'Poppins' },
  { value: 'playfair', label: 'Playfair Display — Elegante e classico', family: 'Playfair Display' },
  { value: 'montserrat', label: 'Montserrat — Bold e deciso', family: 'Montserrat' },
]

const GOOGLE_FONTS_MAP: Record<string, string> = {
  outfit: 'Outfit:wght@400;500;600;700;800',
  inter: 'Inter:wght@400;500;600;700;800',
  poppins: 'Poppins:wght@400;500;600;700;800',
  playfair: 'Playfair+Display:wght@400;600;700;800',
  montserrat: 'Montserrat:wght@400;500;600;700;800',
}

function getFontFamily(value: string | null): string {
  if (!value) return 'system-ui, sans-serif'
  const found = FONT_OPTIONS.find((f) => f.value === value)
  return found ? `'${found.family}', sans-serif` : 'system-ui, sans-serif'
}

function LogoUploader({
  currentUrl,
  onUploaded,
}: {
  currentUrl: string
  onUploaded: (url: string) => void
}) {
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const result = await uploadTenantLogo(fd)
    setUploading(false)

    if (result.ok && result.url) {
      onUploaded(result.url)
      toast.success('Logo caricato')
    } else {
      toast.error(result.error ?? 'Errore upload')
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          background: '#F3F4F6',
          border: '2px dashed #D1D5DB',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#9CA3AF',
        }}
      >
        {currentUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentUrl}
            alt="Logo"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <ImagePlus size={26} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            padding: '8px 16px',
            background: '#111111',
            color: '#FFFFFF',
            borderRadius: 8,
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: uploading ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {uploading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          {uploading ? 'Caricamento…' : 'Carica logo'}
        </button>
        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>
          PNG, JPG, WebP, SVG — max 2MB
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  )
}

// ─── iPhone Mockup Preview ─────────────────────────────────────────────────────

function PhonePreview({
  businessName,
  primaryColor,
  fontFamily,
}: {
  businessName: string
  primaryColor: string | null
  fontFamily: string | null
}) {
  const fontFamilyCss = getFontFamily(fontFamily)
  const accent = primaryColor || '#1A1A1A'
  const initial = businessName ? businessName.charAt(0).toUpperCase() : 'S'

  return (
    <div
      style={{
        width: 280,
        height: 560,
        border: '8px solid #1A1A1A',
        borderRadius: 44,
        overflow: 'hidden',
        background: '#F7F7F7',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: fontFamilyCss,
        boxShadow: '0 24px 60px rgba(0,0,0,0.20)',
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* Notch */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 80,
          height: 20,
          background: '#1A1A1A',
          borderRadius: 10,
          zIndex: 10,
        }}
      />

      {/* TopBar */}
      <div
        style={{
          background: '#FFFFFF',
          paddingTop: 40,
          paddingBottom: 10,
          paddingLeft: 16,
          paddingRight: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid #F0F0F0',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 700,
            color: '#FFFFFF',
            flexShrink: 0,
          }}
        >
          {initial}
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#111111',
            fontFamily: fontFamilyCss,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
        >
          {businessName || 'Il tuo salone'}
        </span>
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          padding: '12px 12px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {/* Greeting */}
        <div>
          <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontFamily: fontFamilyCss }}>
            Buongiorno 👋
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 800,
              color: '#111111',
              fontFamily: fontFamilyCss,
              lineHeight: 1.1,
            }}
          >
            Mario
          </p>
        </div>

        {/* Booking card */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: 14,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <p
            style={{
              margin: '0 0 10px',
              fontSize: 11,
              fontWeight: 700,
              color: '#111111',
              fontFamily: fontFamilyCss,
            }}
          >
            Prenota il tuo appuntamento
          </p>
          <div
            style={{
              height: 32,
              borderRadius: 10,
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{ fontSize: 11, fontWeight: 600, color: '#FFFFFF', fontFamily: fontFamilyCss }}
            >
              Prenota ora
            </span>
          </div>
        </div>

        {/* Service pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Taglio', 'Barba', 'Colore'].map((s) => (
            <div
              key={s}
              style={{
                padding: '4px 10px',
                borderRadius: 100,
                background: '#FFFFFF',
                border: `1.5px solid ${accent}`,
                fontSize: 9,
                fontWeight: 600,
                color: accent,
                fontFamily: fontFamilyCss,
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div
        style={{
          background: '#222222',
          padding: '5px',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          flexShrink: 0,
          height: 52,
        }}
      >
        {/* Active Home pill */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 100,
            padding: '5px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              background: '#222222',
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 9, fontWeight: 700, color: '#222222', fontFamily: fontFamilyCss }}>
            Home
          </span>
        </div>
        {/* Inactive tabs */}
        {['📅', '🛍️', '👤'].map((icon) => (
          <div
            key={icon}
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              opacity: 0.5,
            }}
          >
            {icon}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AppSettingsClient ─────────────────────────────────────────────────────────

export function AppSettingsClient({ initialSettings }: { initialSettings: AppSettings | null }) {
  const [businessName, setBusinessName] = React.useState(initialSettings?.businessName ?? '')
  const [primaryColor, setPrimaryColor] = React.useState(
    initialSettings?.primaryColor ?? '#1A1A1A',
  )
  const [secondaryColor, setSecondaryColor] = React.useState(
    initialSettings?.secondaryColor ?? '#4B5563',
  )
  const [fontFamily, setFontFamily] = React.useState(initialSettings?.fontFamily ?? 'outfit')
  const [logoUrl, setLogoUrl] = React.useState(initialSettings?.logoUrl ?? '')
  const [saving, setSaving] = React.useState(false)

  // Load Google Font dynamically when fontFamily changes
  React.useEffect(() => {
    if (!fontFamily) return
    const id = `gf-${fontFamily}`
    if (document.getElementById(id)) return
    const fontParam = GOOGLE_FONTS_MAP[fontFamily]
    if (!fontParam) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${fontParam}&display=swap`
    document.head.appendChild(link)
  }, [fontFamily])

  async function handleSave() {
    setSaving(true)
    const result = await updateAppSettings({
      businessName: businessName.trim(),
      primaryColor: primaryColor || null,
      secondaryColor: secondaryColor || null,
      fontFamily: fontFamily || null,
      logoUrl: logoUrl.trim() || null,
    })
    setSaving(false)
    if (result.ok) {
      toast.success("Impostazioni salvate! Le modifiche sono ora visibili nell'app cliente.")
    } else {
      toast.error(result.error ?? 'Errore durante il salvataggio')
    }
  }

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 6,
    display: 'block',
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
  const appHost = initialSettings?.slug ? `${initialSettings.slug}.styll.it` : 'App non configurata'
  const appUrl = initialSettings?.slug ? `https://${initialSettings.slug}.styll.it` : null

  return (
    <div style={{ padding: '0 0 40px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111111', margin: '0 0 4px' }}>
          La mia App
        </h1>
        <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>
          Personalizza l&apos;aspetto della tua app cliente
        </p>
      </div>

      {/* Status card */}
      <div
        style={{
          background: '#111111',
          borderRadius: 16,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <p
            style={{
              margin: '0 0 2px',
              fontSize: 13,
              color: 'rgba(255,255,255,0.6)',
              fontWeight: 500,
            }}
          >
            La tua app è attiva
          </p>
          <p style={{ margin: 0, fontSize: 15, color: '#FFFFFF', fontWeight: 700 }}>
            {appHost}
          </p>
        </div>
        {appUrl ? (
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '10px 18px',
              background: '#FFFFFF',
              color: '#111111',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            Apri app →
          </a>
        ) : null}
      </div>

      {/* 2-col layout: form | preview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 420px',
          gap: 32,
          alignItems: 'start',
        }}
      >
        {/* ── Left: Form ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Card 1 — Identità */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111111', margin: 0 }}>
              Identità
            </h2>
            <div>
              <label style={labelStyle}>Nome dell&apos;attività</label>
              <input
                className="styll-input"
                style={inputStyle}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Es. Barber Studio Marco"
              />
            </div>
            <div>
              <label style={labelStyle}>Logo</label>
              <LogoUploader currentUrl={logoUrl} onUploaded={setLogoUrl} />
            </div>
          </div>

          {/* Card — Icona App */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111111', margin: 0 }}>
              Icona App
            </h2>
            <p style={{ fontSize: 13, color: '#6B7280', margin: 0 }}>
              L&apos;icona che appare sulla schermata home del telefono quando l&apos;app viene
              installata. Viene generata automaticamente dal tuo logo e colore principale.
            </p>

            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
              {[
                { size: 60, label: 'iPhone' },
                { size: 48, label: 'Android' },
                { size: 32, label: 'Browser' },
              ].map(({ size, label }) => (
                <div
                  key={label}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
                >
                  <div
                    style={{
                      width: size,
                      height: size,
                      borderRadius: size * 0.22,
                      background: primaryColor || '#1A1A1A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                  >
                    {logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoUrl}
                        alt=""
                        style={{ width: '65%', height: '65%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: size * 0.45,
                          fontWeight: 800,
                          color: '#FFFFFF',
                          lineHeight: 1,
                        }}
                      >
                        {businessName.charAt(0).toUpperCase() || 'S'}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>{label}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 12, color: '#9CA3AF', margin: 0 }}>
              Per un&apos;icona perfetta carica un&apos;immagine quadrata senza bordi (min 512×512px)
            </p>
          </div>

          {/* Card 2 — Colori */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111111', margin: 0 }}>
              Colori
            </h2>

            <div>
              <label style={labelStyle}>Colore principale</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  style={{
                    width: 44,
                    height: 44,
                    padding: 2,
                    borderRadius: 10,
                    border: '1.5px solid #E5E7EB',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <input
                  className="styll-input"
                  style={{ ...inputStyle, width: 130, fontFamily: 'monospace' }}
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#1A1A1A"
                  maxLength={7}
                />
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0' }}>
                Usato per la navbar attiva, bottoni e accenti
              </p>
            </div>

            <div>
              <label style={labelStyle}>Colore secondario</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  style={{
                    width: 44,
                    height: 44,
                    padding: 2,
                    borderRadius: 10,
                    border: '1.5px solid #E5E7EB',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                />
                <input
                  className="styll-input"
                  style={{ ...inputStyle, width: 130, fontFamily: 'monospace' }}
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#4B5563"
                  maxLength={7}
                />
              </div>
              <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0' }}>
                Usato per badge, highlight e dettagli
              </p>
            </div>

            {/* Swatch preview */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {[primaryColor, secondaryColor, '#F3F4F6', '#E5E7EB', '#FFFFFF'].map((c, i) => (
                <div
                  key={i}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: c,
                    border: '1.5px solid rgba(0,0,0,0.08)',
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Card 3 — Font */}
          <div style={cardStyle}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111111', margin: 0 }}>Font</h2>
            <div>
              <label style={labelStyle}>Tipografia</label>
              <select
                className="styll-input"
                style={{ ...inputStyle, cursor: 'pointer' }}
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            {/* Font preview */}
            <div
              style={{
                padding: '16px 20px',
                background: '#F9FAFB',
                borderRadius: 12,
                border: '1px solid #E5E7EB',
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 24,
                  fontWeight: 700,
                  color: '#111111',
                  fontFamily: getFontFamily(fontFamily),
                  lineHeight: 1.2,
                }}
              >
                Il tuo salone
              </p>
              <p
                style={{
                  margin: '4px 0 0',
                  fontSize: 14,
                  color: '#6B7280',
                  fontFamily: getFontFamily(fontFamily),
                }}
              >
                Taglio • Barba • Colore
              </p>
            </div>
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              padding: '14px',
              background: saving ? '#555555' : '#111111',
              color: '#FFFFFF',
              borderRadius: 12,
              border: 'none',
              fontSize: 15,
              fontWeight: 700,
              cursor: saving ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'background 150ms ease',
            }}
          >
            {saving && <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />}
            {saving ? 'Salvataggio…' : 'Salva impostazioni'}
          </button>
        </div>

        {/* ── Right: iPhone Preview ── */}
        <div
          style={{
            position: 'sticky',
            top: 24,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: 0 }}>
            Anteprima live
          </p>
          <PhonePreview
            businessName={businessName}
            primaryColor={primaryColor}
            fontFamily={fontFamily}
          />
          <p
            style={{
              fontSize: 11,
              color: '#9CA3AF',
              textAlign: 'center',
              margin: 0,
              maxWidth: 260,
            }}
          >
            La preview si aggiorna in tempo reale mentre modifichi le impostazioni
          </p>
        </div>
      </div>
    </div>
  )
}
