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

  useEffect(() => {
    // Close mobile menu whenever pathname changes
    setMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setMenuOpen(false)
    window.location.href = '/'
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-inner">
          <Link href="/" className="navbar-logo" onClick={() => setMenuOpen(false)}>
            <Building2 size={24} />
            Biz<span>Hub</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="navbar-nav navbar-desktop">
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
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
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

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className="navbar-burger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Menu */}
      {menuOpen && (
        <div className="navbar-mobile-overlay" onClick={() => setMenuOpen(false)}>
          <div className="navbar-mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="navbar-mobile-links">
              <Link
                href="/businesses"
                className={`navbar-mobile-link ${isActive('/businesses') ? 'active' : ''}`}
                onClick={() => setMenuOpen(false)}
              >
                <Building2 size={18} />
                <span>Explore Businesses</span>
              </Link>

              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className={`navbar-mobile-link ${isActive('/dashboard') ? 'active' : ''}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <LayoutDashboard size={18} />
                    <span>Dashboard</span>
                  </Link>

                  <div className="navbar-mobile-divider" />

                  <div className="navbar-mobile-user">
                    <span className="navbar-mobile-email">{user.email}</span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="btn btn-secondary w-full"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <LogOut size={16} />
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <div className="navbar-mobile-divider" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <Link
                      href="/auth/login"
                      className="btn btn-secondary w-full"
                      onClick={() => setMenuOpen(false)}
                    >
                      Log in
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="btn btn-primary w-full"
                      onClick={() => setMenuOpen(false)}
                    >
                      Get started
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
