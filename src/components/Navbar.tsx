'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, LayoutDashboard, LogOut, Menu, X } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    window.location.href = '/'
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-inner">
          <Link href="/" className="navbar-logo">
            <Building2 size={24} />
            Biz<span>Hub</span>
          </Link>

          <div className="navbar-nav" style={{ gap: '8px' }}>
            <Link
              href="/businesses"
              className={`navbar-link ${isActive('/businesses') ? 'active' : ''}`}
            >
              Explore
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className={`navbar-link ${isActive('/dashboard') ? 'active' : ''}`}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <LayoutDashboard size={15} />
                  Dashboard
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/login" className="navbar-link">
                  Log in
                </Link>
                <Link href="/auth/signup" className="btn btn-primary btn-sm">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
