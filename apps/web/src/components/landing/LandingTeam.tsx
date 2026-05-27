'use client'

import Image from 'next/image'
import AnimatedSection from '@/components/landing/AnimatedSection'
import AnimatedList from '@/components/landing/AnimatedList'
import type { LandingStaffMember } from '@/types/landing'

interface Props {
  staff: LandingStaffMember[]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

function MemberCard({ member }: { member: LandingStaffMember }) {
  const initials = getInitials(member.full_name)

  return (
    <article className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: '3/4' }}>
      {/* Image or initials */}
      {member.photo_url ? (
        <Image
          fill
          src={member.photo_url}
          alt={member.full_name}
          className="object-cover object-top"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center font-black text-white select-none"
          style={{ background: 'var(--brand-primary)', fontSize: '3rem' }}
          aria-label={member.full_name}
        >
          {initials}
        </div>
      )}

      {/* Gradient overlay at bottom */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.2) 45%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      {/* Name + role */}
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <p className="font-black text-white text-lg leading-tight">{member.full_name}</p>
      </div>
    </article>
  )
}

export default function LandingTeam({ staff }: Props) {
  if (staff.length <= 1) return null

  return (
    <section id="team" aria-label="Il nostro team" className="w-full bg-white py-20 sm:py-24">
      <div className="w-full max-w-[1120px] mx-auto px-5">

        {/* Header */}
        <AnimatedSection direction="up" className="mb-12 text-center">
          <h2
            className="font-black text-[#111] mb-3"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', letterSpacing: '-0.02em' }}
          >
            Il nostro Team
          </h2>
          <p className="text-[#888] text-base">Chi ti servirà con passione e competenza</p>
        </AnimatedSection>

        {/* Cards */}
        <AnimatedList
          staggerDelay={0.08}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {staff.map((member) => (
            <MemberCard key={member.id} member={member} />
          ))}
        </AnimatedList>
      </div>
    </section>
  )
}
