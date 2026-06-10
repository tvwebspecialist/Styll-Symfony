'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ShoppingBag,
  Trophy,
  UserPen,
  MessageCircle,
  FileText,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { updateProfile } from '@/lib/actions/profilo'
import { logoutClient } from '@/lib/actions/client-auth'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { PushNotificationToggle } from './PushNotificationToggle'

interface ProfileData {
  fullName: string | null
  phone: string | null
  email: string | null
}

interface Props {
  tenantId: string
  appuntamentiPath: string
  prodottiPath: string
  puntiPath: string
  datiPath: string
  basePath: string
  profile: ProfileData
}

function SettingRow({
  icon,
  label,
  onClick,
  href,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  href?: string
  danger?: boolean
}) {
  const cls = `flex items-center justify-between px-5 py-4 w-full text-left active:bg-neutral-50 transition-colors ${danger ? 'text-red-500' : 'text-neutral-700'}`

  const content = (
    <>
      <div className="flex items-center gap-3">
        <span className={`${danger ? 'text-red-500' : 'text-neutral-400'}`}>{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      {!danger && <ChevronRight className="size-4 text-neutral-300" />}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={cls}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  )
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-neutral-100 divide-y divide-neutral-100">
      {children}
    </div>
  )
}

function EditProfileSheet({
  open,
  onClose,
  profile,
}: {
  open: boolean
  onClose: () => void
  profile: ProfileData
}) {
  const [name, setName] = useState(profile.fullName ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function handleSave() {
    startTransition(async () => {
      const res = await updateProfile('', { fullName: name.trim(), phone: phone.trim() || null })
      if (res.ok) {
        router.refresh()
        onClose()
      } else {
        setError(res.error)
      }
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 rounded-t-3xl bg-white px-5 pt-5 pb-10 shadow-xl">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">Modifica profilo</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-neutral-400">
            Annulla
          </button>
        </div>
        <p className="mb-5 text-sm text-neutral-500">{profile.email}</p>

        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Nome e cognome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm text-neutral-900 outline-none focus:border-[var(--brand-primary)] transition-colors"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">Telefono</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm text-neutral-900 outline-none focus:border-[var(--brand-primary)] transition-colors"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="mt-1 flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: 'var(--brand-primary)' }}
          >
            {isPending ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CommPrefsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [email, setEmail] = useState(true)
  const [sms, setSms] = useState(false)
  const [whatsapp, setWhatsapp] = useState(false)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 rounded-t-3xl bg-white px-5 pt-5 pb-10 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-900">Preferenze comunicazione</h2>
          <button type="button" onClick={onClose} className="text-sm font-medium text-neutral-400">
            Chiudi
          </button>
        </div>

        {[
          { label: 'Email', value: email, set: setEmail },
          { label: 'SMS', value: sms, set: setSms },
          { label: 'WhatsApp', value: whatsapp, set: setWhatsapp },
        ].map(({ label, value, set }) => (
          <div key={label} className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0">
            <span className="text-sm font-medium text-neutral-700">{label}</span>
            <button
              type="button"
              onClick={() => set((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ${value ? 'bg-[var(--brand-primary)]' : 'bg-neutral-200'}`}
            >
              <span
                className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow transition ${value ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SettingsList({
  tenantId,
  appuntamentiPath,
  prodottiPath,
  puntiPath,
  basePath,
  profile,
}: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [commOpen, setCommOpen] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    const pwa = createPwaClient()
    await Promise.all([logoutClient(), pwa.auth.signOut({ scope: 'local' })])
    router.push(basePath)
    router.refresh()
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        {/* Group 1 — Il mio account */}
        <SectionCard>
          <SettingRow icon={<CalendarDays className="size-5" />} label="I miei appuntamenti" href={appuntamentiPath} />
          <SettingRow icon={<ShoppingBag className="size-5" />} label="Prodotti preferiti" href={prodottiPath} />
          <SettingRow icon={<Trophy className="size-5" />} label="Programma fedeltà" href={puntiPath} />
        </SectionCard>

        {/* Group 2 — Impostazioni */}
        <SectionCard>
          <SettingRow icon={<UserPen className="size-5" />} label="Modifica profilo" onClick={() => setEditOpen(true)} />
          <div className="px-0">
            <PushNotificationToggle tenantId={tenantId} />
          </div>
          <SettingRow icon={<MessageCircle className="size-5" />} label="Preferenze comunicazione" onClick={() => setCommOpen(true)} />
        </SectionCard>

        {/* Group 3 — Altro */}
        <SectionCard>
          <SettingRow
            icon={<FileText className="size-5" />}
            label="Termini e Privacy"
            href="https://styll.it/privacy"
          />
          <SettingRow
            icon={<LogOut className="size-5" />}
            label="Esci"
            onClick={handleLogout}
            danger
          />
        </SectionCard>
      </div>

      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} profile={profile} />
      <CommPrefsSheet open={commOpen} onClose={() => setCommOpen(false)} />
    </>
  )
}
