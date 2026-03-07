'use client'

import { LogOut } from 'lucide-react'
import { useState } from 'react'
import { logout } from '@/app/admin/login/actions'

export default function LogoutButton() {
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await logout()
  }

  return (
    <button 
      onClick={handleLogout}
      disabled={loading}
      className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 font-medium rounded-md transition-colors disabled:opacity-50"
    >
      <LogOut className="w-5 h-5 mr-3" />
      {loading ? 'Saliendo...' : 'Cerrar sesión'}
    </button>
  )
}
