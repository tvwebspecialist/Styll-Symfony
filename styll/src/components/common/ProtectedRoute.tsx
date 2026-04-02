import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { PageSpinner } from '../ui/Spinner'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
  requiredUserType?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
  requiredUserType,
}) => {
  const { isAuthenticated, isLoading, role, userType } = useAuth()
  const location = useLocation()

  if (isLoading) return <PageSpinner />

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  if (requiredUserType && userType !== requiredUserType) {
    return <Navigate to="/auth/login" replace />
  }

  if (requiredRoles && role && !requiredRoles.includes(role)) {
    return <Navigate to="/dashboard/home" replace />
  }

  return <>{children}</>
}
