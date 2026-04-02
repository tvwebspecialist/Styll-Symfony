import React from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { Calendar } from 'lucide-react'

const MyBookings: React.FC = () => (
  <div className="px-4 py-6">
    <h1 className="text-xl font-bold text-gray-900 mb-4">I miei appuntamenti</h1>
    <EmptyState
      icon={<Calendar className="w-12 h-12" />}
      title="Nessun appuntamento"
      message="Le tue prenotazioni appariranno qui"
    />
  </div>
)

export default MyBookings
