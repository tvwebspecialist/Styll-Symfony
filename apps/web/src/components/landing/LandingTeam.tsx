import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { PublicTeamMember } from '@/lib/actions/public-booking'

interface Props {
  team: PublicTeamMember[]
  slug: string
}

function formatRole(role: string): string {
  switch (role) {
    case 'owner': return 'Titolare'
    case 'manager': return 'Manager'
    case 'staff': return 'Barbiere'
    case 'receptionist': return 'Receptionist'
    default: return role
  }
}

function getInitials(fullName: string | null | undefined): string {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

interface MemberCardProps {
  member: PublicTeamMember
  slug: string
  index: number
}

function MemberCard({ member, slug, index }: MemberCardProps) {
  const initials = getInitials(member.full_name)
  const hasPhoto = Boolean(member.photo_url)
  const firstName = member.full_name?.split(' ')[0] ?? null
  const bookingUrl = `https://${slug}-app.styll.it/prenota?barbiere=${member.id}`

  return (
    <article
      className="lp-team-card"
      data-reveal
      data-reveal-delay={String(index * 80)}
      style={{
        position: 'relative',
        borderRadius: 24,
        overflow: 'hidden',
        aspectRatio: '3/4',
        background: '#1E1E1E',
        cursor: 'pointer',
      } as CSSProperties}
    >
      {/* Background: photo or initials placeholder */}
      {hasPhoto && member.photo_url ? (
        <Image
          fill
          src={member.photo_url}
          alt={member.full_name ?? 'Membro del team'}
          className="lp-team-photo object-cover object-top"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
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
            background: '#1E1E1E',
          }}
        >
          <span
            style={{
              fontSize: '5rem',
              fontWeight: 900,
              color: 'var(--brand-primary)',
              opacity: 0.45,
              userSelect: 'none',
              letterSpacing: '-0.04em',
            }}
          >
            {initials}
          </span>
        </div>
      )}

      {/* Gradient overlay — bottom half */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.45) 40%, transparent 65%)',
        }}
        aria-hidden="true"
      />

      {/* Text + CTA overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '0 20px 22px',
        }}
      >
        <p
          style={{
            fontSize: '1.05rem',
            fontWeight: 700,
            color: '#FFFFFF',
            lineHeight: 1.25,
            marginBottom: 3,
          }}
        >
          {member.full_name ?? 'Barbiere'}
        </p>

        <p
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            color: 'var(--brand-primary)',
            marginBottom: member.bio ? 8 : 14,
          }}
        >
          {formatRole(member.role)}
        </p>

        {member.bio && (
          <p
            style={{
              fontSize: '0.78rem',
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.58)',
              marginBottom: 14,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            } as CSSProperties}
          >
            {member.bio}
          </p>
        )}

        <Link
          href={bookingUrl}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.8rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none',
            transition: 'color 0.2s',
          } as CSSProperties}
          className="hover:!text-white"
        >
          {firstName ? `Prenota con ${firstName}` : 'Prenota'}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </article>
  )
}

export default function LandingTeam({ team, slug }: Props) {
  if (team.length === 0) return null

  return (
    <section
      aria-label="Il nostro team"
      style={{
        background: '#0F0F0F',
        padding: 'clamp(5rem, 10vw, 8rem) 0',
      } as CSSProperties}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        {/* Header */}
        <div
          data-reveal
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 20,
            marginBottom: 'clamp(2.5rem, 5vw, 4rem)',
          }}
        >
          <div>
            <span
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.22em',
                color: 'var(--brand-primary)',
                marginBottom: 16,
              }}
            >
              Il team
            </span>
            <h2
              style={{
                fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
                fontWeight: 800,
                color: '#FFFFFF',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
              }}
            >
              Chi ti servirà
            </h2>
          </div>

          <Link
            href={`https://${slug}-app.styll.it/prenota`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 999,
              padding: '11px 22px',
              fontSize: 13,
              fontWeight: 700,
              color: '#FFFFFF',
              textDecoration: 'none',
              border: '1.5px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              whiteSpace: 'nowrap',
            } as CSSProperties}
          >
            Prenota ora
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Team grid — 3 cols desktop, 2 tablet, 1 mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((member, index) => (
            <MemberCard key={member.id} member={member} slug={slug} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
