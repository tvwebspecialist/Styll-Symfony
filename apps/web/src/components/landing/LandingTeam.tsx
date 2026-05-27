'use client'

import AnimatedSection from '@/components/landing/AnimatedSection'
import AnimatedList from '@/components/landing/AnimatedList'
import TeamCard from '@/components/landing/TeamCard'
import type { LandingStaffMember } from '@/types/landing'

interface Props {
  staff: LandingStaffMember[]
  teamDescription: string | null
  googleRating: number | null
}

export default function LandingTeam({ staff, teamDescription, googleRating }: Props) {
  if (staff.length <= 1) return null

  return (
    <section id="team" aria-label="Il nostro team" className="w-full bg-white py-12 lg:py-20">
      <div className="w-full max-w-[1100px] mx-auto px-5">

        {/* Header */}
        <AnimatedSection direction="up">
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2
              style={{
                fontSize: 'clamp(32px, 4vw, 48px)',
                fontWeight: 800,
                color: '#0A0A0A',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              Il nostro Team
            </h2>
            {teamDescription && (
              <p
                style={{
                  fontSize: 16,
                  color: 'rgba(0, 0, 0, 0.5)',
                  marginTop: 8,
                  marginBottom: 0,
                  lineHeight: 1.5,
                }}
              >
                {teamDescription}
              </p>
            )}
          </div>
        </AnimatedSection>

        {/* Cards grid */}
        <AnimatedList
          staggerDelay={0.1}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 lg:gap-6"
        >
          {staff.map((member) => (
            <TeamCard key={member.id} member={member} googleRating={googleRating} />
          ))}
        </AnimatedList>
      </div>
    </section>
  )
}

