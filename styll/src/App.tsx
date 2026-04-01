import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { TenantProvider } from './contexts/TenantContext'
import { UIProvider } from './contexts/UIContext'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { AdminLayout } from './components/layout/AdminLayout'
import { ClientLayout } from './components/layout/ClientLayout'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { PageSpinner } from './components/ui/Spinner'

const Login = lazy(() => import('./pages/auth/Login'))
const Register = lazy(() => import('./pages/auth/Register'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome'))
const Calendar = lazy(() => import('./pages/dashboard/Calendar'))
const Clients = lazy(() => import('./pages/dashboard/Clients'))
const ClientDetail = lazy(() => import('./pages/dashboard/ClientDetail'))
const Services = lazy(() => import('./pages/dashboard/Services'))
const Products = lazy(() => import('./pages/dashboard/Products'))
const Loyalty = lazy(() => import('./pages/dashboard/Loyalty'))
const Messages = lazy(() => import('./pages/dashboard/Messages'))
const Analytics = lazy(() => import('./pages/dashboard/Analytics'))
const Staff = lazy(() => import('./pages/dashboard/Staff'))
const Settings = lazy(() => import('./pages/dashboard/Settings'))
const Promote = lazy(() => import('./pages/dashboard/Promote'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const TenantsList = lazy(() => import('./pages/admin/TenantsList'))
const TenantDetail = lazy(() => import('./pages/admin/TenantDetail'))
const PlatformAnalytics = lazy(() => import('./pages/admin/PlatformAnalytics'))
const Landing = lazy(() => import('./pages/client/Landing'))
const Booking = lazy(() => import('./pages/client/Booking'))
const MyBookings = lazy(() => import('./pages/client/MyBookings'))
const LoyaltyProfile = lazy(() => import('./pages/client/LoyaltyProfile'))
const Profile = lazy(() => import('./pages/client/Profile'))
const RewardStore = lazy(() => import('./pages/client/RewardStore'))

const ClientLayoutWrapper: React.FC = () => {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  return <ClientLayout tenantSlug={tenantSlug} />
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <UIProvider>
          <AuthProvider>
            <TenantProvider>
              <Suspense fallback={<PageSpinner />}>
                <Routes>
                  <Route path="/auth/login" element={<Login />} />
                  <Route path="/auth/register" element={<Register />} />
                  <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                  <Route path="/admin" element={<ProtectedRoute requiredUserType="admin"><AdminLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="tenants" element={<TenantsList />} />
                    <Route path="tenants/:id" element={<TenantDetail />} />
                    <Route path="analytics" element={<PlatformAnalytics />} />
                  </Route>
                  <Route path="/dashboard" element={<ProtectedRoute requiredUserType="staff"><DashboardLayout /></ProtectedRoute>}>
                    <Route index element={<Navigate to="/dashboard/home" replace />} />
                    <Route path="home" element={<DashboardHome />} />
                    <Route path="calendar" element={<Calendar />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="clients/:id" element={<ClientDetail />} />
                    <Route path="services" element={<Services />} />
                    <Route path="products" element={<Products />} />
                    <Route path="loyalty" element={<Loyalty />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="staff" element={<Staff />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="promote" element={<Promote />} />
                  </Route>
                  <Route path="/:tenantSlug" element={<ClientLayoutWrapper />}>
                    <Route index element={<Landing />} />
                    <Route path="booking" element={<Booking />} />
                    <Route path="bookings" element={<MyBookings />} />
                    <Route path="loyalty" element={<LoyaltyProfile />} />
                    <Route path="profile" element={<Profile />} />
                    <Route path="rewards" element={<RewardStore />} />
                  </Route>
                  <Route path="/" element={<Navigate to="/auth/login" replace />} />
                  <Route path="*" element={<Navigate to="/auth/login" replace />} />
                </Routes>
              </Suspense>
            </TenantProvider>
          </AuthProvider>
        </UIProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
