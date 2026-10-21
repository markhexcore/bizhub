'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, Eye, EyeOff } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl || supabaseUrl.includes('your-project-ref')) {
      setError('Supabase credentials are not configured yet! Please update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file with your actual Supabase project keys.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        if (error.message.toLowerCase().includes('rate limit')) {
          setError('Supabase default email rate limit reached (free tier allows ~3-4 emails/hour). To fix this instantly, disable "Confirm email" in your Supabase Dashboard: Authentication -> Providers -> Email -> toggle OFF "Confirm email".')
        } else if (error.message.toLowerCase().includes('failed to fetch')) {
          setError('Could not connect to Supabase ("Failed to fetch"). Please verify your NEXT_PUBLIC_SUPABASE_URL and network connection.')
        } else {
          setError(error.message)
        }
      } else if (data?.session) {
        // Email confirmation is disabled; user is immediately authenticated
        router.push('/dashboard')
        router.refresh()
      } else {
        setSuccess(true)
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

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🎉</div>
          <h1 className="auth-title">Check your email!</h1>
          <p className="auth-subtitle" style={{ marginBottom: 0 }}>
            We've sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account and start registering your business.
          </p>
          <Link href="/auth/login" className="btn btn-primary" style={{ marginTop: '32px', width: '100%' }}>
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <Building2 size={24} />
          BizHub
        </div>

        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join BizHub and register your business</p>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '24px' }}>
            {error}
          </div>
        )}

        <form className="auth-form" onSubmit={handleSignup}>
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
                placeholder="At least 8 characters"
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

          <div className="form-group">
            <label className="form-label" htmlFor="confirm-password">Confirm password</label>
            <input
              id="confirm-password"
              className="form-input"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
            />
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
                Creating account...
              </span>
            ) : 'Create free account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link href="/auth/login">Sign in</Link>
        </div>
      </div>
    </div>
  )
}
