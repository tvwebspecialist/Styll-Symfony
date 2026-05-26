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

interface MemberCardProps {
  member: PublicTeamMember
  slug: string
  index: number
}

function MemberCard({ member, slug, index }: MemberCardProps) {
  const initial = (member.full_name ?? '?')[0]?.toUpperCase() ?? '?'
  const hasPhoto = Boolean(member.photo_url)

  return (
    <article
      className="lp-team-card"
      data-reveal
      data-reveal-delay={String(index * 80)}
      style={{ display: 'flex', flexDirection: 'column' } as CSSProperties}
    >
      {/* Photo container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: 24,
          overflow: 'hidden',
          aspectRatio: '3/4',
          background: '#1E1E1E',
          marginBottom: 16,
        }}
      >
        {hasPhoto && member.photo_url ? (
          <>
            <Image
              fill
              src={member.photo_url}
              alt={member.full_name ?? 'Membro del team'}
              className="lp-team-photo object-cover object-top"
              sizes="(max-width: 768px) 50vw, 280px"
              loading="lazy"
            />
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)',
              }}
            />
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              height: '100%',
              width: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1E1E1E',
            }}
          >
            <span
              style={{
                fontSize: '4rem',
                fontWeight: 900,
                color: 'var(--brand-primary)',
                opacity: 0.7,
                userSelect: 'none',
              }}
            >
              {initial}
            </span>
          </div>
        )}

        {/* Name overlay (on photo) */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 20px',
          }}
        >
          <p
            style={{
              fontSize: '1rem',
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.25,
            }}
          >
            {member.full_name ?? 'Barbiere'}
          </p>
          <p
            style={{
              marginTop: 3,
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: 'var(--brand-primary)',
            }}
          >
            {formatRole(member.role)}
          </p>
        </div>
      </div>

      {/* Bio */}
      {member.bio && (
        <p
          style={{
            fontSize: '0.82rem',
            lineHeight: 1.65,
            color: 'rgba(255,255,255,0.5)',
            marginBottom: 12,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          } as CSSProperties}
        >
          {member.bio}
        </p>
      )}

      {/* Prenota link */}
      <Link
        href={`/tenant/app/${slug}/prenota?barbiere=${member.id}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'rgba(255,255,255,0.45)',
          textDecoration: 'none',
          transition: 'color 0.2s',
          marginTop: 'auto',
        } as CSSProperties}
        className="hover:!text-white"
      >
        Prenota con lui
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
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
            href={`/tenant/app/${slug}/prenota`}
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

        {/* Team grid — horizontal scroll on mobile, grid on desktop */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fill, minmax(${team.length <= 2 ? '280px' : '200px'}, 1fr))`,
            gap: 20,
          }}
          className="[&]:max-sm:flex [&]:max-sm:gap-5 [&]:max-sm:overflow-x-auto [&]:max-sm:pb-4 [&]:max-sm:[scrollbar-width:none]"
        >
          {team.map((member, index) => (
            <MemberCard key={member.id} member={member} slug={slug} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
