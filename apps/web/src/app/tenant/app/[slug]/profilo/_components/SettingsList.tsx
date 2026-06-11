'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  ShoppingBag,
  Trophy,
  UserPen,
  Settings,
  FileText,
  LogOut,
  ChevronRight,
} from 'lucide-react'
import { logoutClient } from '@/lib/actions/client-auth'
import { createPwaClient } from '@/lib/supabase/pwa-client'
import { PushNotificationToggle } from './PushNotificationToggle'

interface Props {
  tenantId: string
  appuntamentiPath: string
  prodottiPath: string
  puntiPath: string
  modificaPath: string
  preferenzePath: string
  basePath: string
  profile: {
    fullName: string | null
    phone: string | null
    email: string | null
  }
}

function GreyIcon({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="size-5 shrink-0 flex items-center justify-center" style={{ color: '#6b7280' }}>
      {icon}
    </div>
  )
}

function SettingRow({
  icon,
  label,
  sublabel,
  onClick,
  href,
  danger,
}: {
  icon: React.ReactNode
  label: string
  sublabel?: string
  onClick?: () => void
  href?: string
  danger?: boolean
}) {
  const cls = `flex items-center gap-3 px-4 py-3.5 w-full text-left active:bg-neutral-50 transition-colors`

  const content = (
    <>
      {icon}
      <div className="flex-1 min-w-0">
        <p className={`text-[15px] font-semibold ${danger ? 'text-red-500' : 'text-neutral-900'}`}>{label}</p>
        {sublabel && <p className="text-xs text-neutral-400 mt-0.5">{sublabel}</p>}
      </div>
      {!danger && <ChevronRight className="size-4 text-neutral-300 shrink-0" />}
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-neutral-400 px-1 mb-2">{title}</p>
      <div className="overflow-hidden rounded-[20px] bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)] border border-neutral-100 divide-y divide-neutral-100">
        {children}
      </div>
    </div>
  )
}

export function SettingsList({
  tenantId,
  appuntamentiPath,
  prodottiPath,
  puntiPath,
  modificaPath,
  preferenzePath,
  basePath,
}: Props) {
  const [, startTransition] = useTransition()
  const router = useRouter()

  function handleLogout() {
    startTransition(async () => {
      const pwa = createPwaClient()
      await Promise.all([logoutClient(), pwa.auth.signOut({ scope: 'local' })])
      router.push(basePath)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Group 1 — Il mio account */}
      <SectionCard title="Il mio account">
        <SettingRow
          icon={<GreyIcon icon={<CalendarDays className="size-5" />} />}
          label="I miei appuntamenti"
          href={appuntamentiPath}
        />
        <SettingRow
          icon={<GreyIcon icon={<ShoppingBag className="size-5" />} />}
          label="Prodotti preferiti"
          href={prodottiPath}
        />
        <SettingRow
          icon={<GreyIcon icon={<Trophy className="size-5" />} />}
          label="Programma fedeltà"
          href={puntiPath}
        />
      </SectionCard>

      {/* Group 2 — Impostazioni */}
      <SectionCard title="Impostazioni">
        <SettingRow
          icon={<GreyIcon icon={<UserPen className="size-5" />} />}
          label="Modifica profilo"
          href={modificaPath}
        />
        <div className="px-4">
          <PushNotificationToggle tenantId={tenantId} />
        </div>
        <SettingRow
          icon={<GreyIcon icon={<Settings className="size-5" />} />}
          label="Preferenze"
          sublabel="Comunicazioni, notifiche, privacy"
          href={preferenzePath}
        />
      </SectionCard>

      {/* Group 3 — Altro */}
      <SectionCard title="Altro">
        <SettingRow
          icon={<GreyIcon icon={<FileText className="size-5" />} />}
          label="Termini e Privacy"
          href="https://styll.it/privacy"
        />
        <SettingRow
          icon={<GreyIcon icon={<LogOut className="size-5" />} />}
          label="Esci"
          onClick={handleLogout}
          danger
        />
      </SectionCard>
    </div>
  )
}
