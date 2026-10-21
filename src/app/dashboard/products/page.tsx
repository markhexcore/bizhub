'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Edit2, Upload, Package, Check, X, Tag, DollarSign, Layers } from 'lucide-react'
import type { Business, Product } from '@/lib/types'

export default function ProductsPage() {
  const supabase = createClient()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedBiz, setSelectedBiz] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [form, setForm] = useState({
    business_id: '',
    name: '',
    description: '',
    price: '',
    quantity: '1',
    is_available: true,
  })

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      const { data: prodData } = await supabase
        .from('products')
        .select('*')
        .in('business_id', bizList.map((b: Business) => b.id))
        .order('created_at', { ascending: false })
      setProducts(prodData || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const openAddModal = () => {
    setEditingProduct(null)
    setForm({
      business_id: selectedBiz !== 'all' ? selectedBiz : (businesses[0]?.id || ''),
      name: '',
      description: '',
      price: '',
      quantity: '1',
      is_available: true,
    })
    setImageFile(null)
    setImagePreview(null)
    setError('')
    setShowModal(true)
  }

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setForm({
      business_id: p.business_id,
      name: p.name,
      description: p.description || '',
      price: p.price.toString(),
      quantity: p.quantity.toString(),
      is_available: p.is_available,
    })
    setImageFile(null)
    setImagePreview(p.image_url)
    setError('')
    setShowModal(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.business_id) { setError('Please select a business'); return }
    if (!form.name.trim()) { setError('Product name is required'); return }
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) {
      setError('Please provide a valid price'); return
    }
    if (!form.quantity || isNaN(Number(form.quantity)) || Number(form.quantity) < 0) {
      setError('Please provide a valid quantity'); return
    }

    setSubmitting(true)
    setError('')

    try {
      let imageUrl = editingProduct?.image_url || null

      if (imageFile) {
        const path = `products/${form.business_id}/${Date.now()}-${imageFile.name}`
        const { data, error: uploadErr } = await supabase.storage
          .from('business-media')
          .upload(path, imageFile, { upsert: true })

        if (!uploadErr && data) {
          const { data: { publicUrl } } = supabase.storage
            .from('business-media')
            .getPublicUrl(data.path)
          imageUrl = publicUrl
        }
      }

      if (editingProduct) {
        const { error: updateErr } = await supabase
          .from('products')
          .update({
            business_id: form.business_id,
            name: form.name.trim(),
            description: form.description.trim() || null,
            price: Number(form.price),
            quantity: parseInt(form.quantity, 10),
            image_url: imageUrl,
            is_available: form.is_available,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingProduct.id)

        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('products')
          .insert({
            business_id: form.business_id,
            name: form.name.trim(),
            description: form.description.trim() || null,
            price: Number(form.price),
            quantity: parseInt(form.quantity, 10),
            image_url: imageUrl,
            is_available: form.is_available,
          })

        if (insertErr) throw insertErr
      }

      setShowModal(false)
      await fetchData()
    } catch (err: any) {
      const msg = err?.message || err?.error_description || (err instanceof Error ? err.message : 'Failed to save product')
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  const toggleAvailability = async (product: Product) => {
    const updated = !product.is_available
    await supabase.from('products').update({ is_available: updated }).eq('id', product.id)
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: updated } : p))
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const filteredProducts = selectedBiz === 'all'
    ? products
    : products.filter(p => p.business_id === selectedBiz)

  if (loading) {
    return <div className="loading-page"><div className="spinner" style={{ width: '36px', height: '36px' }} /></div>
  }

  return (
    <div>
      {/* Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '540px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>
                {editingProduct ? 'Edit Product' : 'Add New Product for Sale'}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}>
                <X size={20} />
              </button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Business *</label>
                <select
                  className="form-select"
                  value={form.business_id}
                  onChange={e => setForm(p => ({ ...p, business_id: e.target.value }))}
                  required
                >
                  <option value="">Select a business...</option>
                  {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Product Photo Upload */}
              <div className="form-group">
                <label className="form-label">Product Photo</label>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <div style={{
                    width: '76px',
                    height: '76px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px dashed var(--color-border)',
                    background: 'var(--color-gray-50)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {imagePreview ? (
                      <img src={imagePreview} alt="Product preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Package size={28} color="var(--color-gray-300)" />
                    )}
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={14} /> {imagePreview ? 'Change Photo' : 'Upload Photo'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageChange}
                    />
                    <p style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginTop: '4px' }}>PNG, JPG or WebP</p>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Handmade Ceramic Coffee Mug"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Short description, dimensions, ingredients, or features..."
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
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
                    value={form.price}
                    onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Stock Quantity *</label>
                  <input
                    className="form-input"
                    type="number"
                    min="0"
                    placeholder="1"
                    value={form.quantity}
                    onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="is_available"
                  checked={form.is_available}
                  onChange={e => setForm(p => ({ ...p, is_available: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                />
                <label htmlFor="is_available" style={{ fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                  Available for customers to order online
                </label>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : (editingProduct ? 'Update Product' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Products & Store</h1>
          <p className="page-subtitle">Add products with photos, prices, and stock for online ordering</p>
        </div>
        <button onClick={openAddModal} className="btn btn-primary" disabled={businesses.length === 0}>
          <Plus size={16} />
          Add Product
        </button>
      </div>

      {businesses.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state">
          <div className="empty-state-icon">🛍️</div>
          <h3>Register a business first</h3>
          <p>You need to register at least one business before adding products for sale.</p>
        </div></div></div>
      ) : (
        <>
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
              All businesses ({products.length})
            </button>
            {businesses.map(b => {
              const count = products.filter(p => p.business_id === b.id).length
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

          {filteredProducts.length === 0 ? (
            <div className="card"><div className="card-body">
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-state-icon">📦</div>
                <h3>No products for sale yet</h3>
                <p>Add your first item with a photo, price, and inventory quantity.</p>
                <button onClick={openAddModal} className="btn btn-primary" style={{ marginTop: '16px' }}>
                  <Plus size={15} /> Add First Product
                </button>
              </div>
            </div></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
              {filteredProducts.map(product => (
                <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  {/* Product Image */}
                  <div style={{
                    height: '180px',
                    background: 'var(--color-gray-100)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                        <Package size={48} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                      <span className={`badge ${product.is_available && product.quantity > 0 ? 'badge-success' : 'badge-danger'}`}>
                        {product.is_available && product.quantity > 0 ? `In Stock (${product.quantity})` : 'Out of Stock'}
                      </span>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--color-gray-900)', margin: 0 }}>
                        {product.name}
                      </h3>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: 'var(--color-primary)', flexShrink: 0 }}>
                        {fmt(product.price)}
                      </span>
                    </div>

                    <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', flex: 1, marginBottom: '16px' }}>
                      {product.description || 'No description provided.'}
                    </p>

                    <div style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Business: <strong>{businesses.find(b => b.id === product.business_id)?.name}</strong></span>
                      <span>Stock: <strong>{product.quantity}</strong></span>
                    </div>

                    {/* Card Actions */}
                    <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                      <button
                        onClick={() => toggleAvailability(product)}
                        className={`btn btn-sm ${product.is_available ? 'btn-secondary' : 'btn-primary'}`}
                        style={{ flex: 1 }}
                      >
                        {product.is_available ? 'Pause Selling' : 'Enable Selling'}
                      </button>
                      <button
                        onClick={() => openEditModal(product)}
                        className="btn btn-secondary btn-sm"
                        title="Edit product"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        className="btn btn-sm"
                        style={{ color: 'var(--color-danger)', border: '1px solid var(--color-border)' }}
                        title="Delete product"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
