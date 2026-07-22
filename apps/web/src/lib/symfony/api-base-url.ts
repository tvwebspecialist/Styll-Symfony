const DEFAULT_SYMFONY_API_URL = 'https://api.styll.it'

export function getSymfonyApiBaseUrl(): string {
  const raw =
    process.env.SYMFONY_API_URL ??
    process.env.NEXT_PUBLIC_SYMFONY_API_URL ??
    DEFAULT_SYMFONY_API_URL

  return raw.replace(/\/+$/, '')
}
