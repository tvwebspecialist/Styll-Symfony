// GLASS OVERLAY STANDARD v2 applicato — stessa implementazione di BookingStep1Locations
'use client'

import * as React from 'react'
import Image from 'next/image'
import type { LandingStaffMember } from '@/types/landing'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

interface Props {
  member: LandingStaffMember
  googleRating: number | null
}

export default function TeamCard({ member, googleRating }: Props) {
  const [hovered, setHovered] = React.useState(false)
  const initials = getInitials(member.full_name)

  return (
    <article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        aspectRatio: '3 / 4',
        cursor: 'default',
        boxShadow: hovered
          ? '0 16px 48px rgba(0, 0, 0, 0.20)'
          : '0 8px 32px rgba(0, 0, 0, 0.12)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        willChange: 'transform',
      }}
    >
      {/* Photo or initials placeholder */}
      {member.photo_url ? (
        <Image
          fill
          src={member.photo_url}
          alt={member.full_name}
          style={{ objectFit: 'cover', objectPosition: 'center top' }}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1A1A1A',
            fontSize: 32,
            fontWeight: 800,
            color: '#FFFFFF',
            userSelect: 'none',
          }}
          aria-label={member.full_name}
        >
          {initials}
        </div>
      )}

      {/* Layer 1 — gradient lungo e morbido */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.45) 28%, rgba(0,0,0,0.10) 55%, rgba(0,0,0,0) 75%)',
          borderRadius: 'inherit',
        }}
      />

      {/* Layer 2 — blur leggero con dissolvenza graduale */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '50%',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          maskImage: 'linear-gradient(to top, black 30%, rgba(0,0,0,0.4) 65%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 30%, rgba(0,0,0,0.4) 65%, transparent 100%)',
          borderRadius: 'inherit',
        }}
      />

      {/* Name + role + rating */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '20px 20px 24px 20px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.2,
            letterSpacing: '-0.3px',
          }}
        >
          {member.full_name}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 6,
          }}
        >
          {member.role && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.75)',
              }}
            >
              {member.role}
            </span>
          )}
          {googleRating !== null && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              ⭐ {googleRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
