import React from 'react'
import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'
import { getTenantBySlug } from '@/lib/tenant'

export const runtime = 'edge'

const DEFAULT_ICON_SIZE = 512
const MIN_ICON_SIZE = 32
const MAX_ICON_SIZE = 1024

function getIconSize(value: string | null) {
  const requestedSize = Number.parseInt(value ?? String(DEFAULT_ICON_SIZE), 10)
  if (!Number.isFinite(requestedSize)) return DEFAULT_ICON_SIZE
  return Math.min(Math.max(requestedSize, MIN_ICON_SIZE), MAX_ICON_SIZE)
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null

    const contentType = res.headers.get('content-type') ?? 'image/png'
    const buffer = await res.arrayBuffer()
    return `data:${contentType};base64,${arrayBufferToBase64(buffer)}`
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')
  const size = getIconSize(searchParams.get('size'))

  if (!slug) {
    return new Response('Missing slug', { status: 400 })
  }

  const tenant = await getTenantBySlug(slug)
  const bgColor = tenant?.primary_color ?? '#1A1A1A'
  const name = tenant?.business_name ?? 'S'
  const initial = name.charAt(0).toUpperCase()
  const logoUrl = tenant?.logo_url ?? null
  const logoBase64 = logoUrl ? await fetchImageAsBase64(logoUrl) : null
  const iconSize = Math.round(size * 0.7)

  return new ImageResponse(
    logoBase64
      ? React.createElement(
          'div',
          {
            style: {
              width: size,
              height: size,
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          React.createElement('img', {
            src: logoBase64,
            alt: name,
            width: iconSize,
            height: iconSize,
            style: { objectFit: 'contain' },
          }),
        )
      : React.createElement(
          'div',
          {
            style: {
              width: size,
              height: size,
              background: bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
          React.createElement(
            'span',
            {
              style: {
                fontSize: Math.round(size * 0.48),
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1,
              },
            },
            initial,
          ),
        ),
    {
      width: size,
      height: size,
    },
  )
}
