import * as Sentry from '@sentry/nextjs'

// PWA client app (/tenant/app/*) is used by end-users who gain nothing from
// Sentry session replay or performance traces — and the SDK runtime adds heap
// + network overhead on low-end mobile. Skip init for those routes.
// Note: the SDK bundle is still downloaded (webpack-level exclusion would
// require additional config); this prevents runtime overhead and outbound
// traffic to Sentry's ingestion endpoint.
const isPwaClientApp =
  typeof window !== 'undefined' &&
  window.location.pathname.startsWith('/tenant/app/')

if (!isPwaClientApp) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: process.env.NODE_ENV === 'production',
    tracesSampleRate: 0.2,
    profilesSampleRate: 0.1,
    enableLogs: true,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.consoleLoggingIntegration({ levels: ['warn', 'error'] }),
    ],
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
