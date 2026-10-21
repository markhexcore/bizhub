'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl.includes('your-project-ref')) {
      setError('Supabase credentials are not configured yet! Please update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file with your actual Supabase project keys.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.toLowerCase().includes('failed to fetch')) {
          setError('Could not connect to Supabase ("Failed to fetch"). Please verify your NEXT_PUBLIC_SUPABASE_URL and network connection.')
        } else {
          setError(error.message)
        }
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.toLowerCase().includes('failed to fetch')) {
        setError('Could not connect to Supabase ("Failed to fetch"). Please verify that NEXT_PUBLIC_SUPABASE_URL in .env.local is valid and reachable.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Building2 size={24} />
          BizHub
        </div>

        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to manage your business</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                className="form-input"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={{ paddingRight: '44px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--color-gray-400)',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ padding: '14px', fontSize: '15px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '18px', height: '18px' }} />
                Signing in...
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          Don't have an account?{' '}
          <Link href="/auth/signup">Create one free</Link>
        </div>
      </div>
    </div>
  )
}
