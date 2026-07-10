export const CONSENT_PURPOSE = {
  MARKETING_EMAIL: 'MARKETING_EMAIL',
  MARKETING_PUSH: 'MARKETING_PUSH',
  CHURN_PROFILING: 'CHURN_PROFILING',
} as const

export type ConsentPurpose = (typeof CONSENT_PURPOSE)[keyof typeof CONSENT_PURPOSE]

export const CONSENT_CHANNEL = {
  PWA: 'PWA',
  EMAIL: 'EMAIL',
  BACKOFFICE: 'BACKOFFICE',
  IMPORT: 'IMPORT',
  SYSTEM: 'SYSTEM',
} as const

export type ConsentChannel = (typeof CONSENT_CHANNEL)[keyof typeof CONSENT_CHANNEL]

export const CONSENT_SOURCE = {
  PWA_EMAIL_OTP_BOOTSTRAP: 'PWA_EMAIL_OTP_BOOTSTRAP',
  PWA_EMAIL_OTP_PROFILE: 'PWA_EMAIL_OTP_PROFILE',
  PWA_PROFILE_PREFERENCES: 'PWA_PROFILE_PREFERENCES',
  PHONE_OTP_BOOTSTRAP: 'PHONE_OTP_BOOTSTRAP',
  GOOGLE_AUTH_BOOTSTRAP: 'GOOGLE_AUTH_BOOTSTRAP',
  EMAIL_PASSWORD_BOOTSTRAP: 'EMAIL_PASSWORD_BOOTSTRAP',
  GUEST_BOOKING: 'GUEST_BOOKING',
  STAFF_DASHBOARD: 'STAFF_DASHBOARD',
  SUPERADMIN_PANEL: 'SUPERADMIN_PANEL',
  SUPERADMIN_SEED: 'SUPERADMIN_SEED',
  CLIENT_IMPORT: 'CLIENT_IMPORT',
  EMAIL_UNSUBSCRIBE_LINK: 'EMAIL_UNSUBSCRIBE_LINK',
  LEGACY_MIGRATION: 'LEGACY_MIGRATION',
} as const

export type ConsentSource = (typeof CONSENT_SOURCE)[keyof typeof CONSENT_SOURCE]

export const CONSENT_ACTOR = {
  CLIENT_PROFILE: 'CLIENT_PROFILE',
  STAFF_MEMBER: 'STAFF_MEMBER',
  SUPERADMIN: 'SUPERADMIN',
  GUEST_SUBMISSION: 'GUEST_SUBMISSION',
  UNSUBSCRIBE_LINK: 'UNSUBSCRIBE_LINK',
  LEGACY_MIGRATION: 'LEGACY_MIGRATION',
  SYSTEM: 'SYSTEM',
} as const

export type ConsentActor = (typeof CONSENT_ACTOR)[keyof typeof CONSENT_ACTOR]

export const CONSENT_STATUS = {
  ALLOWED: 'ALLOWED',
  DISALLOWED: 'DISALLOWED',
  UNKNOWN: 'UNKNOWN',
} as const

export type ConsentStatus = (typeof CONSENT_STATUS)[keyof typeof CONSENT_STATUS]

export const CONSENT_PURPOSES_WITH_SHARED_MARKETING_BOOLEAN = [
  CONSENT_PURPOSE.MARKETING_EMAIL,
  CONSENT_PURPOSE.MARKETING_PUSH,
] as const

export const MARKETING_PREFERENCES_LABEL = 'Offerte e promozioni'
export const MARKETING_PREFERENCES_SUBLABEL = 'Promozioni del salone'
export const CHURN_PROFILING_LABEL = 'Analisi della frequenza'
export const CHURN_PROFILING_DESCRIPTION =
  "Il tuo barbiere può vedere quanto tempo è passato dall'ultima visita per capire quando contattarti. Puoi disattivare questa analisi in qualsiasi momento."
export const MARKETING_SIGNUP_PREFIX = 'Voglio ricevere offerte e promozioni da'
export const MARKETING_SIGNUP_SUFFIX =
  'Puoi cambiare questa preferenza in qualsiasi momento dalle impostazioni.'

export const CONSENT_TEXT_VERSION = {
  MARKETING_PWA_SIGNUP: 'marketing-pwa-signup-v1',
  MARKETING_PWA_PREFERENCES: 'marketing-pwa-preferences-v1',
  MARKETING_BACKOFFICE: 'marketing-backoffice-v1',
  MARKETING_IMPORT: 'marketing-import-v1',
  MARKETING_DEFAULT_OFF: 'marketing-default-off-v1',
  MARKETING_EMAIL_PASSWORD: 'marketing-auth-bootstrap-v1',
  MARKETING_UNSUBSCRIBE: 'marketing-unsubscribe-email-v1',
  CHURN_PWA_PREFERENCES: 'churn-pwa-preferences-v1',
  CHURN_DEFAULT_ACTIVE: 'churn-default-active-v1',
  LEGACY_MIGRATION: 'legacy-migration-v1',
} as const

export const CONSENT_LEGAL_BASIS_BY_PURPOSE: Record<ConsentPurpose, string> = {
  [CONSENT_PURPOSE.MARKETING_EMAIL]: 'Art. 6(1)(a) GDPR — consenso marketing',
  [CONSENT_PURPOSE.MARKETING_PUSH]: 'Art. 6(1)(a) GDPR — consenso marketing',
  [CONSENT_PURPOSE.CHURN_PROFILING]:
    "Art. 6(1)(f) GDPR — legittimo interesse con diritto di opposizione ex Art. 21 GDPR",
}

export function buildMarketingSignupConsentText(businessName?: string): string {
  return `${MARKETING_SIGNUP_PREFIX} ${businessName ?? 'il salone'}. ${MARKETING_SIGNUP_SUFFIX}`
}

export function buildMarketingPreferencesConsentText(): string {
  return `${MARKETING_PREFERENCES_LABEL} — ${MARKETING_PREFERENCES_SUBLABEL}.`
}

export function buildMarketingBackofficeConsentText(): string {
  return 'Consenso marketing registrato o aggiornato manualmente dal salone o da un operatore autorizzato.'
}

export function buildMarketingImportConsentText(): string {
  return 'Stato del consenso marketing importato da una sorgente esterna e registrato nel CRM del tenant.'
}

export function buildMarketingDefaultOffConsentText(): string {
  return "Nessun consenso marketing è stato raccolto in questo flusso: lo stato iniziale resta disattivato finché il cliente non effettua un opt-in esplicito."
}

export function buildMarketingEmailPasswordConsentText(): string {
  return 'Stato marketing applicato dal flusso di accesso o registrazione cliente del tenant e registrato al momento della creazione del profilo.'
}

export function buildMarketingUnsubscribeConsentText(): string {
  return "Revoca del consenso marketing richiesta tramite il link di annullamento iscrizione presente in un'email promozionale del salone."
}

export function buildChurnPreferencesConsentText(): string {
  return CHURN_PROFILING_DESCRIPTION
}

export function buildChurnDefaultActiveConsentText(): string {
  return 'L’analisi della frequenza visite resta attiva finché il cliente non esercita l’opposizione dalle preferenze della PWA.'
}

export function buildLegacyMigrationConsentText(): string {
  return 'Stato del consenso migrato dai campi legacy senza prova storica completa dell’evento originario.'
}
