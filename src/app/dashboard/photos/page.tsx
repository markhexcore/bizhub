'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, Trash2, X, ZoomIn, Plus, Package, ShoppingBag, DollarSign, Tag } from 'lucide-react'
import type { Business, BusinessPhoto } from '@/lib/types'
import { format } from 'date-fns'
import Link from 'next/link'

export default function PhotosPage() {
  const supabase = createClient()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [photos, setPhotos] = useState<BusinessPhoto[]>([])
  const [selectedBiz, setSelectedBiz] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sell Product Modal State
  const [showProductModal, setShowProductModal] = useState(false)
  const [productForm, setProductForm] = useState({
    business_id: '',
    name: '',
    description: '',
    price: '',
    quantity: '1',
  })
  const [productPhotoFile, setProductPhotoFile] = useState<File | null>(null)
  const [productPhotoPreview, setProductPhotoPreview] = useState<string | null>(null)
  const [productSubmitting, setProductSubmitting] = useState(false)
  const [productError, setProductError] = useState('')
  const [productSuccess, setProductSuccess] = useState(false)
  const productPhotoInputRef = useRef<HTMLInputElement>(null)

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: bizData } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)

    const bizList = bizData || []
    setBusinesses(bizList)

    if (bizList.length > 0) {
      const { data: photoData } = await supabase
        .from('business_photos')
        .select('*')
        .in('business_id', bizList.map((b: Business) => b.id))
        .order('created_at', { ascending: false })
      setPhotos(photoData || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    const bizId = selectedBiz !== 'all' ? selectedBiz : businesses[0]?.id
    if (!bizId) return

    setUploading(true)
    try {
      for (const file of files) {
        const path = `photos/${bizId}/${Date.now()}-${file.name}`
        const { data, error } = await supabase.storage
          .from('business-media')
          .upload(path, file, { upsert: false })

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
          .from('business-media')
          .getPublicUrl(data.path)

        const { error: insertError } = await supabase.from('business_photos').insert({
          business_id: bizId,
          url: publicUrl,
          caption: null,
        })

        if (insertError) throw insertError
      }
      await fetchData()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!productForm.business_id) {
      setProductError('Please select a business')
      return
    }
    if (!productForm.name.trim()) {
      setProductError('Product name is required')
      return
    }
    if (!productForm.price || isNaN(Number(productForm.price)) || Number(productForm.price) < 0) {
      setProductError('Valid price is required')
      return
    }
    if (!productForm.quantity || isNaN(Number(productForm.quantity)) || Number(productForm.quantity) < 0) {
      setProductError('Valid quantity is required')
      return
    }

    setProductSubmitting(true)
    setProductError('')
    setProductSuccess(false)

    try {
      let imageUrl = null

      if (productPhotoFile) {
        const path = `products/${productForm.business_id}/${Date.now()}-${productPhotoFile.name}`
        const { data, error: uploadErr } = await supabase.storage
          .from('business-media')
          .upload(path, productPhotoFile, { upsert: true })

        if (!uploadErr && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('business-media')
            .getPublicUrl(data.path)
          imageUrl = publicUrl

          // Also add to business photos gallery
          await supabase.from('business_photos').insert({
            business_id: productForm.business_id,
            url: publicUrl,
            caption: `Product: ${productForm.name}`,
          })
        }
      }

      const { error: insertErr } = await supabase.from('products').insert({
        business_id: productForm.business_id,
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        price: Number(productForm.price),
        quantity: parseInt(productForm.quantity, 10),
        image_url: imageUrl,
        is_available: true,
      })

      if (insertErr) throw insertErr

      setProductSuccess(true)
      setTimeout(() => {
        setShowProductModal(false)
        setProductSuccess(false)
        setProductForm({
          business_id: selectedBiz !== 'all' ? selectedBiz : (businesses[0]?.id || ''),
          name: '',
          description: '',
          price: '',
          quantity: '1',
        })
        setProductPhotoFile(null)
        setProductPhotoPreview(null)
      }, 1000)

      await fetchData()
    } catch (err: any) {
      const msg = err?.message || err?.error_description || (err instanceof Error ? err.message : 'Failed to create product')
      setProductError(msg)
    } finally {
      setProductSubmitting(false)
    }
  }

  const handleDelete = async (photo: BusinessPhoto) => {
    if (!confirm('Delete this photo?')) return
    const url = new URL(photo.url)
    const path = url.pathname.split('/business-media/')[1]
    if (path) {
      await supabase.storage.from('business-media').remove([path])
    }
    await supabase.from('business_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
  }

  const openSellModalWithPhoto = (photoUrl?: string) => {
    setProductForm({
      business_id: selectedBiz !== 'all' ? selectedBiz : (businesses[0]?.id || ''),
      name: '',
      description: '',
      price: '',
      quantity: '1',
    })
    setProductPhotoFile(null)
    setProductPhotoPreview(photoUrl || null)
    setProductError('')
    setProductSuccess(false)
    setShowProductModal(true)
  }

  const filteredPhotos = selectedBiz === 'all'
    ? photos
    : photos.filter(p => p.business_id === selectedBiz)

  if (loading) {
    return <div className="loading-page"><div className="spinner" style={{ width: '36px', height: '36px' }} /></div>
  }

  return (
    <div>
      {/* Lightbox */}
      {lightbox && (
        <div className="modal-overlay" onClick={() => setLightbox(null)} style={{ zIndex: 2000 }}>
          <button
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', borderRadius: '50%', padding: '8px', display: 'flex' }}
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </button>
          <img src={lightbox} alt="Photo" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}

      {/* Selling Product Modal */}
      {showProductModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowProductModal(false)}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 className="modal-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={20} color="var(--color-primary)" /> Sell Product from Photo
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                  Add details, set your price, and configure inventory stock.
                </p>
              </div>
              <button onClick={() => setShowProductModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}>
                <X size={20} />
              </button>
            </div>

            {productError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{productError}</div>}
            {productSuccess && <div className="alert alert-success" style={{ marginBottom: '16px' }}>Product added to your store!</div>}

            <form onSubmit={handleProductSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Business *</label>
                <select
                  className="form-select"
                  value={productForm.business_id}
                  onChange={e => setProductForm(p => ({ ...p, business_id: e.target.value }))}
                  required
                >
                  <option value="">Select business...</option>
                  {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Product Photo Upload */}
              <div className="form-group">
                <label className="form-label">Product Photo</label>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--color-border)',
                    background: 'var(--color-gray-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {productPhotoPreview ? (
                      <img src={productPhotoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Package size={26} color="var(--color-gray-400)" />
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => productPhotoInputRef.current?.click()}
                    >
                      <Upload size={13} /> {productPhotoPreview ? 'Change Photo' : 'Select Photo'}
                    </button>
                    <input
                      ref={productPhotoInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setProductPhotoFile(file)
                          setProductPhotoPreview(URL.createObjectURL(file))
                        }
                      }}
                    />
                    <p style={{ fontSize: '11px', color: 'var(--color-gray-400)', marginTop: '4px' }}>PNG, JPG or WebP</p>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Signature Artisan Blend Coffee"
                  value={productForm.name}
                  onChange={e => setProductForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Brief description of the product..."
                  value={productForm.description}
                  onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Price (USD) *</label>
                  <input
                    className="form-input"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={productForm.price}
                    onChange={e => setProductForm(p => ({ ...p, price: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity in Stock *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="1"
                    value={productForm.quantity}
                    onChange={e => setProductForm(p => ({ ...p, quantity: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProductModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={productSubmitting}>
                  {productSubmitting ? 'Publishing...' : 'Publish Product for Sale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Photos & Product Selling</h1>
          <p className="page-subtitle">Upload media showcase or sell items with name, price, and stock</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => openSellModalWithPhoto()}
            className="btn btn-secondary"
            disabled={businesses.length === 0}
          >
            <Package size={16} /> Sell Product
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary"
            disabled={businesses.length === 0 || uploading}
          >
            {uploading ? (
              <><span className="spinner" style={{ width: '16px', height: '16px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }} />Uploading...</>
            ) : (
              <><Upload size={16} />Upload Gallery Photos</>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
        </div>
      </div>

      {businesses.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state">
          <div className="empty-state-icon">📷</div>
          <h3>Register a business first</h3>
          <p>Photos and selling modules are linked to your registered businesses.</p>
        </div></div></div>
      ) : (
        <>
          {/* Quick Hub Navigation Banner */}
          <div style={{
            background: 'linear-gradient(135deg, var(--color-primary-50) 0%, rgba(255,255,255,0.9) 100%)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px 20px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'var(--color-primary)', color: 'white', padding: '10px', borderRadius: '10px' }}>
                <ShoppingBag size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--color-gray-900)' }}>
                  Sell Products Online Directly from Your Photos
                </h4>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-gray-600)' }}>
                  Attach a name, price, and stock quantity to any item to allow customer orders.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => openSellModalWithPhoto()} className="btn btn-primary btn-sm">
                <Plus size={14} /> Sell a Product
              </button>
              <Link href="/dashboard/products" className="btn btn-secondary btn-sm">
                Manage Store Catalog →
              </Link>
            </div>
          </div>

          {/* Business Filter */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setSelectedBiz('all')}
              className="btn btn-sm"
              style={{
                background: selectedBiz === 'all' ? 'var(--color-primary)' : 'var(--color-white)',
                color: selectedBiz === 'all' ? 'white' : 'var(--color-gray-600)',
                border: `1px solid ${selectedBiz === 'all' ? 'var(--color-primary)' : 'var(--color-border)'}`
              }}
            >
              All businesses ({photos.length})
            </button>
            {businesses.map(b => {
              const count = photos.filter(p => p.business_id === b.id).length
              return (
                <button
                  key={b.id}
                  onClick={() => setSelectedBiz(b.id)}
                  className="btn btn-sm"
                  style={{
                    background: selectedBiz === b.id ? 'var(--color-primary)' : 'var(--color-white)',
                    color: selectedBiz === b.id ? 'white' : 'var(--color-gray-600)',
                    border: `1px solid ${selectedBiz === b.id ? 'var(--color-primary)' : 'var(--color-border)'}`
                  }}
                >
                  {b.name} ({count})
                </button>
              )
            })}
          </div>

          {/* Upload Dropzone */}
          <div
            className="dropzone"
            style={{ marginBottom: '24px' }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={async e => {
              e.preventDefault()
              const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
              if (files.length && fileInputRef.current) {
                const dt = new DataTransfer()
                files.forEach(f => dt.items.add(f))
                fileInputRef.current.files = dt.files
                fileInputRef.current.dispatchEvent(new Event('change', { bubbles: true }))
              }
            }}
          >
            <div className="dropzone-icon">
              <Upload size={32} />
            </div>
            <p style={{ fontWeight: '600', color: 'var(--color-gray-700)', marginBottom: '4px' }}>
              Drop photos here or click to upload
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-gray-400)' }}>
              PNG, JPG, WEBP — Multiple files supported
              {selectedBiz !== 'all' ? ` → ${businesses.find(b => b.id === selectedBiz)?.name}` : ` → ${businesses[0]?.name}`}
            </p>
          </div>

          {/* Photos Grid */}
          {filteredPhotos.length === 0 ? (
            <div className="card"><div className="card-body">
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-state-icon">🖼️</div>
                <h3>No photos yet</h3>
                <p>Upload some photos to showcase your business or sell products.</p>
              </div>
            </div></div>
          ) : (
            <>
              <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', marginBottom: '16px' }}>
                {filteredPhotos.length} photo{filteredPhotos.length !== 1 ? 's' : ''}
              </p>
              <div className="photo-grid">
                {filteredPhotos.map(photo => (
                  <div key={photo.id} className="photo-item">
                    <img src={photo.url} alt={photo.caption || 'Business photo'} />
                    <div className="photo-item-overlay">
                      <button onClick={() => setLightbox(photo.url)} title="View Fullscreen">
                        <ZoomIn size={16} />
                      </button>
                      <button onClick={() => openSellModalWithPhoto(photo.url)} title="Sell as Product" style={{ color: 'var(--color-success)' }}>
                        <Tag size={16} />
                      </button>
                      <button onClick={() => handleDelete(photo)} title="Delete Photo" style={{ color: 'var(--color-danger)' }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                      padding: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-end'
                    }}>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.85)' }}>
                        {format(new Date(photo.created_at), 'MMM d')}
                      </span>
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)' }}>
                        {businesses.find(b => b.id === photo.business_id)?.name}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
