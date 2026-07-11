export const PUBLIC_B2B_COMPANY_NAME = 'Styll'
export const PUBLIC_B2B_CONTACT_EMAIL = 'privacy@styll.it'
export const PUBLIC_DPA_SECTION_ID = 'accordo-trattamento-dati'

export const PUBLIC_B2B_IDENTITY_NOTE =
  'I dati societari definitivi di Styll (denominazione completa, sede legale, P.IVA e PEC) sono in corso di finalizzazione e saranno pubblicati prima dell’attivazione commerciale con clienti paganti.'

export const PUBLIC_B2B_LEGAL_REVIEW_NOTE =
  'Questa versione pubblica del pacchetto legale B2B descrive il perimetro operativo e privacy attuale del servizio. Prima dell’attivazione commerciale con clienti paganti è prevista una finalizzazione legale professionale dei documenti e dei dati societari.'

export const PUBLIC_B2B_DOCS = {
  terms: {
    version: '1.1',
    lastUpdated: '9 luglio 2026',
  },
  privacy: {
    version: '1.2',
    lastUpdated: '10 luglio 2026',
  },
  cookie: {
    version: '1.3',
    lastUpdated: '11 luglio 2026',
  },
  subProcessor: {
    version: '1.1',
    lastUpdated: '9 luglio 2026',
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
