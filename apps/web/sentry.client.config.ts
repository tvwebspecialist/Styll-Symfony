import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  tracesSampleRate: 0.2,
  profilesSampleRate: 0.1,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true, // GDPR: maschera testo utente
      blockAllMedia: true, // GDPR: blocca media
    }),
  ],
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,
})
