import type { CSSProperties } from 'react'
import Image from 'next/image'
import type { PublicTeamMember } from '@/lib/actions/public-booking'

interface Props {
  team: PublicTeamMember[]
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
  index: number
}

function MemberCard({ member, index }: MemberCardProps) {
  const initials = getInitials(member.full_name)
  const hasPhoto = Boolean(member.photo_url)

  return (
    <article
      data-reveal
      data-reveal-delay={String(index * 80)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: '28px 24px 32px',
        background: '#FFFFFF',
        borderRadius: 24,
        border: '1px solid #F0F0F0',
        boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
      } as CSSProperties}
      className="lp-team-card"
    >
      {/* Photo */}
      <div
        style={{
          position: 'relative',
          width: 100,
          height: 100,
          borderRadius: '50%',
          overflow: 'hidden',
          marginBottom: 16,
          flexShrink: 0,
          background: '#F5F5F5',
        }}
      >
        {hasPhoto && member.photo_url ? (
          <Image
            fill
            src={member.photo_url}
            alt={member.full_name ?? 'Membro del team'}
            className="object-cover object-top"
            sizes="100px"
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
              background: 'var(--brand-primary)',
            }}
          >
            <span
              style={{
                fontSize: '2rem',
                fontWeight: 900,
                color: '#FFFFFF',
                letterSpacing: '-0.04em',
                userSelect: 'none',
              }}
            >
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <p
        style={{
          fontSize: '1.05rem',
          fontWeight: 800,
          color: '#111111',
          lineHeight: 1.25,
          marginBottom: 4,
          letterSpacing: '-0.01em',
        }}
      >
        {member.full_name ?? 'Barbiere'}
      </p>

      {/* Role */}
      <p
        style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          color: 'var(--brand-primary)',
          marginBottom: member.bio ? 12 : 0,
        }}
      >
        {formatRole(member.role)}
      </p>

      {/* Bio */}
      {member.bio && (
        <p
          style={{
            fontSize: '0.82rem',
            lineHeight: 1.6,
            color: '#888888',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          } as CSSProperties}
        >
          {member.bio}
        </p>
      )}
    </article>
  )
}

export default function LandingTeam({ team }: Props) {
  if (team.length <= 1) return null

  return (
    <section
      id="team"
      aria-label="Il nostro team"
      data-reveal
      style={{
        background: '#FFFFFF',
        padding: 'clamp(5rem, 10vw, 8rem) 0',
      } as CSSProperties}
    >
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(20px, 5vw, 48px)' }}>
        {/* Header */}
        <div style={{ marginBottom: 'clamp(2.5rem, 5vw, 4rem)', textAlign: 'center' }}>
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              color: 'var(--brand-primary)',
              marginBottom: 14,
            }}
          >
            Il team
          </span>
          <h2
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
              fontWeight: 800,
              color: '#111111',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
          >
            Chi ti servirà
          </h2>
        </div>

        {/* Team grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {team.map((member, index) => (
            <MemberCard key={member.id} member={member} index={index} />
          ))}
        </div>
      </div>
    </section>
  )
}
