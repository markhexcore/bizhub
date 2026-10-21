'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Building2, MapPin, Search, Plus, ChevronRight } from 'lucide-react'
import type { Business, BusinessCategory } from '@/lib/types'

const CATEGORIES: { label: string; value: BusinessCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Retail', value: 'retail' },
  { label: 'Food & Beverage', value: 'food_beverage' },
  { label: 'Services', value: 'services' },
  { label: 'Technology', value: 'technology' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Education', value: 'education' },
  { label: 'Finance', value: 'finance' },
  { label: 'Other', value: 'other' },
]

const CATEGORY_COLORS: Record<string, string> = {
  retail: '#F59E0B',
  food_beverage: '#10B981',
  services: '#8B5CF6',
  technology: '#3B82F6',
  healthcare: '#EF4444',
  education: '#6366F1',
  manufacturing: '#6B7280',
  real_estate: '#D97706',
  finance: '#059669',
  other: '#9CA3AF',
}

export default function BusinessesPage() {
  const supabase = createClient()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [filtered, setFiltered] = useState<Business[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchBusinesses = async () => {
      const { data } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false })
      setBusinesses(data || [])
      setFiltered(data || [])
      setLoading(false)
    }
    fetchBusinesses()
  }, [])

  useEffect(() => {
    let result = businesses
    if (category !== 'all') {
      result = result.filter(b => b.category === category)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        b =>
          b.name.toLowerCase().includes(q) ||
          b.description?.toLowerCase().includes(q) ||
          b.city?.toLowerCase().includes(q)
      )
    }
    setFiltered(result)
  }, [search, category, businesses])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      {/* Page Header */}
      <div style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-border)',
        padding: '40px 0 24px'
      }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h1 className="page-title">Business Hub</h1>
              <p className="page-subtitle">
                Discover and connect with registered businesses
              </p>
            </div>
            <Link href="/dashboard/businesses/new" className="btn btn-primary">
              <Plus size={16} />
              Register Business
            </Link>
          </div>

          {/* Search + Filters */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-bar">
              <div className="search-bar-icon">
                <Search size={16} />
              </div>
              <input
                type="search"
                placeholder="Search businesses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className="btn btn-sm"
                  style={{
                    background: category === c.value ? 'var(--color-primary)' : 'var(--color-white)',
                    color: category === c.value ? 'white' : 'var(--color-gray-600)',
                    border: `1px solid ${category === c.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Business Grid */}
      <div className="container" style={{ padding: '32px var(--space-6)' }}>
        {loading ? (
          <div className="loading-page">
            <div className="spinner" style={{ width: '36px', height: '36px' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🏢</div>
            <h3>No businesses found</h3>
            <p>Try a different search or category.</p>
            <Link href="/dashboard/businesses/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
              <Plus size={16} />
              Be the first to register
            </Link>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', marginBottom: '20px' }}>
              Showing <strong>{filtered.length}</strong> business{filtered.length !== 1 ? 'es' : ''}
            </p>
            <div className="businesses-grid">
              {filtered.map(business => (
                <Link key={business.id} href={`/businesses/${business.slug}`} style={{ textDecoration: 'none' }}>
                  <div className="business-card">
                    <div className="business-card-cover">
                      {business.cover_url ? (
                        <img src={business.cover_url} alt={`${business.name} cover`} />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: `linear-gradient(135deg, ${CATEGORY_COLORS[business.category] || '#3B82F6'}22, ${CATEGORY_COLORS[business.category] || '#3B82F6'}44)`,
                        }} />
                      )}
                    </div>
                    <div className="business-card-body">
                      <div className="business-card-logo">
                        {business.logo_url ? (
                          <img src={business.logo_url} alt={`${business.name} logo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          business.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="business-card-name">{business.name}</div>
                      <p className="business-card-desc">
                        {business.description || 'No description provided.'}
                      </p>
                      <div className="business-card-footer">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className="badge"
                            style={{
                              background: `${CATEGORY_COLORS[business.category] || '#9CA3AF'}22`,
                              color: CATEGORY_COLORS[business.category] || '#9CA3AF',
                            }}
                          >
                            {business.category.replace('_', ' ')}
                          </span>
                          {business.city && (
                            <span style={{ fontSize: '12px', color: 'var(--color-gray-400)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <MapPin size={11} />
                              {business.city}
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          View & Order <ChevronRight size={14} />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
