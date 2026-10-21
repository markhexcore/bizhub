'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, ArrowLeft, Upload, Save, Check } from 'lucide-react'
import Link from 'next/link'
import type { Business, BusinessCategory } from '@/lib/types'

const CATEGORIES: { label: string; value: BusinessCategory }[] = [
  { label: 'Retail', value: 'retail' },
  { label: 'Food & Beverage', value: 'food_beverage' },
  { label: 'Services', value: 'services' },
  { label: 'Technology', value: 'technology' },
  { label: 'Healthcare', value: 'healthcare' },
  { label: 'Education', value: 'education' },
  { label: 'Manufacturing', value: 'manufacturing' },
  { label: 'Real Estate', value: 'real_estate' },
  { label: 'Finance', value: 'finance' },
  { label: 'Other', value: 'other' },
]

export default function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'other' as BusinessCategory,
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
  })

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null)
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  useEffect(() => {
    async function loadBusiness() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', resolvedParams.id)
        .eq('owner_id', user.id)
        .single()

      if (error || !data) {
        setError('Business not found or access denied.')
        setLoading(false)
        return
      }

      const b = data as Business
      setForm({
        name: b.name || '',
        description: b.description || '',
        category: b.category || 'other',
        address: b.address || '',
        city: b.city || '',
        country: b.country || '',
        phone: b.phone || '',
        email: b.email || '',
        website: b.website || '',
      })
      setCurrentLogoUrl(b.logo_url)
      setCurrentCoverUrl(b.cover_url)
      setLogoPreview(b.logo_url)
      setCoverPreview(b.cover_url)
      setLoading(false)
    }

    loadBusiness()
  }, [resolvedParams.id, router, supabase])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (type === 'logo') {
      setLogoFile(file)
      setLogoPreview(url)
    } else {
      setCoverFile(file)
      setCoverPreview(url)
    }
  }

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage.from('business-media').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('business-media').getPublicUrl(data.path)
    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Business name is required')
      return
    }

    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let logo_url = currentLogoUrl
      let cover_url = currentCoverUrl

      if (logoFile) {
        logo_url = await uploadFile(logoFile, `logos/${user.id}/${resolvedParams.id}-logo-${Date.now()}`)
      }
      if (coverFile) {
        cover_url = await uploadFile(coverFile, `covers/${user.id}/${resolvedParams.id}-cover-${Date.now()}`)
      }

      const { error: updateError } = await supabase
        .from('businesses')
        .update({
          ...form,
          logo_url,
          cover_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', resolvedParams.id)
        .eq('owner_id', user.id)

      if (updateError) throw updateError

      setSuccess(true)
      setTimeout(() => {
        router.push('/dashboard/businesses')
      }, 1200)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update business')
    } finally {
      setSaving(false)
    }
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
          <Link href="/dashboard/businesses" className="btn btn-secondary btn-sm" style={{ marginBottom: '12px' }}>
            <ArrowLeft size={14} />
            Back to businesses
          </Link>
          <h1 className="page-title">Edit Business</h1>
          <p className="page-subtitle">Update your profile, contact details, and brand imagery</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '24px' }}>
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={18} /> Business updated successfully! Redirecting...
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <div className="card-body">
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} /> Basic Information
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Business Name *</label>
                    <input
                      className="form-input"
                      type="text"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      value={form.description}
                      onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={form.category}
                      onChange={e => setForm(p => ({ ...p, category: e.target.value as BusinessCategory }))}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: '700', marginBottom: '20px' }}>
                  📍 Location & Contact
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input
                      className="form-input"
                      type="text"
                      value={form.address}
                      onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label className="form-label">City</label>
                      <input
                        className="form-input"
                        type="text"
                        value={form.city}
                        onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Country</label>
                      <input
                        className="form-input"
                        type="text"
                        value={form.country}
                        onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      className="form-input"
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      className="form-input"
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Website</label>
                    <input
                      className="form-input"
                      type="url"
                      value={form.website}
                      onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Media */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <div className="card-body">
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: '700', marginBottom: '20px' }}>
                  🖼️ Business Imagery
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Logo Upload */}
                  <div>
                    <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Logo</label>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border)',
                        background: 'var(--color-gray-100)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <Building2 size={28} color="var(--color-gray-400)" />
                        )}
                      </div>
                      <div>
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex' }}>
                          <Upload size={14} /> Change Logo
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, 'logo')} />
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginTop: '4px' }}>Square PNG or JPG recommended</p>
                      </div>
                    </div>
                  </div>

                  {/* Cover Upload */}
                  <div>
                    <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>Cover Banner</label>
                    <div style={{
                      height: '140px',
                      borderRadius: 'var(--radius-lg)',
                      border: '1px dashed var(--color-border)',
                      background: 'var(--color-gray-50)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      {coverPreview ? (
                        <img src={coverPreview} alt="Cover preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--color-gray-400)' }}>
                          <Upload size={24} style={{ margin: '0 auto 8px' }} />
                          <span style={{ fontSize: '13px' }}>Upload a cover banner</span>
                        </div>
                      )}
                      <label className="btn btn-secondary btn-sm" style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        background: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(4px)'
                      }}>
                        <Upload size={13} /> {coverPreview ? 'Change Banner' : 'Upload Banner'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFileChange(e, 'cover')} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <Link href="/dashboard/businesses" className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner" style={{ width: '16px', height: '16px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
