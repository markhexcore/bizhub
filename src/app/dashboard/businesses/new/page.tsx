'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Building2, ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'
import type { BusinessCategory } from '@/lib/types'

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

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function NewBusinessPage() {
  const router = useRouter()
  const supabase = createClient()

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

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    if (type === 'logo') { setLogoFile(file); setLogoPreview(url) }
    else { setCoverFile(file); setCoverPreview(url) }
  }

  const uploadFile = async (file: File, path: string) => {
    const { data, error } = await supabase.storage.from('business-media').upload(path, file, { upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from('business-media').getPublicUrl(data.path)
    return publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Business name is required'); return }
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let logo_url = null
      let cover_url = null
      const slug = slugify(form.name) + '-' + Date.now()

      if (logoFile) {
        logo_url = await uploadFile(logoFile, `logos/${user.id}/${slug}-logo`)
      }
      if (coverFile) {
        cover_url = await uploadFile(coverFile, `covers/${user.id}/${slug}-cover`)
      }

      const { error: insertError } = await supabase.from('businesses').insert({
        owner_id: user.id,
        slug,
        logo_url,
        cover_url,
        ...form,
      })

      if (insertError) throw insertError

      router.push('/dashboard/businesses')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <Link href="/dashboard/businesses" className="btn btn-secondary btn-sm" style={{ marginBottom: '12px' }}>
            <ArrowLeft size={14} />
            Back to businesses
          </Link>
          <h1 className="page-title">Register a Business</h1>
          <p className="page-subtitle">Fill in your business details to appear in the hub</p>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '24px' }}>
          {error}
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
                      placeholder="e.g. Acme Store"
                      value={form.name}
                      onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-textarea"
                      placeholder="Tell people what your business does..."
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
                      placeholder="123 Main Street"
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
                        placeholder="New York"
                        value={form.city}
                        onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Country</label>
                      <input
                        className="form-input"
                        type="text"
                        placeholder="USA"
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
                      placeholder="+1 234 567 8900"
                      value={form.phone}
                      onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      className="form-input"
                      type="email"
                      placeholder="hello@mybusiness.com"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Website</label>
                    <input
                      className="form-input"
                      type="url"
                      placeholder="https://mybusiness.com"
                      value={form.website}
                      onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card">
              <div className="card-body">
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: '700', marginBottom: '20px' }}>
                  🖼️ Branding
                </h2>

                {/* Logo */}
                <div className="form-group" style={{ marginBottom: '20px' }}>
                  <label className="form-label">Logo</label>
                  <div
                    style={{
                      border: '2px dashed var(--color-border)',
                      borderRadius: '12px',
                      padding: '20px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 200ms',
                      background: logoPreview ? 'none' : 'var(--color-gray-50)'
                    }}
                    onClick={() => document.getElementById('logo-input')?.click()}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '12px', margin: '0 auto' }} />
                    ) : (
                      <div>
                        <Upload size={28} color="var(--color-gray-400)" style={{ margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Click to upload logo</p>
                        <p style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>PNG, JPG up to 5MB</p>
                      </div>
                    )}
                    <input
                      id="logo-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleFileChange(e, 'logo')}
                    />
                  </div>
                </div>

                {/* Cover */}
                <div className="form-group">
                  <label className="form-label">Cover Image</label>
                  <div
                    style={{
                      border: '2px dashed var(--color-border)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      height: '140px',
                      background: coverPreview ? 'none' : 'var(--color-gray-50)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onClick={() => document.getElementById('cover-input')?.click()}
                  >
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ textAlign: 'center' }}>
                        <Upload size={28} color="var(--color-gray-400)" style={{ margin: '0 auto 8px' }} />
                        <p style={{ fontSize: '13px', color: 'var(--color-gray-500)' }}>Click to upload cover image</p>
                        <p style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>Recommended: 1200×400px</p>
                      </div>
                    )}
                    <input
                      id="cover-input"
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => handleFileChange(e, 'cover')}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading}
              style={{ padding: '16px', fontSize: '15px' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: '18px', height: '18px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
                  Registering...
                </span>
              ) : (
                <>
                  <Building2 size={18} />
                  Register Business
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
