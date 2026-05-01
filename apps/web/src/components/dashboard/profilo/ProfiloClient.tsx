'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Image as ImageIcon,
  CreditCard,
  Bell,
  Shield,
  ChevronRight,
  ChevronLeft,
  LogOut,
  type LucideIcon,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ProfileData, SubscriptionInfo } from '@/lib/actions/profilo'
import { DatiPersonali } from './sections/DatiPersonali'
import { Portfolio } from './sections/Portfolio'
import { Abbonamento } from './sections/Abbonamento'
import { Notifiche } from './sections/Notifiche'
import { PrivacySicurezza } from './sections/PrivacySicurezza'

type SectionKey = 'profilo' | 'portfolio' | 'abbonamento' | 'notifiche' | 'privacy'

const SECTIONS: {
  key: SectionKey
  label: string
  icon: LucideIcon
  title: string
  subtitle: string
}[] = [
  {
    key: 'profilo',
    label: 'Il mio Profilo',
    icon: User,
    title: 'Dati personali',
    subtitle: 'Aggiorna le informazioni del tuo account.',
  },
  {
    key: 'portfolio',
    label: 'Portfolio',
    icon: ImageIcon,
    title: 'Portfolio',
    subtitle: 'Mostra il tuo lavoro ai clienti del salone.',
  },
  {
    key: 'abbonamento',
    label: 'Abbonamento',
    icon: CreditCard,
    title: 'Abbonamento',
    subtitle: 'Gestisci il tuo piano e i pagamenti.',
  },
  {
    key: 'notifiche',
    label: 'Notifiche',
    icon: Bell,
    title: 'Notifiche',
    subtitle: 'Decidi cosa vuoi ricevere e come.',
  },
  {
    key: 'privacy',
    label: 'Privacy & Sicurezza',
    icon: Shield,
    title: 'Privacy & Sicurezza',
    subtitle: 'Gestisci sessioni, dati personali e account.',
  },
]

export function ProfiloClient({
  profile,
  subscription,
}: {
  profile: ProfileData
  subscription: SubscriptionInfo
}) {
  const router = useRouter()
  const [active, setActive] = React.useState<SectionKey>('profilo')
  const [mobileSection, setMobileSection] = React.useState<SectionKey | null>(null)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(profile.avatarUrl)
  const [fullName, setFullName] = React.useState<string>(profile.fullName ?? '')
  const current = SECTIONS.find((s) => s.key === active)!

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials =
    (fullName || profile.email || '?')
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  const renderContent = (key: SectionKey) => {
    if (key === 'profilo') {
      return (
        <DatiPersonali
          profile={profile}
          avatarUrl={avatarUrl}
          fullName={fullName}
          onAvatarChange={setAvatarUrl}
          onFullNameChange={setFullName}
        />
      )
    }
    if (key === 'portfolio') return <Portfolio subscription={subscription} />
    if (key === 'abbonamento') return <Abbonamento subscription={subscription} />
    if (key === 'notifiche') return <Notifiche initial={profile.notificationPreferences} />
    return <PrivacySicurezza email={profile.email ?? ''} />
  }

  return (
    <>
      {/* Desktop */}
      <div
        className="profilo-desktop"
        style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}
      >
        <aside
          style={{
            width: 260,
            flexShrink: 0,
            background: '#FFFFFF',
            border: '1px solid #F0F0F0',
            borderRadius: 16,
            padding: 8,
          }}
        >
          <div
            style={{
              padding: '20px 12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 100,
                background: avatarUrl ? `center / cover no-repeat url(${avatarUrl})` : '#F0F0F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 24,
                fontWeight: 700,
                color: '#222222',
              }}
            >
              {!avatarUrl && initials}
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#222222', wordBreak: 'break-word' }}>
              {fullName || 'Senza nome'}
            </div>
            <div style={{ fontSize: 12, color: '#B0B0B0', wordBreak: 'break-all' }}>
              {profile.email ?? '—'}
            </div>
          </div>

          <div style={{ height: 1, background: '#F0F0F0', margin: '4px 8px 8px' }} />

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {SECTIONS.map((s) => {
              const Icon = s.icon
              const isActive = active === s.key
              return (
                <button
                  key={s.key}
                  onClick={() => setActive(s.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    fontSize: 14,
                    fontWeight: 500,
                    borderRadius: 10,
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: 'none',
                    background: isActive ? '#222222' : 'transparent',
                    color: isActive ? '#FFFFFF' : '#222222',
                    transition: 'background 120ms ease, color 120ms ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = '#F5F5F5'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <Icon size={16} />
                  <span>{s.label}</span>
                </button>
              )
            })}

            <div style={{ height: 1, background: '#F0F0F0', margin: '8px 4px' }} />

            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 10,
                cursor: 'pointer',
                textAlign: 'left',
                border: 'none',
                background: 'transparent',
                color: '#DC2626',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <LogOut size={16} />
              <span>Esci</span>
            </button>
          </nav>
        </aside>

        <section
          style={{
            flex: 1,
            minWidth: 0,
            background: '#FFFFFF',
            border: '1px solid #F0F0F0',
            borderRadius: 16,
            padding: 28,
          }}
        >
          <div key={active} className="tab-content">
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#222222', margin: 0 }}>
              {current.title}
            </h2>
            <p style={{ fontSize: 13, color: '#B0B0B0', margin: '4px 0 24px' }}>
              {current.subtitle}
            </p>
            {renderContent(active)}
          </div>
        </section>
      </div>

      {/* Mobile */}
      <div
        className="profilo-mobile"
        style={{ display: 'none', flexDirection: 'column', gap: 16 }}
      >
        {mobileSection === null ? (
          <>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                padding: '8px 0 12px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 100,
                  background: avatarUrl ? `center / cover no-repeat url(${avatarUrl})` : '#E9E9E9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 30,
                  fontWeight: 700,
                  color: '#222222',
                  border: '1px solid #F0F0F0',
                }}
              >
                {!avatarUrl && initials}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#222222' }}>
                {fullName || 'Senza nome'}
              </div>
              <div style={{ fontSize: 13, color: '#B0B0B0', wordBreak: 'break-all' }}>
                {profile.email ?? '—'}
              </div>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #F0F0F0',
                borderRadius: 14,
                overflow: 'hidden',
              }}
            >
              {SECTIONS.map((s, i) => {
                const Icon = s.icon
                return (
                  <button
                    key={s.key}
                    onClick={() => {
                      setActive(s.key)
                      setMobileSection(s.key)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 16px',
                      width: '100%',
                      background: '#FFFFFF',
                      border: 'none',
                      borderTop: i === 0 ? 'none' : '1px solid #F0F0F0',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#F5F5F5',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={16} color="#222222" />
                    </div>
                    <span style={{ flex: 1, fontSize: 15, color: '#222222', fontWeight: 500 }}>
                      {s.label}
                    </span>
                    <ChevronRight size={18} color="#B0B0B0" />
                  </button>
                )
              })}

              <button
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 16px',
                  width: '100%',
                  background: '#FFFFFF',
                  border: 'none',
                  borderTop: '1px solid #F0F0F0',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#DC2626',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#FEF2F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <LogOut size={16} color="#DC2626" />
                </div>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>Esci</span>
              </button>
            </div>
          </>
        ) : (
          <div className="tab-content" key={mobileSection}>
            <button
              type="button"
              onClick={() => setMobileSection(null)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                background: 'transparent',
                border: 'none',
                color: '#222222',
                fontSize: 15,
                fontWeight: 500,
                padding: '8px 0',
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              <ChevronLeft size={20} color="#222222" />
              Indietro
            </button>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#222222', margin: 0 }}>
              {SECTIONS.find((s) => s.key === mobileSection)?.title}
            </h2>
            <p style={{ fontSize: 13, color: '#B0B0B0', margin: '4px 0 20px' }}>
              {SECTIONS.find((s) => s.key === mobileSection)?.subtitle}
            </p>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #F0F0F0',
                borderRadius: 14,
                padding: 16,
              }}
            >
              {renderContent(mobileSection)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
