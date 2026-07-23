import 'server-only'

import { cookies } from 'next/headers'

import { getSymfonyApiBaseUrl } from './api-base-url.ts'
import { readSymfonyStaffJwt } from './staff-context.ts'

export type SymfonyAdminApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'http_error'
  | 'network_error'
  | 'invalid_response'

export class SymfonyAdminApiError extends Error {
  readonly code: SymfonyAdminApiErrorCode
  readonly details: {
    status?: number
    url: string
    body?: string
    cause?: unknown
  }

  constructor(
    message: string,
    code: SymfonyAdminApiErrorCode,
    details: {
      status?: number
      url: string
      body?: string
      cause?: unknown
    }
  ) {
    super(message)
    this.name = 'SymfonyAdminApiError'
    this.code = code
    this.details = details
  }
}

interface SymfonyAdminRequestInit extends Omit<RequestInit, 'headers' | 'body'> {
  body?: unknown
  headers?: Record<string, string>
}

async function getAdminAuthHeaders(extraHeaders?: Record<string, string>): Promise<Record<string, string>> {
  const cookieStore = await cookies()
  const jwt = readSymfonyStaffJwt(cookieStore)

  if (!jwt) {
    throw new SymfonyAdminApiError('Sessione Symfony non valida.', 'unauthorized', {
      url: `${getSymfonyApiBaseUrl()}/api/admin`,
    })
  }

  return {
    Accept: 'application/json',
    Authorization: `Bearer ${jwt}`,
    ...(extraHeaders ?? {}),
  }
}

export async function fetchSymfonyAdminJson<T>(
  path: string,
  init: SymfonyAdminRequestInit = {}
): Promise<T> {
  const url = `${getSymfonyApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`
  const headers = await getAdminAuthHeaders(init.headers)
  const isFormDataBody = init.body instanceof FormData

  if (init.body !== undefined && !isFormDataBody) {
    headers['Content-Type'] = 'application/json'
  }

  const body =
    init.body === undefined
      ? undefined
      : isFormDataBody
        ? init.body as FormData
        : JSON.stringify(init.body)

  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      headers,
      body,
      cache: 'no-store',
    })
  } catch (cause) {
    throw new SymfonyAdminApiError('Impossibile raggiungere la API admin Symfony.', 'network_error', {
      url,
      cause,
    })
  }

  if (!response.ok) {
    const body = await response.text().catch(() => undefined)
    throw new SymfonyAdminApiError(
      response.status === 401
        ? 'Symfony admin API ha rifiutato il JWT.'
        : response.status === 403
          ? 'Symfony admin API ha rifiutato i permessi.'
          : 'Symfony admin API request failed.',
      response.status === 401
        ? 'unauthorized'
        : response.status === 403
          ? 'forbidden'
          : 'http_error',
      {
        status: response.status,
        url,
        body,
      }
    )
  }

  try {
    if (response.status === 204) {
      return undefined as T
    }

    return await response.json() as T
  } catch (cause) {
    throw new SymfonyAdminApiError('Symfony admin API returned invalid JSON.', 'invalid_response', {
      url,
      cause,
    })
  }
}
