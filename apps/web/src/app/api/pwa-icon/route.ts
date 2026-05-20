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

  return new ImageResponse(
    React.createElement(
      'div',
      {
        style: {
          width: size,
          height: size,
          background: bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: size * 0.22,
        },
      },
      logoUrl
        ? React.createElement('img', {
            src: logoUrl,
            alt: name,
            width: size * 0.65,
            height: size * 0.65,
            style: { objectFit: 'contain' },
          })
        : React.createElement(
            'span',
            {
              style: {
                fontSize: size * 0.45,
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
