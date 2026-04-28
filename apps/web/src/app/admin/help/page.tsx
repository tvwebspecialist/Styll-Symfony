import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

import { Breadcrumbs } from '@/components/admin/breadcrumbs'

export const dynamic = 'force-dynamic'

interface HelpCard {
  emoji: string
  title: string
  description: string
  href?: string
  cta?: string
}

const CARDS: HelpCard[] = [
  {
    emoji: '👥',
    title: 'Utenti',
    description:
      'Invitare nuovi utenti, modificare profili, resettare password, impersonare account ed eliminarli.',
    href: '/admin/users',
    cta: 'Gestisci utenti',
  },
  {
    emoji: '🏪',
    title: 'Tenants',
    description:
      'Creare, modificare, sospendere, esportare e impersonare i tenant della piattaforma.',
    href: '/admin/tenants',
    cta: 'Gestisci tenant',
  },
  {
    emoji: '📋',
    title: 'Servizi & Staff',
    description:
      'Gestione completa di servizi, staff e orari tramite la dashboard del singolo tenant.',
    href: '/admin/tenants',
    cta: 'Apri tenant',
  },
  {
    emoji: '💳',
    title: 'Abbonamenti',
    description:
      'Gestione dei piani di abbonamento, monitoraggio MRR e tenant attivi per piano.',
    href: '/admin/subscription-plans',
    cta: 'Vai ai piani',
  },
  {
    emoji: '⚙️',
    title: 'Impostazioni',
    description:
      'Feature flags, modalità manutenzione, email transazionali, branding di default e sicurezza.',
    href: '/admin/settings',
    cta: 'Apri impostazioni',
  },
  {
    emoji: '🔐',
    title: 'Sicurezza',
    description:
      'Configura 2FA per i superadmin, timeout di sessione e consulta l\u2019audit log delle azioni.',
    href: '/admin/settings',
    cta: 'Configura sicurezza',
  },
  {
    emoji: '💡',
    title: 'Tips',
    description:
      'Usa Cmd+K per la ricerca globale, le scorciatoie da tastiera e le bulk actions sulle tabelle.',
  },
]

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ['⌘', 'K'], label: 'Apri ricerca globale' },
  { keys: ['Esc'], label: 'Chiudi modale o pannello laterale' },
]

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs items={[{ label: 'Admin', href: '/admin' }, { label: 'Aiuto' }]} />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Centro Assistenza Superadmin
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutto quello che puoi fare nella piattaforma.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <div
            key={c.title}
            className="flex flex-col rounded-xl border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="text-4xl leading-none">{c.emoji}</div>
            <h2 className="mt-3 text-lg font-semibold">{c.title}</h2>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{c.description}</p>
            {c.href ? (
              <Link
                href={c.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-zinc-900 hover:underline dark:text-white"
              >
                {c.cta ?? 'Vai alla sezione'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-4 text-lg font-semibold">Scorciatoie da tastiera</h2>
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-center justify-between py-3 text-sm"
            >
              <span className="text-muted-foreground">{s.label}</span>
              <span className="flex items-center gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-xs text-zinc-700 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
