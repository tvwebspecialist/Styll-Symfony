import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../../components/ui/Card'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'

const Profile: React.FC = () => {
  const { profile, signOut } = useAuth()

  return (
    <div className="px-4 py-6 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Profilo</h1>

      {profile ? (
        <Card>
          <div className="flex items-center gap-4">
            <Avatar name={profile.full_name} size="lg" />
            <div>
              <p className="font-bold text-gray-900">{profile.full_name}</p>
              <p className="text-sm text-gray-500">{profile.phone ?? 'Nessun telefono'}</p>
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-gray-500 text-sm">Effettua il login per vedere il tuo profilo</p>
        </Card>
      )}

      {profile && (
        <Button variant="outline" fullWidth onClick={signOut}>
          Esci
        </Button>
      )}
    </div>
  )
}

export default Profile
