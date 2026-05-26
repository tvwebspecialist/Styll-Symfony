import Image from 'next/image'
import Link from 'next/link'
import type { PublicTeamMember } from '@/lib/actions/public-booking'

interface Props {
  team: PublicTeamMember[]
  slug: string
}

function formatRole(role: string): string {
  switch (role) {
    case 'owner':
      return 'Titolare'
    case 'manager':
      return 'Manager'
    case 'staff':
      return 'Barbiere'
    case 'receptionist':
      return 'Receptionist'
    default:
      return role
  }
}

interface MemberCardProps {
  member: PublicTeamMember
  slug: string
}

function MemberCard({ member, slug }: MemberCardProps) {
  const initial = (member.full_name ?? '?')[0]?.toUpperCase() ?? '?'
  const hasPhoto = Boolean(member.photo_url)

  return (
    <article className="group w-[220px] shrink-0 md:w-auto" style={{ scrollSnapAlign: 'start' }}>
      <div className="relative mb-4 w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '3/4', background: '#F9FAFB' }}>
        {member.photo_url ? (
          <>
            <Image
              fill
              src={member.photo_url}
              alt={member.full_name ?? 'Membro del team'}
              className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 768px) 220px, 280px"
              loading="lazy"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 50%)' }}
            />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ background: '#F3F4F6' }}>
            <span className="select-none text-[4rem] font-black" style={{ color: '#111111', opacity: 0.75 }}>
              {initial}
            </span>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <p className="font-bold leading-tight" style={{ fontSize: '1.05rem', color: hasPhoto ? '#FFFFFF' : '#111111' }}>
            {member.full_name ?? 'Barbiere'}
          </p>
          <p className="mt-0.5 text-[0.75rem]" style={{ color: hasPhoto ? 'rgba(255,255,255,0.75)' : 'var(--brand-primary)' }}>
            {formatRole(member.role)}
          </p>
        </div>
      </div>

      {member.bio && (
        <p className="line-clamp-2 px-1 text-[0.8rem]" style={{ color: '#6B7280' }}>
          {member.bio}
        </p>
      )}

      <Link
        href={`/tenant/app/${slug}/prenota?barbiere=${member.id}`}
        className="mt-3 flex items-center gap-1.5 text-[0.8rem] font-semibold opacity-70 transition-opacity group-hover:opacity-100"
        style={{ color: 'var(--brand-primary)' }}
      >
        Prenota con lui
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
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
      className="py-[clamp(4rem,8vw,7rem)]"
      style={{ background: '#FFFFFF' }}
    >
      <div className="mx-auto max-w-5xl px-5 sm:px-8">
        <div className="mb-10">
          <span
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: 'var(--brand-primary)' }}
          >
            Il team
          </span>
          <h2
            className="mt-2 font-bold tracking-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', color: '#111111' }}
          >
            Chi ti servirà
          </h2>
        </div>

        <div
          className="flex gap-6 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:overflow-visible md:pb-0"
          style={{
            scrollSnapType: 'x mandatory',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          }}
        >
          {team.map((member) => (
            <MemberCard key={member.id} member={member} slug={slug} />
          ))}
        </div>
      </div>
    </section>
  )
}
