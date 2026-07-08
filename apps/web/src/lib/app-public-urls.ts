const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'styll.it'

export interface AppRuntimeLocation {
  protocol: string
  hostname: string
  port: string
}

function firstHeaderValue(value: string | null | undefined): string | null {
  return value?.split(',')[0]?.trim() || null
}

function parseHost(value: string | null): { hostname: string; port: string } | null {
  const host = firstHeaderValue(value)
  if (!host) return null

  const [hostname = '', port = ''] = host.split(':')
  if (!hostname) return null

  return { hostname, port }
}

function defaultProtocolForHost(hostname: string): string {
  return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === '127.0.0.1'
    ? 'http:'
    : 'https:'
}

export function deriveRuntimeLocationFromRequestHeaders(
  headerStore: { get: (name: string) => string | null }
): AppRuntimeLocation | null {
  const parsedHost =
    parseHost(headerStore.get('x-forwarded-host')) ??
    parseHost(headerStore.get('host')) ??
    parseHost(headerStore.get('x-original-host'))

  if (!parsedHost) return null

  const forwardedProto = firstHeaderValue(headerStore.get('x-forwarded-proto'))
  const protocol = forwardedProto
    ? `${forwardedProto.replace(/:$/, '')}:`
    : defaultProtocolForHost(parsedHost.hostname)

  return {
    protocol,
    hostname: parsedHost.hostname,
    port: parsedHost.port,
  }
}

export function readRuntimeLocation(): AppRuntimeLocation | null {
  if (typeof window === 'undefined') return null

  return {
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    port: window.location.port,
  }
}

export function buildAppPublicUrls(
  slug: string,
  runtimeLocation: AppRuntimeLocation | null,
  previewParams?: URLSearchParams,
): { hostLabel: string; appUrl: string; previewUrl: string } {
  if (
    runtimeLocation &&
    (runtimeLocation.hostname === 'localhost' ||
      runtimeLocation.hostname.endsWith('.localhost') ||
      runtimeLocation.hostname === '127.0.0.1')
  ) {
    const portSuffix = runtimeLocation.port ? `:${runtimeLocation.port}` : ''
    const baseUrl = `${runtimeLocation.protocol}//localhost${portSuffix}`
    const appUrl = `${baseUrl}/?_tenant_slug=${encodeURIComponent(slug)}&_tenant_type=app`
    const previewSearch = new URLSearchParams(previewParams)
    previewSearch.set('_tenant_slug', slug)
    previewSearch.set('_tenant_type', 'app')

    return {
      hostLabel: `localhost${portSuffix} · ${slug} app`,
      appUrl,
      previewUrl: `${baseUrl}/?${previewSearch.toString()}`,
    }
  }

  const baseUrl = `https://${slug}-app.${ROOT_DOMAIN}`
  return {
    hostLabel: `${slug}-app.${ROOT_DOMAIN}`,
    appUrl: baseUrl,
    previewUrl: previewParams?.toString()
      ? `${baseUrl}/?${previewParams.toString()}`
      : `${baseUrl}/`,
  }
}
