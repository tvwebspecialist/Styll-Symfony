export const PUBLIC_B2B_COMPANY_NAME = 'Styll'
export const PUBLIC_B2B_LEGAL_PARTY_NAME = 'Tommaso Vezzaro'
export const PUBLIC_B2B_CONTACT_EMAIL = 'privacy@styll.it'
export const PUBLIC_DPA_SECTION_ID = 'accordo-trattamento-dati'

export const PUBLIC_B2B_IDENTITY_NOTE =
  'Styll è il nome commerciale del servizio fornito da Tommaso Vezzaro. Quando questi documenti usano il nome "Styll", si riferiscono al servizio e alla piattaforma, non a una società distinta.'

export const PUBLIC_B2B_PUBLIC_LEGAL_PARTY_NOTE =
  'Per il sito B2B e le superfici pubbliche collegate, la parte contrattuale e il titolare del trattamento è Tommaso Vezzaro.'

export const PUBLIC_B2B_LEGAL_REVIEW_NOTE =
  'Questa documentazione pubblica descrive il perimetro operativo, privacy e trasparenza di Styll sulle superfici pubbliche del sito per visitatori, prospect e clienti business.'

export const PUBLIC_B2B_DOCS = {
  terms: {
    version: '1.3',
    lastUpdated: '14 luglio 2026',
  },
  privacy: {
    version: '1.5',
    lastUpdated: '14 luglio 2026',
  },
  cookie: {
    version: '1.5',
    lastUpdated: '14 luglio 2026',
  },
  subProcessor: {
    version: '1.3',
    lastUpdated: '14 luglio 2026',
  },
} as const

export interface PublicSubProcessorEntry {
  detailsUrl: string
  location: string
  name: string
  safeguards: string
  service: string
}

export const PUBLIC_B2B_SUBPROCESSORS: PublicSubProcessorEntry[] = [
  {
    name: 'Supabase Inc.',
    service: 'Database, autenticazione, storage e servizi collegati alla piattaforma dati',
    location: 'Regione primaria EU (Irlanda); possibili sub-trattamenti extra-SEE dichiarati dal fornitore',
    safeguards:
      'DPA/TIA del fornitore; la regione EU riduce l’esposizione ma non esclude automaticamente trasferimenti extra-SEE.',
    detailsUrl: 'https://supabase.com/privacy',
  },
  {
    name: 'Vercel Inc.',
    service: 'Hosting, CDN e Vercel Analytics cookieless per le superfici web di Styll',
    location: 'USA / infrastruttura globale',
    safeguards:
      'Documentazione contrattuale del fornitore, incluse SCC dove applicabili; DPF ove dichiarato dal fornitore.',
    detailsUrl: 'https://vercel.com/legal/privacy-policy',
  },
  {
    name: 'Resend Inc.',
    service: 'Invio email transazionali e operative',
    location: 'USA',
    safeguards:
      'Documentazione contrattuale del fornitore e meccanismi di trasferimento applicabili per l’invio email.',
    detailsUrl: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'Functional Software Inc. (Sentry)',
    service: 'Monitoraggio errori e diagnostica tecnica su superfici selezionate',
    location: 'USA',
    safeguards:
      'Documentazione contrattuale del fornitore; SCC/DPF ove applicabili secondo la documentazione del provider.',
    detailsUrl: 'https://sentry.io/privacy/',
  },
  {
    name: 'PostHog Inc.',
    service: 'Analytics del sito marketing e lead attribution, solo dopo consenso agli analytics opzionali',
    location: 'Endpoint EU configurato; fornitore extra-SEE',
    safeguards:
      'Documentazione contrattuale del fornitore e meccanismi di trasferimento applicabili in base alla configurazione del workspace.',
    detailsUrl: 'https://posthog.com/privacy',
  },
  {
    name: 'Anthropic PBC',
    service: 'Funzioni AI assistite per utenti autenticati (es. aiuto chat e magic wand), solo su richiesta esplicita',
    location: 'USA',
    safeguards:
      'Documentazione contrattuale del fornitore e meccanismi di trasferimento applicabili alle funzionalità AI attivate.',
    detailsUrl: 'https://www.anthropic.com/legal/privacy',
  },
]
