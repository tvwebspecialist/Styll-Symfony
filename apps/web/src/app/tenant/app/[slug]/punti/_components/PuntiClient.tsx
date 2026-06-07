'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Flame, Gift, Star, Trophy, Zap, Award, RotateCcw } from 'lucide-react'
import { requestRewardRedemption } from '@/lib/actions/loyalty'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reward {
  id: string
  name: string
  description: string | null
  pointsCost: number
  rewardType: string
}

interface Transaction {
  id: string
  type: string
  points: number
  description: string | null
  createdAt: string
}

interface Badge {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  conditionType: string
  conditionValue: number
  unlocked: boolean
  unlockedAt: string | null
}

interface Props {
  brandColor: string
  slug: string
  clientId: string
  tenantId: string
  availablePoints: number
  totalPoints: number
  currentStreak: number
  currentTierName: string
  currentTierLabel: string
  currentTierGradient: string
  nextTierLabel: string | null
  tierProgress: number
  pointsToNextTier: number
  streakThreshold: number
  daysUntilStreakExpires: number | null
  rewards: Reward[]
  transactions: Transaction[]
  badges: Badge[]
  hasStreak: boolean
  isVip: boolean
  loyaltyActive: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
}

function streakMotivation(streak: number): string {
  if (streak >= 10) return 'Leggenda del salone 👑'
  if (streak >= 5) return 'Clientela solida! 💪'
  if (streak >= 2) return 'Stai costruendo qualcosa 🔥'
  return 'Prima volta? Ottimo inizio!'
}

const BADGE_EMOJI: Record<string, string> = {
  visits_count: '✂️',
  streak_count: '🔥',
  points_total: '⭐',
  months_since_first_visit: '🏆',
  manual: '👑',
}

const TX_COLOR: Record<string, string> = {
  earn: '#22c55e',
  bonus: '#3b82f6',
  redeem: '#ef4444',
  import: '#8b5cf6',
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PuntiClient({
  brandColor,
  slug,
  clientId,
  tenantId,
  availablePoints,
  totalPoints,
  currentStreak,
  currentTierName,
  currentTierLabel,
  currentTierGradient,
  nextTierLabel,
  tierProgress,
  pointsToNextTier,
  streakThreshold,
  daysUntilStreakExpires,
  rewards,
  transactions,
  badges,
  hasStreak,
  isVip,
  loyaltyActive,
}: Props) {
  const router = useRouter()
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [redeemReward, setRedeemReward] = React.useState<Reward | null>(null)
  const [redeemPending, startRedeemTransition] = React.useTransition()
  const [redeemDone, setRedeemDone] = React.useState(false)
  const [redeemError, setRedeemError] = React.useState<string | null>(null)

  const pulseColor = brandColor + '30'

  function handleRedeemRequest(reward: Reward) {
    setRedeemReward(reward)
    setRedeemDone(false)
    setRedeemError(null)
  }

  function handleConfirmRequest() {
    if (!redeemReward) return
    startRedeemTransition(async () => {
      const res = await requestRewardRedemption({
        clientId,
        tenantId,
        rewardId: redeemReward.id,
      })
      if (res.success) {
        setRedeemDone(true)
      } else {
        setRedeemError(res.error ?? 'Errore sconosciuto')
      }
    })
  }

  const streakAtRisk = (daysUntilStreakExpires ?? 99) <= 7

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-4 pb-24">

      {/* ── HERO: Points + Tier ─────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden rounded-[28px] p-6 text-white"
        style={{ background: 'linear-gradient(160deg, #111 0%, #1a1a1a 100%)' }}
      >
        {/* Glow */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full"
          style={{ background: `radial-gradient(circle, ${brandColor}30 0%, transparent 70%)` }}
        />

        <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-50">
            Punti disponibili
          </p>
          <p
            className="mt-2 text-6xl font-black tracking-tight leading-none"
            style={{ color: brandColor }}
          >
            {availablePoints.toLocaleString('it-IT')}
          </p>
          <p className="mt-1 text-sm opacity-50">{totalPoints.toLocaleString('it-IT')} punti totali</p>

          {/* Tier badge */}
          <div
            className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold"
            style={{ background: currentTierGradient || '#333', color: currentTierName === 'silver' ? '#0e0e0e' : '#fff' }}
          >
            <Star className="h-3.5 w-3.5" />
            {currentTierLabel}
            {currentTierName === 'diamond' && (
              <span className="animate-pulse">✨</span>
            )}
          </div>

          {/* Progress to next tier */}
          {nextTierLabel && (
            <div className="mt-5">
              <div className="flex justify-between text-xs opacity-60 mb-1.5">
                <span>Verso {nextTierLabel}</span>
                <span>{tierProgress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${tierProgress}%`, background: brandColor }}
                />
              </div>
              <p className="mt-1.5 text-xs opacity-50">
                Ancora {pointsToNextTier.toLocaleString()} punti per {nextTierLabel}
              </p>
            </div>
          )}

          {/* Streak chip (shown if active streak) */}
          {hasStreak && currentStreak > 0 && (
            <div
              className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold"
              style={{ background: streakAtRisk ? 'rgba(239,68,68,0.2)' : 'rgba(249,115,22,0.2)', color: streakAtRisk ? '#fca5a5' : '#fdba74' }}
            >
              <Flame className="h-3.5 w-3.5" />
              {currentStreak} {currentStreak === 1 ? 'visita' : 'visite'} di fila
              {streakAtRisk && daysUntilStreakExpires !== null && (
                <span>· scade tra {daysUntilStreakExpires}gg</span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ── STREAK SECTION ─────────────────────────────────────────────── */}
      {hasStreak && currentStreak > 0 && (
        <section
          className="rounded-3xl p-5"
          style={{ border: streakAtRisk ? '1.5px solid rgba(239,68,68,0.3)' : '1px solid #f3f4f6', background: '#fff' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Flame className={`h-5 w-5 ${streakAtRisk ? 'text-red-500' : 'text-orange-500'}`} style={{ animation: 'pulse 1.5s infinite' }} />
                <p className="text-base font-extrabold text-neutral-950">
                  {currentStreak} {currentStreak === 1 ? 'visita' : 'visite'} consecutive
                </p>
              </div>
              <p className="mt-1 text-sm text-neutral-500">{streakMotivation(currentStreak)}</p>
              {daysUntilStreakExpires !== null && daysUntilStreakExpires > 0 && (
                <p className={`mt-2 text-xs font-semibold ${streakAtRisk ? 'text-red-600' : 'text-neutral-400'}`}>
                  {streakAtRisk ? '⚠️ ' : ''}La streak scade tra {daysUntilStreakExpires} {daysUntilStreakExpires === 1 ? 'giorno' : 'giorni'} se non torni
                </p>
              )}
            </div>
            <div className="text-4xl font-black text-orange-500">{currentStreak}</div>
          </div>
        </section>
      )}

      {/* ── REWARDS: Goal Gradient Effect ──────────────────────────────── */}
      {rewards.length > 0 && (
        <section className="rounded-3xl border border-neutral-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5" style={{ color: brandColor }} />
            <h2 className="text-base font-extrabold text-neutral-950">Premi disponibili</h2>
          </div>

          <div className="flex flex-col gap-3">
            {rewards.map((reward, idx) => {
              const canRedeem = availablePoints >= reward.pointsCost
              const progress = Math.min(100, Math.round((availablePoints / reward.pointsCost) * 100))
              const prevReward = idx > 0 ? rewards[idx - 1] : null
              const halfwayBetween = prevReward && totalPoints > prevReward.pointsCost
                && totalPoints < reward.pointsCost
                && totalPoints >= prevReward.pointsCost + (reward.pointsCost - prevReward.pointsCost) * 0.45
                && totalPoints <= prevReward.pointsCost + (reward.pointsCost - prevReward.pointsCost) * 0.55

              return (
                <React.Fragment key={reward.id}>
                  {halfwayBetween && (
                    <div className="rounded-2xl bg-neutral-50 px-4 py-2.5 text-center text-xs font-semibold text-neutral-500">
                      💪 Metà strada! Continua così
                    </div>
                  )}
                  <div
                    className="rounded-2xl border p-4"
                    style={{
                      borderColor: canRedeem ? brandColor + '44' : '#f3f4f6',
                      background: canRedeem ? brandColor + '08' : '#fff',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-neutral-950">{reward.name}</p>
                        {reward.description && (
                          <p className="mt-0.5 text-xs text-neutral-500 line-clamp-2">{reward.description}</p>
                        )}
                        <p className="mt-1 text-xs font-bold" style={{ color: brandColor }}>
                          {reward.pointsCost.toLocaleString()} punti
                        </p>
                      </div>

                      {canRedeem ? (
                        <button
                          onClick={() => handleRedeemRequest(reward)}
                          className="shrink-0 rounded-xl px-4 py-2 text-xs font-bold text-white"
                          style={{ background: brandColor }}
                        >
                          Riscatta 🎁
                        </button>
                      ) : (
                        <span className="shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-400 bg-neutral-100">
                          {(reward.pointsCost - availablePoints).toLocaleString()} pt
                        </span>
                      )}
                    </div>

                    {!canRedeem && (
                      <div className="mt-3">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${progress}%`, background: brandColor }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-neutral-400">
                          Ancora {(reward.pointsCost - availablePoints).toLocaleString()} punti
                        </p>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </section>
      )}

      {/* ── BADGES (Club VIP only) ──────────────────────────────────────── */}
      {isVip && badges.length > 0 && (
        <section className="rounded-3xl border border-neutral-100 bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <Award className="h-5 w-5" style={{ color: brandColor }} />
            <h2 className="text-base font-extrabold text-neutral-950">Badge Collection</h2>
            <span className="ml-auto rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-bold text-neutral-500">
              {badges.filter((b) => b.unlocked).length}/{badges.length}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {badges.map((badge) => {
              const emoji = BADGE_EMOJI[badge.conditionType] ?? '⭐'
              return (
                <div key={badge.id} className="flex flex-col items-center gap-1.5">
                  <div
                    className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl"
                    style={{
                      background: badge.unlocked ? 'var(--bg-secondary, #f4f4f4)' : '#f4f4f4',
                      filter: badge.unlocked ? 'none' : 'grayscale(1)',
                      opacity: badge.unlocked ? 1 : 0.45,
                      border: badge.unlocked ? `2px solid ${brandColor}40` : '2px solid transparent',
                    }}
                  >
                    {badge.iconUrl ? (
                      <Image
                        src={badge.iconUrl}
                        alt={badge.name}
                        width={64}
                        height={64}
                        unoptimized
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <span className="text-3xl">{emoji}</span>
                    )}
                    {!badge.unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/40" />
                    )}
                  </div>
                  <p className="text-center text-[10px] font-semibold leading-tight text-neutral-700" style={{ maxWidth: 64 }}>
                    {badge.name}
                  </p>
                  {badge.unlocked && badge.unlockedAt && (
                    <p className="text-center text-[9px] text-neutral-400">{fmtDate(badge.unlockedAt)}</p>
                  )}
                  {!badge.unlocked && (
                    <p className="text-center text-[9px] text-neutral-400">
                      {badge.conditionType === 'visits_count' && `${badge.conditionValue} visite`}
                      {badge.conditionType === 'streak_count' && `${badge.conditionValue} streak`}
                      {badge.conditionType === 'points_total' && `${badge.conditionValue.toLocaleString()} pt`}
                      {badge.conditionType === 'months_since_first_visit' && `${badge.conditionValue} mesi`}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── HISTORY ────────────────────────────────────────────────────── */}
      {transactions.length > 0 && (
        <section className="rounded-3xl border border-neutral-100 bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="flex w-full items-center justify-between p-5"
          >
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-neutral-400" />
              <span className="text-base font-extrabold text-neutral-950">Storico punti</span>
            </div>
            {historyOpen ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
          </button>

          {historyOpen && (
            <div className="border-t border-neutral-100 px-5">
              {transactions.map((tx, i) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between gap-4 py-3"
                  style={{ borderBottom: i < transactions.length - 1 ? '1px solid #f3f4f6' : 'none' }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-950">
                      {tx.description ?? tx.type}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">{fmtDate(tx.createdAt)}</p>
                  </div>
                  <span
                    className="shrink-0 text-sm font-extrabold"
                    style={{ color: TX_COLOR[tx.type] ?? '#9a968b' }}
                  >
                    {tx.points > 0 ? '+' : ''}{tx.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ── REDEEM BOTTOM SHEET ─────────────────────────────────────────── */}
      {redeemReward && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget && !redeemPending) { setRedeemReward(null); setRedeemDone(false) } }}
        >
          <div className="w-full rounded-t-3xl bg-white pb-8 pt-2" style={{ maxHeight: '85vh' }}>
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-200" />

            {!redeemDone ? (
              <div className="px-6">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl" style={{ background: brandColor + '15' }}>
                    🎁
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-neutral-950">{redeemReward.name}</h3>
                    <p className="text-sm font-bold" style={{ color: brandColor }}>
                      {redeemReward.pointsCost.toLocaleString()} punti
                    </p>
                  </div>
                </div>

                {redeemReward.description && (
                  <p className="mb-5 rounded-2xl bg-neutral-50 p-4 text-sm text-neutral-600">
                    {redeemReward.description}
                  </p>
                )}

                <div className="mb-6 rounded-2xl p-4 text-sm leading-relaxed text-neutral-600" style={{ background: brandColor + '10', border: `1px solid ${brandColor}30` }}>
                  <strong>Come funziona:</strong> Clicca &quot;Richiedi riscatto&quot; per generare la richiesta. Mostra la schermata di conferma al tuo barbiere che la approverà in salone. I punti vengono detratti solo dopo la conferma.
                </div>

                {redeemError && (
                  <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{redeemError}</p>
                )}

                <button
                  disabled={redeemPending}
                  onClick={handleConfirmRequest}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white"
                  style={{ background: brandColor, minHeight: 56 }}
                >
                  {redeemPending ? (
                    <><RotateCcw className="h-4 w-4 animate-spin" /> Invio richiesta…</>
                  ) : (
                    <>Richiedi riscatto</>
                  )}
                </button>
                <button
                  onClick={() => setRedeemReward(null)}
                  className="mt-3 w-full rounded-2xl py-3 text-sm font-semibold text-neutral-500"
                >
                  Annulla
                </button>
              </div>
            ) : (
              /* Confirmation screen — "show this to your barber" */
              <div className="px-6 text-center">
                <div className="mb-4 text-6xl">🎁</div>
                <h3 className="text-2xl font-black text-neutral-950">Richiesta inviata!</h3>
                <p className="mt-2 text-sm text-neutral-500">
                  Mostra questa schermata al tuo barbiere per confermare il riscatto.
                </p>

                <div
                  className="mx-auto my-6 max-w-xs rounded-3xl p-6"
                  style={{ background: 'linear-gradient(160deg,#111,#1a1a1a)', color: '#fff' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-50 mb-2">Premio da riscattare</p>
                  <p className="text-2xl font-black" style={{ color: brandColor }}>{redeemReward.name}</p>
                  <p className="mt-1 text-sm opacity-60">{redeemReward.pointsCost.toLocaleString()} punti</p>
                </div>

                <p className="text-xs text-neutral-400 mb-6">
                  Il tuo barbiere vedrà questa richiesta nel suo gestionale e la confermerà in salone. I punti vengono detratti solo dopo la conferma.
                </p>

                <button
                  onClick={() => { setRedeemReward(null); setRedeemDone(false); router.refresh() }}
                  className="w-full rounded-2xl py-3 text-sm font-bold text-white"
                  style={{ background: brandColor }}
                >
                  Chiudi
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
