import React from 'react'
import { useParams } from 'react-router-dom'

const TenantDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dettaglio Tenant</h1>
      <p className="text-gray-500 mt-2">ID: {id}</p>
    </div>
  )
}

export default TenantDetail
