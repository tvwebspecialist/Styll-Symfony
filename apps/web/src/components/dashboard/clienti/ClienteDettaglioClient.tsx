'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Phone,
  Zap,
  MessageCircle,
  Calendar,
  ShoppingBag,
  Clock,
  Mail,
  Cake,
  UserCheck,
  FileText,
  Star,
  Heart,
  AlertTriangle,
  Lock,
  Pencil,
  TrendingDown,
  Gift,
  Info,
  ChevronLeft,
  Plus,
  Package,
  CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import type { ClienteDettaglioData, LoyaltyInfo } from '@/lib/actions/clienti'
import { addClienteNota } from '@/lib/actions/clienti'
import { addManualPoints, barberRedeemForClient } from '@/lib/actions/loyalty'
import { Loader2 } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(nome: string): string {
  return nome.trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function formatEuro(n: number): string {
  return n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  )
}

function yearsAsClient(iso: string): number {
  return Math.max(0, new Date().getFullYear() - new Date(iso).getFullYear())
}

function tierBadgeStyle(tier: LoyaltyInfo['tier']): React.CSSProperties {
  const map: Record<LoyaltyInfo['tier'], React.CSSProperties> = {
    bronze: { background: 'linear-gradient(135deg, #cd7f32 0%, #a0522d 100%)', color: '#fff' },
    silver: { background: 'linear-gradient(135deg, #e8e6df 0%, #bdbab0 50%, #8a877e 100%)', color: '#0e0e0e' },
    gold: { background: 'linear-gradient(135deg, #ffd700 0%, #e8c587 50%, #c8a04a 100%)', color: '#0e0e0e' },
    diamond: { background: 'linear-gradient(135deg, #a8d8ea 0%, #aa96da 50%, #fcbad3 100%)', color: '#0e0e0e' },
  }
  return map[tier]
}

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string }> = {
  completed: { bg: '#47c847', color: '#fff', label: 'Completato' },
  cancelled: { bg: '#c85a47', color: '#fff', label: 'Cancellato' },
  no_show: { bg: '#e8b84c', color: '#333', label: 'No show' },
  pending: { bg: '#e5e2d9', color: '#5e5e5b', label: 'In attesa' },
  confirmed: { bg: '#4a90e2', color: '#fff', label: 'Confermato' },
}

const TX_CONFIG: Record<string, { label: string; color: string; sign: string }> = {
  earn: { label: 'Guadagnati', color: '#47c847', sign: '+' },
  redeem: { label: 'Riscattati', color: '#c85a47', sign: '-' },
  bonus: { label: 'Bonus', color: '#e8b84c', sign: '+' },
  import: { label: 'Importati', color: '#4a90e2', sign: '+' },
  adjustment: { label: 'Rettifica', color: '#9a968b', sign: '' },
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'panoramica' | 'appuntamenti' | 'scheda' | 'vendite' | 'loyalty' | 'note' | 'recensioni'

// ─── Sub-components ───────────────────────────────────────────────────────────

function VipBadge({ label }: { label: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: 'linear-gradient(133deg, #e8c587 0%, #d4a85f 50%, #a47a38 100%)', border: '1px solid rgba(253,248,242,0.18)', fontSize: 11, fontWeight: 600, color: 'rgba(251,251,251,0.92)', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
      <Star size={10} />{label}
    </span>
  )
}

function GlassBadge({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, background: 'rgba(253,248,242,0.10)', border: '1px solid rgba(253,248,242,0.18)', fontSize: 11, fontWeight: 600, color: 'rgba(253,248,242,0.92)', letterSpacing: '0.6px', textTransform: 'uppercase', backdropFilter: 'blur(5px)' }}>
      {icon}{label}
    </span>
  )
}

function TabBtn({ label, count, active, onClick }: { label: string; count?: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: active ? '8px 16px' : '8px 10px', borderRadius: 10, background: active ? '#000' : 'transparent', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 500, color: active ? '#fff' : '#5e5e5b', transition: 'all 0.15s', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
    >
      {label}
      {count !== undefined && (
        <span style={{ padding: '1px 7px', borderRadius: 999, background: active ? 'rgba(255,255,255,0.2)' : '#edeae2', fontSize: 10, fontWeight: 700, color: active ? '#fff' : '#9a968b' }}>
          {count}
        </span>
      )}
    </button>
  )
}

function InfoRow({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: '#9a968b', display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 13.5, color: '#5e5e5b' }}>{label}</span>
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 500, color: valueColor ?? '#222' }}>{value}</span>
    </div>
  )
}

function EmptyState({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ color: '#e5e2d9' }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#9a968b' }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: '#b0b0b0' }}>{sub}</div>}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ClienteDettaglioClient({ data }: { data: ClienteDettaglioData }) {
  const { cliente, analytics, preferenze, appuntamenti, loyalty, note, vendite } = data
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<Tab>('panoramica')
  const [noteText, setNoteText] = React.useState('')
  const [noteError, setNoteError] = React.useState<string | null>(null)
  const [isPending, startTransition] = React.useTransition()
  // Loyalty modals
  const [addPtsOpen, setAddPtsOpen] = React.useState(false)
  const [addPtsValue, setAddPtsValue] = React.useState(100)
  const [addPtsNote, setAddPtsNote] = React.useState('')
  const [addPtsPending, startAddPtsTransition] = React.useTransition()
  const [redeemOpen, setRedeemOpen] = React.useState(false)
  const [selectedRewardId, setSelectedRewardId] = React.useState<string | null>(null)
  const [redeemPending, startRedeemTransition] = React.useTransition()
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 1024px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const firstName = cliente.fullName.split(' ')[0]
  const years = yearsAsClient(cliente.clienteSince)

  const badges: { type: 'vip' | 'loyalty'; label: string }[] = []
  if (analytics.vipScore >= 70) badges.push({ type: 'vip', label: 'VIP' })
  if (years >= 1) badges.push({ type: 'loyalty', label: `Cliente da ${years} ${years === 1 ? 'anno' : 'anni'}` })

  function handleAddNota() {
    setNoteError(null)
    startTransition(async () => {
      const res = await addClienteNota(cliente.id, noteText)
      if (res.error) {
        setNoteError(res.error)
      } else {
        setNoteText('')
        router.refresh()
      }
    })
  }

  function handleAddPoints() {
    startAddPtsTransition(async () => {
      const res = await addManualPoints({ clientId: cliente.id, points: addPtsValue, note: addPtsNote })
      if (res.success) {
        setAddPtsOpen(false)
        setAddPtsNote('')
        setAddPtsValue(100)
        router.refresh()
      } else {
        alert(res.error ?? 'Errore')
      }
    })
  }

  function handleConfirmRedeem() {
    if (!selectedRewardId) return
    startRedeemTransition(async () => {
      const res = await barberRedeemForClient({ clientId: cliente.id, rewardId: selectedRewardId })
      if (res.success) {
        setRedeemOpen(false)
        setSelectedRewardId(null)
        router.refresh()
      } else {
        alert(res.error ?? 'Errore')
      }
    })
  }

  const churnBarBg =
    analytics.churnStatus === 'red'
      ? 'linear-gradient(15deg, #6b0a0a 39%, #c41818 61%)'
      : analytics.churnStatus === 'yellow'
        ? 'linear-gradient(15deg, #7a5200 39%, #c47a00 61%)'
        : '#9ca3af'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Back link */}
      <Link
        href="/clienti"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#5e5e5b', textDecoration: 'none', fontWeight: 500, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={15} />Tutti i clienti
      </Link>

      <div style={{ background: '#fff', borderRadius: 20, padding: isMobile ? 12 : 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── 1. HEADER ───────────────────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(170deg, #111 3%, #444 97%)', borderRadius: 20, padding: isMobile ? '20px 20px' : '28px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 16 : 24 }}>
              <div style={{ width: isMobile ? 56 : 92, height: isMobile ? 56 : 92, borderRadius: '50%', border: '2.5px solid #e8c587', background: 'linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 18 : 28, fontWeight: 700, color: '#e8c587', flexShrink: 0 }}>
                {initials(cliente.fullName)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 14, minWidth: 0 }}>
                <h1 style={{ margin: 0, fontSize: isMobile ? 24 : 42, fontWeight: 700, color: '#fbfbfb', letterSpacing: isMobile ? '-0.5px' : '-1px', lineHeight: 1.1, wordBreak: 'break-word' }}>
                  {cliente.fullName}
                </h1>
                {badges.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {badges.map((b) =>
                      b.type === 'vip'
                        ? <VipBadge key={b.label} label={b.label} />
                        : <GlassBadge key={b.label} label={b.label} icon={<Clock size={10} />} />
                    )}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {cliente.phone && (
                <a
                  href={`tel:${cliente.phone}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '10px 16px' : '10px 20px', borderRadius: 10, background: 'rgba(253,248,242,0.08)', border: '1px solid rgba(253,248,242,0.2)', backdropFilter: 'blur(5px)', color: '#fdf8f2', fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}
                >
                  <Phone size={14} />Chiama
                </a>
              )}
              <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: isMobile ? '10px 16px' : '10px 20px', borderRadius: 10, background: '#fdf8f2', border: 'none', color: '#0e0e0e', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Zap size={14} />Win-back
              </button>
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: isMobile ? 24 : 40, paddingTop: 4, borderTop: '1px solid rgba(253,248,242,0.1)' }}>
            <div>
              <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#fdf8f2', letterSpacing: '-0.2px' }}>{analytics.totalVisits}</div>
              <div style={{ fontSize: 10, fontWeight: 400, color: 'rgba(253,248,242,0.7)', letterSpacing: '1px', textTransform: 'uppercase' }}>Visite</div>
            </div>
            {analytics.avgDaysBetweenVisits !== null && (
              <div>
                <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#fdf8f2', letterSpacing: '-0.2px' }}>
                  {analytics.avgDaysBetweenVisits} <span style={{ fontWeight: 400, fontSize: 14 }}>gg</span>
                </div>
                <div style={{ fontSize: 10, fontWeight: 400, color: 'rgba(253,248,242,0.7)', letterSpacing: '1px', textTransform: 'uppercase' }}>Frequenza</div>
              </div>
            )}
            <div>
              <div style={{ fontSize: isMobile ? 16 : 18, fontWeight: 600, color: '#fdf8f2', letterSpacing: '-0.2px' }}>€ {analytics.avgSpend}</div>
              <div style={{ fontSize: 10, fontWeight: 400, color: 'rgba(253,248,242,0.7)', letterSpacing: '1px', textTransform: 'uppercase' }}>Scontrino</div>
            </div>
          </div>
        </div>

        {/* ── 2. CHURN ALERT BAR (conditional) ────────────────────────────────── */}
        {analytics.churnStatus !== 'green' && analytics.churnStatus !== 'unknown' && (
          <div style={{ background: churnBarBg, borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} color="#fbbf24" />
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: '#fbfbfb', lineHeight: 1.6 }}>
                <strong>{firstName} è in ritardo di {analytics.churnDelayDays} giorni sulla sua frequenza abituale.</strong>
                <br />
                {analytics.lastVisitDate
                  ? `L'ultima visita risale al ${formatShortDate(analytics.lastVisitDate)}. A questo punto potrebbe stare cercando un altro salone.`
                  : 'Non risultano visite completate.'}
              </p>
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 10, background: '#0e0e0e', border: '1px solid #0e0e0e', color: '#fdf8f2', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <MessageCircle size={14} />Invia messaggio
            </button>
          </div>
        )}

        {/* ── 3. KPI ROW ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {/* Spesa totale — dark */}
          <div style={{ flex: isMobile ? '1 1 calc(50% - 7px)' : '1 1 220px', minWidth: isMobile ? 'auto' : 200, height: 160, background: 'linear-gradient(180deg, #1c1c1c 0%, #0e0e0e 100%)', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(253,248,242,0.6)', letterSpacing: '1.1px', textTransform: 'uppercase' }}>Spesa totale</span>
            <span style={{ fontSize: isMobile ? 32 : 48, fontWeight: 500, color: '#fdf8f2', letterSpacing: '-2px', lineHeight: 1 }}>{formatEuro(analytics.totalSpent)}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(200,90,71,0.25)', border: '1px solid rgba(253,248,242,0.1)', borderRadius: 999, padding: '4px 10px', alignSelf: 'flex-start' }}>
              <TrendingDown size={11} color="#fdf8f2" />
              <span style={{ fontSize: 11, fontWeight: 600, color: '#fdf8f2' }}>
                {analytics.avgSpend > 0 ? `${formatEuro(analytics.avgSpend)} media` : 'Nessuna spesa'}
              </span>
            </div>
          </div>

          {/* Appuntamenti */}
          <div style={{ flex: isMobile ? '1 1 calc(50% - 7px)' : '0 0 280px', height: 160, background: '#f4f4f4', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            <Calendar size={14} color="#9a968b" style={{ position: 'absolute', top: 16, right: 16 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#222', letterSpacing: '1.1px', textTransform: 'uppercase' }}>Appuntamenti</span>
            <span style={{ fontSize: isMobile ? 32 : 48, fontWeight: 500, color: '#222', letterSpacing: '-2px', lineHeight: 1 }}>{appuntamenti.length}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ padding: '3px 10px', borderRadius: 999, background: '#47c847', fontSize: 11, color: '#fdf8f2', fontWeight: 400 }}>{analytics.completedVisits} ok</span>
              <span style={{ padding: '3px 10px', borderRadius: 999, background: '#c85a47', fontSize: 11, color: '#fdf8f2', fontWeight: 400 }}>{analytics.cancelledVisits} ann.</span>
            </div>
          </div>

          {/* Scontrino medio */}
          <div style={{ flex: isMobile ? '1 1 calc(50% - 7px)' : '0 0 280px', height: 160, background: '#f4f4f4', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            <ShoppingBag size={14} color="#9a968b" style={{ position: 'absolute', top: 16, right: 16 }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#222', letterSpacing: '1.1px', textTransform: 'uppercase' }}>Scontrino medio</span>
            <span style={{ fontSize: isMobile ? 32 : 48, fontWeight: 500, color: '#222', letterSpacing: '-2px', lineHeight: 1 }}>{analytics.avgSpend} €</span>
            <span style={{ fontSize: 12.5, color: '#5e5e5b' }}>Ultimo: € {analytics.lastApptTotal}</span>
          </div>

          {/* Stato Churn (Pulse) */}
          <div style={{ flex: isMobile ? '1 1 calc(50% - 7px)' : '0 0 280px', height: 160, background: '#f4f4f4', borderRadius: 20, padding: 16, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                analytics.churnStatus === 'green'  ? '/img/Churn_green.png'  :
                analytics.churnStatus === 'yellow' ? '/img/Churn_yellow.png' :
                analytics.churnStatus === 'red'    ? '/img/Churn_red.png'    :
                                                     '/img/Churn_black.png'
              }
              alt=""
              width={20}
              height={20}
              style={{ position: 'absolute', top: 16, right: 16 }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: '#222', letterSpacing: '1.1px', textTransform: 'uppercase' }}>Stato cliente</span>
            <div>
              <span style={{ fontSize: isMobile ? 24 : 32, fontWeight: 700, color: '#222', letterSpacing: '-1px', lineHeight: 1 }}>
                {
                  analytics.churnStatus === 'green'  ? 'Attivo'     :
                  analytics.churnStatus === 'yellow' ? 'In ritardo' :
                  analytics.churnStatus === 'red'    ? 'A rischio'  :
                                                       'Nuovo'
                }
              </span>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9a968b' }}>
                {analytics.avgDaysBetweenVisits != null
                  ? `Frequenza ogni ${Math.round(analytics.avgDaysBetweenVisits)}gg`
                  : 'Dati insufficienti'}
              </p>
            </div>
            {analytics.avgDaysBetweenVisits != null && analytics.daysSinceLastVisit != null ? (
              (() => {
                const ratio = Math.min(1.5, analytics.daysSinceLastVisit / analytics.avgDaysBetweenVisits)
                const pct   = Math.min(100, (ratio / 1.5) * 100)
                const barColor =
                  analytics.churnStatus === 'green'  ? '#10B981' :
                  analytics.churnStatus === 'yellow' ? '#F59E0B' :
                  analytics.churnStatus === 'red'    ? '#EF4444' :
                                                       '#9CA3AF'
                return (
                  <div style={{ height: 6, background: '#e5e2d9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 300ms ease' }} />
                  </div>
                )
              })()
            ) : (
              <div style={{ height: 6, background: '#e5e2d9', borderRadius: 4 }} />
            )}
          </div>
        </div>

        {/* ── 4. TAB BAR ──────────────────────────────────────────────────────── */}
        <div style={{ background: '#f4f4f4', borderRadius: 10, padding: 5, display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
          <TabBtn label="Panoramica" active={activeTab === 'panoramica'} onClick={() => setActiveTab('panoramica')} />
          <TabBtn label="Appuntamenti" count={appuntamenti.length} active={activeTab === 'appuntamenti'} onClick={() => setActiveTab('appuntamenti')} />
          <TabBtn label="Scheda tecnica" active={activeTab === 'scheda'} onClick={() => setActiveTab('scheda')} />
          <TabBtn label="Vendite" count={vendite.length} active={activeTab === 'vendite'} onClick={() => setActiveTab('vendite')} />
          <TabBtn label="Loyalty" active={activeTab === 'loyalty'} onClick={() => setActiveTab('loyalty')} />
          <TabBtn label="Note" count={note.length} active={activeTab === 'note'} onClick={() => setActiveTab('note')} />
          <TabBtn label="Recensioni" active={activeTab === 'recensioni'} onClick={() => setActiveTab('recensioni')} />
        </div>

        {/* ── PANORAMICA ──────────────────────────────────────────────────────── */}
        {activeTab === 'panoramica' && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 420px', gap: 16, alignItems: 'start' }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Preferenze abituali */}
              <div style={{ background: '#f4f4f4', borderRadius: 20, padding: '22px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  <Heart size={13} color="#222" />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#222', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Preferenze abituali</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {preferenze.servizioPreferito && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #e5e2d9' }}>
                      <span style={{ fontSize: 13.5, color: '#222' }}>Servizio preferito</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#0e0e0e' }}>{preferenze.servizioPreferito}</div>
                        {preferenze.servizioCount && <div style={{ fontSize: 12, color: '#5e5e5b', marginTop: 2 }}>{preferenze.servizioCount}</div>}
                      </div>
                    </div>
                  )}
                  {preferenze.orarioPreferito && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: preferenze.prodottoPrincipale ? '1px solid #e5e2d9' : 'none' }}>
                      <span style={{ fontSize: 13.5, color: '#222' }}>Orario preferito</span>
                      <div style={{ fontSize: 14, fontWeight: 500, color: '#0e0e0e' }}>{preferenze.orarioPreferito}</div>
                    </div>
                  )}
                  {preferenze.prodottoPrincipale && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid #e5e2d9' }}>
                      <span style={{ fontSize: 13.5, color: '#222' }}>Prodotti acquistati</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#0e0e0e' }}>{preferenze.prodottoPrincipale}</div>
                        {preferenze.prodottoCount && <div style={{ fontSize: 12, color: '#5e5e5b', marginTop: 2 }}>{preferenze.prodottoCount}</div>}
                      </div>
                    </div>
                  )}
                  {!preferenze.servizioPreferito && !preferenze.orarioPreferito && !preferenze.prodottoPrincipale && (
                    <div style={{ padding: '16px 0', color: '#9a968b', fontSize: 13.5, borderBottom: '1px solid #e5e2d9' }}>
                      Dati insufficienti per calcolare le preferenze.
                    </div>
                  )}
                  {/* Canale contatto */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16 }}>
                    <span style={{ fontSize: 13.5, color: '#222' }}>Canale contatto</span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {(['whatsapp', 'email'] as const).map((ch) => (
                        <span key={ch} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 10, background: cliente.preferredChannel === ch ? '#0e0e0e' : '#fbfbfb', fontSize: 11.5, fontWeight: 500, color: cliente.preferredChannel === ch ? '#fff' : '#222' }}>
                          {ch === 'whatsapp' ? <MessageCircle size={11} /> : <Mail size={11} />}
                          {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Note private — preview */}
              <div style={{ background: '#f4f4f4', borderRadius: 20, padding: '22px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Lock size={13} color="#9a968b" />
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9a968b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Note private</span>
                  </div>
                  <button
                    onClick={() => setActiveTab('note')}
                    style={{ fontSize: 12, color: '#5e5e5b', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px', borderRadius: 8, textDecoration: 'underline' }}
                  >
                    Vedi tutte ({note.length})
                  </button>
                </div>
                {note.length === 0 ? (
                  <div style={{ color: '#9a968b', fontSize: 13.5, textAlign: 'center', padding: '16px 0' }}>
                    Nessuna nota.{' '}
                    <button
                      onClick={() => setActiveTab('note')}
                      style={{ color: '#222', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, textDecoration: 'underline' }}
                    >
                      Aggiungi la prima.
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {note.slice(0, 2).map((n) => (
                      <div key={n.id} style={{ background: 'linear-gradient(180deg, #f7f5ef 0%, #edeae2 100%)', border: '1px solid #e5e2d9', borderRadius: 14, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#5e5e5b' }}>{n.staffName}</span>
                          <span style={{ fontSize: 11, color: '#9a968b' }}>{formatShortDate(n.createdAt)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: 14, color: '#1c1c1c', lineHeight: 1.5 }}>{n.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Loyalty dark card */}
              <div style={{ background: 'linear-gradient(180deg, #1c1c1c 0%, #0e0e0e 100%)', border: '1px solid #0e0e0e', borderRadius: 20, padding: 18, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -100, right: -50, width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,213,181,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  <Star size={16} color="rgba(253,248,242,0.6)" />
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(253,248,242,0.6)', letterSpacing: '1.1px', textTransform: 'uppercase' }}>Loyalty</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <span style={{ fontSize: 48, fontWeight: 500, color: '#fdf8f2', letterSpacing: '-2px', lineHeight: 1 }}>{loyalty.totalPoints.toLocaleString('it-IT')}</span>
                    <span style={{ fontSize: 26, fontWeight: 400, color: 'rgba(253,248,242,0.7)', marginLeft: 4 }}>pt</span>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase', ...tierBadgeStyle(loyalty.tier) }}>
                    <Star size={11} />{loyalty.tierLabel}
                  </span>
                </div>
                {loyalty.nextTierLabel && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: 'rgba(253,248,242,0.6)' }}>Verso {loyalty.nextTierLabel}</span>
                      <span style={{ color: '#fdf8f2', fontWeight: 600 }}>{loyalty.progress}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(253,248,242,0.12)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${loyalty.progress}%`, height: '100%', background: 'linear-gradient(133deg, #f4d5b5 0%, #e8b6a1 25%, #d89baa 50%, #c39bb8 75%, #a8a0c4 100%)', borderRadius: 4, boxShadow: '0 0 12px rgba(244,213,181,0.4)' }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.6)' }}>Ancora {loyalty.pointsToNextTier} punti per {loyalty.nextTierLabel}</span>
                  </div>
                )}
                {loyalty.rewards.length > 0 && (
                  <div style={{ background: 'rgba(253,248,242,0.06)', border: '1px solid rgba(253,248,242,0.12)', backdropFilter: 'blur(5px)', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #f4d5b5 0%, #e8b6a1 25%, #d89baa 50%, #c39bb8 75%, #a8a0c4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Gift size={18} color="#fff" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fdf8f2', marginBottom: 2 }}>{loyalty.rewards[0].name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(253,248,242,0.6)' }}>{loyalty.rewards[0].pointsCost} punti</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info card */}
              <div style={{ background: '#f4f4f4', borderRadius: 20, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={16} color="#222" />
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#222', letterSpacing: '1.1px', textTransform: 'uppercase' }}>Info</span>
                  </div>
                  <button style={{ width: 28, height: 28, borderRadius: 8, border: '1px solid #e5e2d9', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Pencil size={12} color="#5e5e5b" />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {cliente.phone && <InfoRow icon={<Phone size={14} />} label="Telefono" value={cliente.phone} />}
                  {cliente.email && <InfoRow icon={<Mail size={14} />} label="Email" value={cliente.email} />}
                  {cliente.dateOfBirth && <InfoRow icon={<Cake size={14} />} label="Compleanno" value={formatDate(cliente.dateOfBirth)} />}
                  <InfoRow icon={<UserCheck size={14} />} label="Cliente dal" value={formatShortDate(cliente.clienteSince)} />
                  <InfoRow
                    icon={<FileText size={14} />}
                    label="GDPR"
                    value={cliente.marketingConsent ? 'Consensi attivi' : 'Consensi non attivi'}
                    valueColor={cliente.marketingConsent ? '#4e7a3a' : '#9a968b'}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── APPUNTAMENTI ────────────────────────────────────────────────────── */}
        {activeTab === 'appuntamenti' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
            {isMobile ? (
              /* Mobile: card list */
              appuntamenti.length === 0 ? (
                <EmptyState icon={<Calendar size={40} />} title="Nessun appuntamento" sub="Non ci sono ancora appuntamenti per questo cliente." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {appuntamenti.map((a, i) => {
                    const sc = STATUS_CONFIG[a.status] ?? { bg: '#e5e2d9', color: '#5e5e5b', label: a.status }
                    return (
                      <div key={a.id} style={{ padding: '14px 16px', borderTop: i === 0 ? 'none' : '1px solid #f0f0f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{formatDateTime(a.startTime)}</span>
                          <span style={{ padding: '3px 10px', borderRadius: 999, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 500 }}>{sc.label}</span>
                        </div>
                        <div style={{ fontSize: 13, color: '#555', marginBottom: 4 }}>{a.services.length > 0 ? a.services.join(', ') : '—'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12, color: '#9a968b' }}>{a.staffName}</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{formatEuro(a.total)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            ) : (
              /* Desktop: grid table */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.5fr 1fr 0.7fr 0.8fr', gap: 12, padding: '12px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9a968b', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                  <div>Data</div><div>Servizi</div><div>Staff</div><div>Totale</div><div>Stato</div>
                </div>
                {appuntamenti.length === 0 ? (
                  <EmptyState icon={<Calendar size={40} />} title="Nessun appuntamento" sub="Non ci sono ancora appuntamenti per questo cliente." />
                ) : (
                  appuntamenti.map((a, i) => {
                    const sc = STATUS_CONFIG[a.status] ?? { bg: '#e5e2d9', color: '#5e5e5b', label: a.status }
                    return (
                      <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.5fr 1fr 0.7fr 0.8fr', gap: 12, alignItems: 'center', padding: '14px 20px', borderTop: i === 0 ? 'none' : '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: 13, color: '#222' }}>{formatDateTime(a.startTime)}</div>
                        <div style={{ fontSize: 13, color: '#222' }}>{a.services.length > 0 ? a.services.join(', ') : '—'}</div>
                        <div style={{ fontSize: 13, color: '#5e5e5b' }}>{a.staffName}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{formatEuro(a.total)}</div>
                        <div>
                          <span style={{ padding: '3px 10px', borderRadius: 999, background: sc.bg, color: sc.color, fontSize: 11, fontWeight: 500 }}>{sc.label}</span>
                        </div>
                      </div>
                    )
                  })
                )}
              </>
            )}
          </div>
        )}

        {/* ── SCHEDA TECNICA ──────────────────────────────────────────────────── */}
        {activeTab === 'scheda' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#f4f4f4', borderRadius: 20, padding: '22px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <UserCheck size={13} color="#222" />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#222', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Dati personali</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {cliente.phone && <InfoRow icon={<Phone size={14} />} label="Telefono" value={cliente.phone} />}
                {cliente.email && <InfoRow icon={<Mail size={14} />} label="Email" value={cliente.email} />}
                {cliente.dateOfBirth && <InfoRow icon={<Cake size={14} />} label="Data di nascita" value={formatDate(cliente.dateOfBirth)} />}
                <InfoRow icon={<UserCheck size={14} />} label="Cliente dal" value={formatShortDate(cliente.clienteSince)} />
                <InfoRow
                  icon={<FileText size={14} />}
                  label="Marketing"
                  value={cliente.marketingConsent ? 'Consenso attivo' : 'Non consenziente'}
                  valueColor={cliente.marketingConsent ? '#4e7a3a' : '#9a968b'}
                />
                {cliente.tags.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13.5, color: '#5e5e5b' }}>Tag</span>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {cliente.tags.map((t) => (
                        <span key={t} style={{ padding: '2px 10px', borderRadius: 999, background: '#e5e2d9', fontSize: 12, color: '#5e5e5b' }}>{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: '#f4f4f4', borderRadius: 20, padding: '22px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Lock size={13} color="#9a968b" />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#9a968b', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Note tecniche e private</span>
              </div>
              {note.length === 0 ? (
                <EmptyState icon={<FileText size={32} />} title="Nessuna nota" sub="Aggiungi note dalla scheda Note." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {note.map((n) => (
                    <div key={n.id} style={{ background: 'linear-gradient(180deg, #f7f5ef 0%, #edeae2 100%)', border: '1px solid #e5e2d9', borderRadius: 14, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#5e5e5b' }}>{n.staffName}</span>
                        <span style={{ fontSize: 11, color: '#9a968b' }}>{formatDateTime(n.createdAt)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 14, color: '#1c1c1c', lineHeight: 1.6, fontFamily: 'Georgia, serif' }}>{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── VENDITE ─────────────────────────────────────────────────────────── */}
        {activeTab === 'vendite' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
            {isMobile ? (
              /* Mobile: card list */
              vendite.length === 0 ? (
                <EmptyState icon={<ShoppingBag size={40} />} title="Nessun prodotto acquistato" sub="Questo cliente non ha ancora acquistato prodotti." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {vendite.map((v, i) => (
                    <div key={v.productId} style={{ padding: '14px 16px', borderTop: i === 0 ? 'none' : '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package size={14} color="#9a968b" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#222', flex: 1, minWidth: 0 }}>{v.productName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 42 }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span style={{ fontSize: 12, color: '#9a968b' }}>{v.brand ?? '—'}</span>
                          <span style={{ fontSize: 12, color: '#5e5e5b' }}>Q.tà {v.totalQuantity}</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{formatEuro(v.totalSpent)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Desktop: grid table */
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 0.8fr 1fr', gap: 12, padding: '12px 20px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9a968b', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
                  <div>Prodotto</div><div>Brand</div><div>Q.tà</div><div>Spesa</div><div>Ultima data</div>
                </div>
                {vendite.length === 0 ? (
                  <EmptyState icon={<ShoppingBag size={40} />} title="Nessun prodotto acquistato" sub="Questo cliente non ha ancora acquistato prodotti." />
                ) : (
                  vendite.map((v, i) => (
                    <div key={v.productId} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 0.6fr 0.8fr 1fr', gap: 12, alignItems: 'center', padding: '14px 20px', borderTop: i === 0 ? 'none' : '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: '#f4f4f4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Package size={16} color="#9a968b" />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#222' }}>{v.productName}</span>
                      </div>
                      <div style={{ fontSize: 13, color: '#5e5e5b' }}>{v.brand ?? '—'}</div>
                      <div style={{ fontSize: 13, color: '#222' }}>{v.totalQuantity}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{formatEuro(v.totalSpent)}</div>
                      <div style={{ fontSize: 13, color: '#5e5e5b' }}>{v.lastDate ? formatShortDate(v.lastDate) : '—'}</div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        )}

        {/* ── LOYALTY ─────────────────────────────────────────────────────────── */}
        {activeTab === 'loyalty' && (
          <>
          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <button
              onClick={() => setAddPtsOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, border: 'none', background: '#0e0e0e', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              <Plus size={14} /> Aggiungi punti
            </button>
            {loyalty.rewards.length > 0 && (
              <button
                onClick={() => setRedeemOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 12, border: '1.5px solid #e5e2d9', background: '#fff', color: '#0e0e0e', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                <Gift size={14} /> Riscatta reward
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16, alignItems: 'start' }}>
            {/* Left: summary + transactions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: 'linear-gradient(180deg, #1c1c1c 0%, #0e0e0e 100%)', borderRadius: 20, padding: 20, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -80, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(244,213,181,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div>
                    <span style={{ fontSize: isMobile ? 32 : 42, fontWeight: 500, color: '#fdf8f2', letterSpacing: '-2px', lineHeight: 1 }}>{loyalty.totalPoints.toLocaleString('it-IT')}</span>
                    <span style={{ fontSize: 22, fontWeight: 400, color: 'rgba(253,248,242,0.7)', marginLeft: 4 }}>pt totali</span>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '0.9px', textTransform: 'uppercase', ...tierBadgeStyle(loyalty.tier) }}>
                    <Star size={11} />{loyalty.tierLabel}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'rgba(253,248,242,0.06)', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: 'rgba(253,248,242,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Disponibili</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#fdf8f2' }}>{loyalty.availablePoints.toLocaleString('it-IT')} pt</div>
                  </div>
                  <div style={{ background: 'rgba(253,248,242,0.06)', borderRadius: 12, padding: '12px 14px' }}>
                    <div style={{ fontSize: 11, color: 'rgba(253,248,242,0.5)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.8px' }}>Streak</div>
                    <div style={{ fontSize: 22, fontWeight: 600, color: '#fdf8f2' }}>{loyalty.currentStreak} <span style={{ fontSize: 14, fontWeight: 400 }}>visite</span></div>
                  </div>
                </div>
                {loyalty.nextTierLabel && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: 'rgba(253,248,242,0.6)' }}>Verso {loyalty.nextTierLabel}</span>
                      <span style={{ color: '#fdf8f2', fontWeight: 600 }}>{loyalty.progress}%</span>
                    </div>
                    <div style={{ height: 8, background: 'rgba(253,248,242,0.12)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ width: `${loyalty.progress}%`, height: '100%', background: 'linear-gradient(133deg, #f4d5b5 0%, #e8b6a1 25%, #d89baa 50%, #c39bb8 75%, #a8a0c4 100%)', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'rgba(253,248,242,0.6)' }}>Ancora {loyalty.pointsToNextTier} punti per raggiungere {loyalty.nextTierLabel}</span>
                  </>
                )}
              </div>

              <div style={{ background: '#f4f4f4', borderRadius: 20, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <FileText size={13} color="#222" />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#222', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Storico movimenti</span>
                </div>
                {loyalty.transactions.length === 0 ? (
                  <EmptyState icon={<FileText size={32} />} title="Nessun movimento" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {loyalty.transactions.map((tx, i) => {
                      const conf = TX_CONFIG[tx.type] ?? { label: tx.type, color: '#9a968b', sign: '' }
                      return (
                        <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < loyalty.transactions.length - 1 ? '1px solid #e5e2d9' : 'none' }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#222' }}>{tx.description ?? conf.label}</div>
                            <div style={{ fontSize: 11, color: '#9a968b' }}>{formatShortDate(tx.createdAt)}</div>
                          </div>
                          <span style={{ fontSize: 14, fontWeight: 700, color: conf.color }}>{conf.sign}{Math.abs(tx.points)} pt</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: rewards + redemptions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#f4f4f4', borderRadius: 20, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <Gift size={13} color="#222" />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#222', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Premi disponibili</span>
                </div>
                {loyalty.rewards.length === 0 ? (
                  <EmptyState icon={<Gift size={32} />} title="Nessun premio configurato" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {loyalty.rewards.map((r) => {
                      const canRedeem = loyalty.availablePoints >= r.pointsCost
                      return (
                        <div key={r.id} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 36, height: 36, borderRadius: 10, background: canRedeem ? 'linear-gradient(135deg, #f4d5b5 0%, #e8b6a1 50%, #d89baa 100%)' : '#e5e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Gift size={16} color={canRedeem ? '#fff' : '#9a968b'} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{r.name}</div>
                              <div style={{ fontSize: 11, color: '#9a968b' }}>{r.pointsCost} punti</div>
                            </div>
                          </div>
                          {canRedeem && (
                            <span style={{ padding: '3px 10px', borderRadius: 999, background: '#47c847', fontSize: 11, color: '#fff', fontWeight: 600 }}>Riscattabile</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ background: '#f4f4f4', borderRadius: 20, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <CheckCircle size={13} color="#222" />
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: '#222', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Riscatti effettuati</span>
                </div>
                {loyalty.redemptions.length === 0 ? (
                  <EmptyState icon={<CheckCircle size={32} />} title="Nessun riscatto" sub="Questo cliente non ha ancora riscattato premi." />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {loyalty.redemptions.map((r) => (
                      <div key={r.id} style={{ background: '#fff', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#222' }}>{r.rewardName}</div>
                          <div style={{ fontSize: 11, color: '#9a968b' }}>{formatShortDate(r.createdAt)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#c85a47' }}>-{r.pointsSpent} pt</div>
                          {r.confirmedAt
                            ? <span style={{ fontSize: 11, color: '#47c847' }}>Confermato</span>
                            : <span style={{ fontSize: 11, color: '#e8b84c' }}>In attesa</span>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Add points modal */}
          {addPtsOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 24px', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1c' }}>Aggiungi punti manualmente</span>
                  <button onClick={() => setAddPtsOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9a968b', fontSize: 20 }}>×</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#222' }}>Punti da aggiungere</span>
                    <input
                      type="number"
                      min={1}
                      value={addPtsValue}
                      onChange={(e) => setAddPtsValue(Number(e.target.value))}
                      className="styll-input"
                      style={{ padding: '12px 16px', fontSize: 15, borderRadius: 12, border: '1px solid #e5e2d9', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#222' }}>Nota (obbligatoria)</span>
                    <input
                      type="text"
                      placeholder="es. Compleanno, promozione speciale..."
                      value={addPtsNote}
                      onChange={(e) => setAddPtsNote(e.target.value)}
                      className="styll-input"
                      style={{ padding: '12px 16px', fontSize: 14, borderRadius: 12, border: '1px solid #e5e2d9', outline: 'none', fontFamily: 'inherit' }}
                    />
                  </label>
                </div>
                <button
                  disabled={addPtsPending || !addPtsNote.trim() || addPtsValue <= 0}
                  onClick={handleAddPoints}
                  style={{ marginTop: 20, width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: addPtsPending || !addPtsNote.trim() ? '#e5e2d9' : '#0e0e0e', color: addPtsPending || !addPtsNote.trim() ? '#9a968b' : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {addPtsPending ? <><Loader2 className="inline h-4 w-4 animate-spin" /> Salvataggio…</> : `Aggiungi ${addPtsValue} punti`}
                </button>
              </div>
            </div>
          )}

          {/* Redeem reward modal */}
          {redeemOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ width: '100%', maxWidth: 480, background: '#fff', borderRadius: '20px 20px 0 0', padding: '28px 24px', boxShadow: '0 -4px 24px rgba(0,0,0,0.12)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: '#1c1c1c' }}>Riscatta un reward</span>
                  <button onClick={() => setRedeemOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9a968b', fontSize: 20 }}>×</button>
                </div>
                <p style={{ fontSize: 12, color: '#9a968b', marginBottom: 16 }}>
                  Punti disponibili: <strong style={{ color: '#1c1c1c' }}>{loyalty.availablePoints.toLocaleString()}</strong>
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 280, overflowY: 'auto' }}>
                  {loyalty.rewards.map((r) => {
                    const canRedeem = loyalty.availablePoints >= r.pointsCost
                    const selected = selectedRewardId === r.id
                    return (
                      <button
                        key={r.id}
                        disabled={!canRedeem}
                        onClick={() => canRedeem && setSelectedRewardId(selected ? null : r.id)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, border: selected ? '2px solid #0e0e0e' : '1.5px solid #e5e2d9', background: selected ? '#f9f9f9' : '#fff', cursor: canRedeem ? 'pointer' : 'not-allowed', opacity: canRedeem ? 1 : 0.5, textAlign: 'left', fontFamily: 'inherit' }}
                      >
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1c1c' }}>{r.name}</div>
                          <div style={{ fontSize: 12, color: '#9a968b' }}>{r.pointsCost.toLocaleString()} punti</div>
                        </div>
                        {canRedeem && <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: '#22c55e22', color: '#16a34a', fontWeight: 600 }}>Disponibile</span>}
                      </button>
                    )
                  })}
                </div>
                <button
                  disabled={!selectedRewardId || redeemPending}
                  onClick={handleConfirmRedeem}
                  style={{ marginTop: 16, width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: !selectedRewardId ? '#e5e2d9' : '#0e0e0e', color: !selectedRewardId ? '#9a968b' : '#fff', fontSize: 14, fontWeight: 700, cursor: selectedRewardId ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {redeemPending ? <><Loader2 className="inline h-4 w-4 animate-spin" /> Conferma…</> : 'Conferma riscatto'}
                </button>
              </div>
            </div>
          )}
          </>
        )}

        {/* ── NOTE ────────────────────────────────────────────────────────────── */}
        {activeTab === 'note' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Add note form */}
            <div style={{ background: '#f4f4f4', borderRadius: 20, padding: '22px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Plus size={13} color="#222" />
                <span style={{ fontSize: 10.5, fontWeight: 700, color: '#222', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Aggiungi nota</span>
              </div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Scrivi una nota privata su questo cliente..."
                style={{ width: '100%', minHeight: 100, padding: '14px 16px', borderRadius: 14, border: '1px solid #e5e2d9', background: '#fff', fontSize: 14, color: '#1c1c1c', lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              />
              {noteError && <div style={{ fontSize: 12, color: '#c85a47', marginTop: 6 }}>{noteError}</div>}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9a968b' }}>
                  <Lock size={12} />Visibile solo allo staff — mai al cliente
                </div>
                <button
                  onClick={handleAddNota}
                  disabled={isPending || !noteText.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 12, border: 'none', background: isPending || !noteText.trim() ? '#e5e2d9' : '#0e0e0e', color: isPending || !noteText.trim() ? '#9a968b' : '#fff', fontSize: 13.5, fontWeight: 600, cursor: isPending || !noteText.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
                >
                  {isPending ? 'Salvataggio...' : 'Salva nota'}
                </button>
              </div>
            </div>

            {/* Notes list */}
            {note.length === 0 ? (
              <div style={{ background: '#f4f4f4', borderRadius: 20, padding: '22px 28px' }}>
                <EmptyState icon={<FileText size={40} />} title="Nessuna nota" sub="Le note private ti aiutano a ricordare le preferenze e le esigenze del cliente." />
              </div>
            ) : (
              note.map((n) => (
                <div key={n.id} style={{ background: '#f4f4f4', borderRadius: 20, padding: '20px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e2d9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#5e5e5b' }}>
                        {initials(n.staffName)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#222' }}>{n.staffName}</div>
                        <div style={{ fontSize: 11, color: '#9a968b' }}>{formatDateTime(n.createdAt)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9a968b' }}>
                      <Lock size={11} />Privata
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: '#1c1c1c', lineHeight: 1.6 }}>{n.text}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── RECENSIONI ──────────────────────────────────────────────────────── */}
        {activeTab === 'recensioni' && (
          <div style={{ background: '#f4f4f4', borderRadius: 20, padding: '22px 28px' }}>
            <EmptyState
              icon={<Star size={40} />}
              title="Nessuna recensione"
              sub="Le recensioni saranno disponibili nella prossima versione della piattaforma."
            />
          </div>
        )}
      </div>
    </div>
  )
}
