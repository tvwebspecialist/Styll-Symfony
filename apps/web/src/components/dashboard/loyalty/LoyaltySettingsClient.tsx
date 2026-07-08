'use client'

import * as React from 'react'
import Image from 'next/image'
import {
  Settings,
  Gift,
  Award,
  Layers,
  ChevronRight,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Check,
  Star,
  Zap,
  Crown,
  Edit3,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import type { LoyaltySettingsData, LoyaltyTemplate, Reward, TierBenefits } from '@/lib/actions/loyalty-settings'
import {
  saveLoyaltyConfig,
  upsertReward,
  deleteReward,
  toggleBadge,
  updateTierConfig,
  seedDefaultRewards,
} from '@/lib/actions/loyalty-settings'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_STYLES: Record<string, { gradient: string; label: string; icon: string }> = {
  bronze:  { gradient: 'linear-gradient(135deg,#cd7f32,#a0522d)', label: 'Bronzo',   icon: '🥉' },
  silver:  { gradient: 'linear-gradient(135deg,#e8e6df,#bdbab0,#8a877e)', label: 'Argento',  icon: '🥈' },
  gold:    { gradient: 'linear-gradient(135deg,#ffd700,#c8a04a)', label: 'Oro',      icon: '🥇' },
  diamond: { gradient: 'linear-gradient(135deg,#a8d8ea,#aa96da,#fcbad3)', label: 'Diamante', icon: '💎' },
}

const CONDITION_LABELS: Record<string, string> = {
  visits_count: 'Visite',
  streak_count: 'Streak consecutive',
  points_total: 'Punti totali',
  months_since_first_visit: 'Mesi da cliente',
  manual: 'Assegnato manualmente',
}

const REWARD_TYPE_LABELS: Record<string, string> = {
  product: 'Prodotto',
  service: 'Servizio',
  discount: 'Sconto',
  custom: 'Personalizzato',
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LoyaltySettingsClient({ data }: { data: LoyaltySettingsData }) {
  const [activeTab, setActiveTab] = React.useState<'config' | 'rewards' | 'badges' | 'tiers'>('config')

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-24">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-[var(--color-fg)]">Programma Fedeltà</h1>
        <p className="mt-1 text-sm text-[var(--color-fg-secondary)]">
          Configura punti, reward, badge e livelli per i tuoi clienti.
        </p>
      </header>

      {/* Tab Bar */}
      <div className="mb-6 flex gap-1 rounded-2xl p-1" style={{ background: 'var(--color-bg-secondary)' }}>
        {([
          { key: 'config',  icon: Settings, label: 'Configurazione' },
          { key: 'rewards', icon: Gift,     label: 'Reward' },
          { key: 'badges',  icon: Award,    label: 'Badge' },
          { key: 'tiers',   icon: Layers,   label: 'Livelli' },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all"
            style={{
              background: activeTab === key ? 'var(--color-bg)' : 'transparent',
              color: activeTab === key ? 'var(--color-fg)' : 'var(--color-fg-secondary)',
              boxShadow: activeTab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'config'  && <ConfigTab data={data} />}
      {activeTab === 'rewards' && <RewardsTab data={data} />}
      {activeTab === 'badges'  && <BadgesTab data={data} />}
      {activeTab === 'tiers'   && <TiersTab data={data} />}
    </div>
  )
}

// ─── Config Tab ───────────────────────────────────────────────────────────────

function ConfigTab({ data }: { data: LoyaltySettingsData }) {
  const cfg = data.config
  const [template, setTemplate] = React.useState<LoyaltyTemplate>(cfg?.template ?? 'classic')
  const [isActive, setIsActive] = React.useState(cfg?.isActive ?? false)
  const [pointsPerVisit, setPointsPerVisit] = React.useState(cfg?.pointsPerVisit ?? 100)
  const [pointsPerEuro, setPointsPerEuro] = React.useState(cfg?.pointsPerEuro ?? 10)
  const [streakDays, setStreakDays] = React.useState(cfg?.streakThresholdDays ?? 45)
  const [saving, setSaving] = React.useState(false)

  async function handleSave() {
    setSaving(true)
    const res = await saveLoyaltyConfig({ template, isActive, pointsPerVisit, pointsPerEuro, streakThresholdDays: streakDays })
    setSaving(false)
    if (res.success) {
      // Seed default rewards if first time
      if (!cfg && data.rewards.length === 0) {
        // We don't have tenantId here; seedDefaultRewards called server-side
      }
      toast.success('Configurazione salvata')
    } else {
      toast.error(res.error ?? 'Errore durante il salvataggio')
    }
  }

  const templates: Array<{ key: LoyaltyTemplate; icon: React.ReactNode; title: string; subtitle: string; who: string }> = [
    {
      key: 'classic',
      icon: <Star className="h-5 w-5" />,
      title: 'Classico',
      subtitle: 'Punti fissi per visita',
      who: 'Semplice, zero configurazione — perfetto per chi inizia',
    },
    {
      key: 'streak_master',
      icon: <Zap className="h-5 w-5" />,
      title: 'Streak Master',
      subtitle: 'Punti per €1 speso + streak',
      who: 'Premia chi spende di più e torna spesso',
    },
    {
      key: 'vip_club',
      icon: <Crown className="h-5 w-5" />,
      title: 'Club VIP',
      subtitle: 'Punti + streak + badge + livelli',
      who: 'Il massimo controllo — vuoi tutto?',
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Enable/Disable toggle */}
      <div
        className="flex items-center justify-between rounded-2xl p-5"
        style={{ background: 'var(--color-bg-secondary)' }}
      >
        <div>
          <p className="font-bold text-[var(--color-fg)]">Programma attivo</p>
          <p className="mt-0.5 text-xs text-[var(--color-fg-secondary)]">
            {isActive ? 'I clienti stanno accumulando punti' : 'Il programma è in pausa'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsActive((v) => !v)}
          className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
          style={{
            background: isActive ? '#22c55e22' : 'var(--color-bg)',
            color: isActive ? '#16a34a' : 'var(--color-fg-secondary)',
            border: `1px solid ${isActive ? '#22c55e44' : 'var(--color-border)'}`,
          }}
        >
          {isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
          {isActive ? 'Attivo' : 'Disattivo'}
        </button>
      </div>

      {/* Template selector */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-fg-muted)]">
          Scegli il template
        </p>
        <div className="grid gap-3">
          {templates.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTemplate(t.key)}
              className="flex items-start gap-4 rounded-2xl p-4 text-left transition-all"
              style={{
                border: template === t.key ? '2px solid var(--color-fg)' : '2px solid var(--color-border)',
                background: template === t.key ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: template === t.key ? 'var(--color-fg)' : 'var(--color-bg-secondary)', color: template === t.key ? 'var(--color-bg)' : 'var(--color-fg-secondary)' }}
              >
                {t.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[var(--color-fg)]">{t.title}</p>
                  {template === t.key && <Check className="h-4 w-4 text-[var(--color-fg)]" />}
                </div>
                <p className="mt-0.5 text-sm font-medium text-[var(--color-fg-secondary)]">{t.subtitle}</p>
                <p className="mt-1 text-xs text-[var(--color-fg-muted)]">{t.who}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="flex flex-col gap-4 rounded-2xl p-5" style={{ background: 'var(--color-bg-secondary)' }}>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-fg-muted)]">
          Parametri
        </p>

        {template === 'classic' && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-fg)]">Punti per visita</span>
            <input
              type="number"
              min={1}
              value={pointsPerVisit}
              onChange={(e) => setPointsPerVisit(Number(e.target.value))}
              className="styll-input w-full px-4 py-3 text-sm"
            />
            <span className="text-xs text-[var(--color-fg-muted)]">
              Ogni visita completata vale {pointsPerVisit} punti fissi
            </span>
          </label>
        )}

        {(template === 'streak_master' || template === 'vip_club') && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[var(--color-fg)]">Punti per €1 speso</span>
              <input
                type="number"
                min={1}
                value={pointsPerEuro}
                onChange={(e) => setPointsPerEuro(Number(e.target.value))}
                className="styll-input w-full px-4 py-3 text-sm"
              />
              <span className="text-xs text-[var(--color-fg-muted)]">
                Taglio €25 = {25 * pointsPerEuro} punti
              </span>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-[var(--color-fg)]">Giorni massimi tra visite per streak</span>
              <input
                type="number"
                min={7}
                max={180}
                value={streakDays}
                onChange={(e) => setStreakDays(Number(e.target.value))}
                className="styll-input w-full px-4 py-3 text-sm"
              />
              <span className="text-xs text-[var(--color-fg-muted)]">
                Se passa più di {streakDays} giorni, la streak si azzera
              </span>
            </label>
          </>
        )}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="styll-btn-primary flex items-center justify-center gap-2 py-3 text-sm"
        style={{ minHeight: 52 }}
      >
        {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvataggio…</> : 'Salva configurazione'}
      </button>
    </div>
  )
}

// ─── Rewards Tab ──────────────────────────────────────────────────────────────

function RewardsTab({ data }: { data: LoyaltySettingsData }) {
  const [editReward, setEditReward] = React.useState<Partial<Reward> | null>(null)
  const [deleting, setDeleting] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Estimated visits to reach this reward (based on 100pt/visit default)
  function estimateVisits(pts: number) {
    const ppv = data.config?.template === 'classic' ? (data.config.pointsPerVisit || 100) : 250
    return Math.ceil(pts / ppv)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editReward) return
    setSaving(true)
    const res = await upsertReward({
      id: editReward.id,
      name: editReward.name ?? '',
      description: editReward.description ?? null,
      pointsCost: editReward.pointsCost ?? 1000,
      rewardType: editReward.rewardType ?? 'custom',
      isActive: editReward.isActive ?? true,
    })
    setSaving(false)
    if (res.success) {
      toast.success(editReward.id ? 'Reward aggiornato' : 'Reward creato')
      setEditReward(null)
    } else {
      toast.error(res.error ?? 'Errore')
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    const res = await deleteReward(id)
    setDeleting(null)
    if (res.success) toast.success('Reward eliminato')
    else toast.error(res.error ?? 'Errore')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-fg-muted)]">
          {data.rewards.length}/6 reward
        </p>
        <button
          type="button"
          onClick={() => setEditReward({ name: '', pointsCost: 2000, rewardType: 'custom', isActive: true })}
          disabled={data.rewards.length >= 6}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
          style={{
            background: data.rewards.length >= 6 ? 'var(--color-bg-secondary)' : 'var(--color-fg)',
            color: data.rewards.length >= 6 ? 'var(--color-fg-muted)' : 'var(--color-bg)',
          }}
        >
          <Plus className="h-3.5 w-3.5" /> Aggiungi
        </button>
      </div>
      {data.rewards.length >= 6 && (
        <p className="text-xs text-[var(--color-fg-muted)]">
          Limite massimo raggiunto. Elimina un reward per aggiungerne uno nuovo.
        </p>
      )}

      {data.rewards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center">
          <Gift className="mx-auto h-8 w-8 text-[var(--color-fg-muted)]" />
          <p className="mt-2 text-sm font-semibold text-[var(--color-fg)]">Nessun reward</p>
          <p className="mt-1 text-xs text-[var(--color-fg-secondary)]">
            Crea i tuoi reward oppure usa i 4 default già pronti.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {data.rewards.map((reward) => (
            <div
              key={reward.id}
              className="flex items-start gap-3 rounded-2xl p-4"
              style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg)' }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[var(--color-fg)]">{reward.name}</p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{ background: reward.isActive ? '#22c55e22' : 'var(--color-bg-secondary)', color: reward.isActive ? '#16a34a' : 'var(--color-fg-muted)' }}
                  >
                    {reward.isActive ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>
                {reward.description && (
                  <p className="mt-0.5 text-xs text-[var(--color-fg-secondary)]">{reward.description}</p>
                )}
                <div className="mt-1.5 flex items-center gap-3 text-xs text-[var(--color-fg-muted)]">
                  <span className="font-bold text-[var(--color-fg)]">{reward.pointsCost.toLocaleString()} pt</span>
                  <span>≈ {estimateVisits(reward.pointsCost)} visite</span>
                  <span>{REWARD_TYPE_LABELS[reward.rewardType] ?? reward.rewardType}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditReward({ ...reward })}
                  className="rounded-lg p-2 transition-colors styll-hover-color-bg-secondary"
                  style={{ color: 'var(--color-fg-secondary)' }}
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(reward.id)}
                  disabled={deleting === reward.id}
                  className="rounded-lg p-2 transition-colors hover:bg-red-50"
                  style={{ color: '#ef4444' }}
                >
                  {deleting === reward.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reward edit modal */}
      {editReward !== null && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 sm:items-center sm:justify-center">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-t-3xl styll-bg-color-bg p-6 sm:rounded-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-bold text-[var(--color-fg)]">
                {editReward.id ? 'Modifica reward' : 'Nuovo reward'}
              </p>
              <button type="button" onClick={() => setEditReward(null)}>
                <X className="h-5 w-5 text-[var(--color-fg-secondary)]" />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-fg)]">Nome *</span>
                <input
                  className="styll-input w-full px-4 py-3 text-sm"
                  required
                  value={editReward.name ?? ''}
                  onChange={(e) => setEditReward((p) => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-fg)]">Descrizione</span>
                <input
                  className="styll-input w-full px-4 py-3 text-sm"
                  value={editReward.description ?? ''}
                  onChange={(e) => setEditReward((p) => ({ ...p, description: e.target.value || null }))}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-fg)]">Costo (punti) *</span>
                <input
                  type="number"
                  min={1}
                  required
                  className="styll-input w-full px-4 py-3 text-sm"
                  value={editReward.pointsCost ?? 2000}
                  onChange={(e) => setEditReward((p) => ({ ...p, pointsCost: Number(e.target.value) }))}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-[var(--color-fg)]">Tipo</span>
                <select
                  className="styll-input w-full px-4 py-3 text-sm"
                  value={editReward.rewardType ?? 'custom'}
                  onChange={(e) => setEditReward((p) => ({ ...p, rewardType: e.target.value as Reward['rewardType'] }))}
                >
                  <option value="product">Prodotto</option>
                  <option value="service">Servizio</option>
                  <option value="discount">Sconto</option>
                  <option value="custom">Personalizzato</option>
                </select>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={editReward.isActive ?? true}
                  onChange={(e) => setEditReward((p) => ({ ...p, isActive: e.target.checked }))}
                  className="h-4 w-4"
                />
                <span className="text-sm font-semibold text-[var(--color-fg)]">Reward attivo</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="styll-btn-primary mt-6 flex w-full items-center justify-center gap-2 py-3 text-sm"
              style={{ minHeight: 48 }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editReward.id ? 'Aggiorna' : 'Crea reward'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ─── Badges Tab ───────────────────────────────────────────────────────────────

function BadgesTab({ data }: { data: LoyaltySettingsData }) {
  const [pending, setPending] = React.useState<Record<string, boolean>>({})

  const isVip = data.config?.template === 'vip_club'

  async function handleToggle(badgeId: string, newActive: boolean) {
    setPending((p) => ({ ...p, [badgeId]: true }))
    const res = await toggleBadge(badgeId, newActive)
    setPending((p) => ({ ...p, [badgeId]: false }))
    if (!res.success) toast.error(res.error ?? 'Errore')
  }

  if (!isVip) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center">
        <Award className="mx-auto h-8 w-8 text-[var(--color-fg-muted)]" />
        <p className="mt-2 text-sm font-semibold text-[var(--color-fg)]">Badge disponibili nel Club VIP</p>
        <p className="mt-1 text-xs text-[var(--color-fg-secondary)]">
          Passa al template Club VIP nella sezione Configurazione per attivare i badge.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {data.badges.map((badge) => {
        const isPending = pending[badge.id]
        const badgeEmoji: Record<string, string> = {
          visits_count: badge.conditionValue === 1 ? '🌱' : badge.conditionValue <= 5 ? '✂️' : '💈',
          streak_count: '🔥',
          points_total: badge.conditionValue >= 10000 ? '💎' : '👑',
          months_since_first_visit: '🏆',
          manual: '⭐',
        }
        const emoji = badgeEmoji[badge.conditionType] ?? '⭐'

        return (
          <div
            key={badge.id}
            className="flex items-start gap-3 rounded-2xl p-4"
            style={{
              border: '1px solid var(--color-border)',
              background: badge.isActive ? 'var(--color-bg)' : 'var(--color-bg-secondary)',
              opacity: badge.isActive ? 1 : 0.6,
            }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xl"
              style={{ background: 'var(--color-bg-secondary)' }}
            >
              {badge.iconUrl ? (
                <Image src={badge.iconUrl} alt={badge.name} width={40} height={40} unoptimized />
              ) : (
                emoji
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--color-fg)]">{badge.name}</p>
              <p className="mt-0.5 text-xs text-[var(--color-fg-secondary)]">
                {CONDITION_LABELS[badge.conditionType]}: {badge.conditionValue}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleToggle(badge.id, !badge.isActive)}
              disabled={isPending}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors"
              style={{
                background: badge.isActive ? '#22c55e22' : 'var(--color-border)',
                color: badge.isActive ? '#16a34a' : 'var(--color-fg-muted)',
              }}
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : badge.isActive ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
              {badge.isActive ? 'On' : 'Off'}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tiers Tab ────────────────────────────────────────────────────────────────

function TiersTab({ data }: { data: LoyaltySettingsData }) {
  const isVip = data.config?.template === 'vip_club'

  if (!isVip) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center">
        <Layers className="mx-auto h-8 w-8 text-[var(--color-fg-muted)]" />
        <p className="mt-2 text-sm font-semibold text-[var(--color-fg)]">Livelli disponibili nel Club VIP</p>
        <p className="mt-1 text-xs text-[var(--color-fg-secondary)]">
          Passa al template Club VIP nella sezione Configurazione per configurare i livelli.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {data.tiers.map((tier) => (
        <TierCard key={tier.id} tier={tier} />
      ))}
    </div>
  )
}

function TierCard({ tier }: { tier: LoyaltySettingsData['tiers'][0] }) {
  const style = TIER_STYLES[tier.tierName] ?? TIER_STYLES.bronze
  const [minPoints, setMinPoints] = React.useState(tier.minPoints)
  const [benefits, setBenefits] = React.useState<TierBenefits>({ ...tier.benefits })
  const [saving, setSaving] = React.useState(false)
  const isBronze = tier.tierName === 'bronze'

  async function handleSave() {
    setSaving(true)
    const res = await updateTierConfig({ id: tier.id, minPoints, benefits })
    setSaving(false)
    if (res.success) toast.success(`${style.label} aggiornato`)
    else toast.error(res.error ?? 'Errore')
  }

  function toggleBenefit(key: keyof TierBenefits) {
    setBenefits((b) => ({ ...b, [key]: !b[key] }))
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--color-border)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4" style={{ background: style.gradient }}>
        <span className="text-2xl">{style.icon}</span>
        <div>
          <p className="font-black text-white drop-shadow">{style.label}</p>
          {!isBronze && (
            <p className="text-xs text-white/70">da {minPoints.toLocaleString()} punti</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4">
        {!isBronze && (
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-fg)]">Soglia punti</span>
            <input
              type="number"
              min={0}
              value={minPoints}
              onChange={(e) => setMinPoints(Number(e.target.value))}
              className="styll-input w-full px-4 py-2.5 text-sm"
            />
          </label>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold text-[var(--color-fg)]">Benefici</p>
          <div className="flex flex-col gap-2">
            {([
              { key: 'priority_booking' as const, label: 'Prenotazione prioritaria' },
              { key: 'bonus_points_pct' as const, label: 'Punti bonus', isNumeric: true },
              { key: 'permanent_discount_pct' as const, label: 'Sconto permanente', isNumeric: true },
              { key: 'upgrade_service' as const, label: 'Upgrade servizio gratis' },
              { key: 'birthday_reward' as const, label: 'Premio compleanno' },
            ]).map(({ key, label, isNumeric }) => (
              <div key={key} className="flex items-center gap-3">
                {isNumeric ? (
                  <>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={(benefits[key] as number) ?? 0}
                      onChange={(e) => setBenefits((b) => ({ ...b, [key]: Number(e.target.value) }))}
                      className="styll-input w-20 px-3 py-1.5 text-sm"
                    />
                    <span className="text-sm text-[var(--color-fg)]">{label} %</span>
                  </>
                ) : (
                  <>
                    <input
                      type="checkbox"
                      checked={!!(benefits[key])}
                      onChange={() => toggleBenefit(key)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-[var(--color-fg)]">{label}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors"
          style={{ background: 'var(--color-fg)', color: 'var(--color-bg)', minHeight: 44 }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salva {style.label}
        </button>
      </div>
    </div>
  )
}
