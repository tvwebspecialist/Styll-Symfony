export const ANALYTICS_CONSENT_POLICY_VERSION = 'analytics-consent-v1'
export const ANALYTICS_PREFERENCES_SECTION_ID = 'analytics-preferences'

export const ANALYTICS_CONSENT_COPY = {
  bannerTitle: 'Usiamo i cookie',
  bannerBody:
    'Usiamo sempre i cookie tecnici necessari. Solo se accetti attiviamo analytics opzionali per migliorare il servizio. Nessuna pubblicità.',
  acceptLabel: 'Accetta analytics',
  rejectLabel: 'Continua senza analytics',
  manageLabel: 'Gestisci preferenze',
  preferencesTitle: 'Preferenze analytics',
  preferencesBody:
    'Puoi attivare o disattivare in qualsiasi momento gli analytics opzionali usati per misurare utilizzo e performance. La tua scelta viene salvata lato server con versione del testo, timestamp e contesto tecnico disponibile.',
  acceptedDescription:
    'Analytics opzionali attivi. Vercel Analytics, PostHog e analytics first-party possono essere usati solo secondo questa scelta.',
  rejectedDescription:
    'Analytics opzionali disattivati. Restano attivi solo cookie tecnici e preferenze essenziali per il funzionamento del servizio.',
  unknownDescription:
    'Non hai ancora espresso una scelta sugli analytics opzionali per questa superficie.',
} as const

export const ANALYTICS_CONSENT_SOURCE = {
  BANNER: 'BANNER',
  PREFERENCES_CENTER: 'PREFERENCES_CENTER',
  COOKIE_POLICY: 'COOKIE_POLICY',
  LOCAL_STORAGE_MIGRATION: 'LOCAL_STORAGE_MIGRATION',
} as const

export type AnalyticsConsentChoiceSource =
  (typeof ANALYTICS_CONSENT_SOURCE)[keyof typeof ANALYTICS_CONSENT_SOURCE]

export const ANALYTICS_CONSENT_SURFACE = {
  PLATFORM: 'PLATFORM',
  TENANT_WEBSITE: 'TENANT_WEBSITE',
  TENANT_PWA: 'TENANT_PWA',
  TENANT_DASHBOARD: 'TENANT_DASHBOARD',
} as const

export type AnalyticsConsentSurface =
  (typeof ANALYTICS_CONSENT_SURFACE)[keyof typeof ANALYTICS_CONSENT_SURFACE]
