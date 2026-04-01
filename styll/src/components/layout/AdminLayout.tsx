import React from 'react'
import { Outlet } from 'react-router-dom'
import { useTenant } from '../../hooks/useTenant'
import { ToastContainer } from '../ui/Toast'

export const AdminLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white h-16 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-gray-900 font-bold text-sm">S</span>
          </div>
          <div>
            <p className="font-bold text-sm">Styll Admin</p>
            <p className="text-xs text-gray-400">Pannello di controllo piattaforma</p>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">
        <Outlet />
      </main>
      <ToastContainer />
    </div>
  )
}
