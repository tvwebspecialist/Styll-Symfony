import React from 'react'
import { useStaff } from '../../hooks/useStaff'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { PageSpinner } from '../../components/ui/Spinner'
import { EmptyState } from '../../components/ui/EmptyState'
import { UserPlus } from 'lucide-react'

const roleLabel: Record<string, string> = {
  owner: 'Titolare',
  manager: 'Manager',
  staff: 'Barbiere',
  receptionist: 'Receptionist',
}

const Staff: React.FC = () => {
  const { staff, isLoading, toggleActive } = useStaff()

  if (isLoading) return <PageSpinner />

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Team</h1>
        <Button size="sm" leftIcon={<UserPlus className="w-4 h-4" />}>
          Invita membro
        </Button>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Nessun membro del team"
          message="Aggiungi i collaboratori del tuo salone"
        />
      ) : (
        <div className="space-y-2">
          {staff.map(member => {
            const profile = (member as unknown as { profiles?: { full_name: string; avatar_url: string | null; phone: string | null } }).profiles

            return (
              <Card key={member.id}>
                <div className="flex items-center gap-3">
                  <Avatar
                    name={profile?.full_name ?? 'Staff'}
                    src={profile?.avatar_url}
                    size="md"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">
                        {profile?.full_name ?? 'Staff'}
                      </p>
                      <Badge variant={member.is_active ? 'success' : 'default'}>
                        {member.is_active ? 'Attivo' : 'Sospeso'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="info" size="sm">
                        {roleLabel[member.role] ?? member.role}
                      </Badge>
                      {profile?.phone && (
                        <span className="text-xs text-gray-500">{profile.phone}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(member.id, !member.is_active)}
                  >
                    {member.is_active ? 'Sospendi' : 'Attiva'}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Staff
