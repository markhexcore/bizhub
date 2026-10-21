'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Plus, Edit, Trash2, ExternalLink, Store } from 'lucide-react'
import type { Business } from '@/lib/types'
import { format } from 'date-fns'

export default function MyBusinessesPage() {
  const supabase = createClient()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchBusinesses = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    setBusinesses(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchBusinesses() }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) return
    setDeleting(id)
    await supabase.from('businesses').delete().eq('id', id)
    setBusinesses(prev => prev.filter(b => b.id !== id))
    setDeleting(null)
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" style={{ width: '36px', height: '36px' }} />
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Businesses</h1>
          <p className="page-subtitle">Manage all your registered businesses</p>
        </div>
        <Link href="/dashboard/businesses/new" className="btn btn-primary">
          <Plus size={16} />
          New Business
        </Link>
      </div>

      {businesses.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <h3>No businesses yet</h3>
              <p>Register your first business to appear in the BizHub directory.</p>
              <Link href="/dashboard/businesses/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
                <Plus size={16} />
                Register a business
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {businesses.map(business => (
            <div key={business.id} className="card">
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* Logo */}
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  background: 'var(--color-primary-50)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: 'var(--color-primary)',
                  overflow: 'hidden',
                  flexShrink: 0,
                  border: '1px solid var(--color-border)'
                }}>
                  {business.logo_url ? (
                    <img src={business.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Store size={24} />
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: '700', fontSize: 'var(--font-size-base)', color: 'var(--color-gray-900)' }}>
                      {business.name}
                    </span>
                    {business.is_verified && <span className="badge badge-success">✓ Verified</span>}
                    <span className="badge badge-primary">{business.category.replace('_', ' ')}</span>
                  </div>
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                    {business.description?.slice(0, 100) || 'No description'}
                    {(business.description?.length ?? 0) > 100 ? '...' : ''}
                  </p>
                  <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', marginTop: '4px' }}>
                    Registered {format(new Date(business.created_at), 'MMM d, yyyy')}
                  </p>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <Link
                    href={`/businesses/${business.slug}`}
                    target="_blank"
                    className="btn btn-secondary btn-sm"
                    title="View public profile"
                  >
                    <ExternalLink size={14} />
                  </Link>
                  <Link
                    href={`/dashboard/businesses/${business.id}/edit`}
                    className="btn btn-secondary btn-sm"
                    title="Edit business"
                  >
                    <Edit size={14} />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(business.id, business.name)}
                    disabled={deleting === business.id}
                    className="btn btn-danger btn-sm"
                    title="Delete business"
                  >
                    <Trash2 size={14} />
                    {deleting === business.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
