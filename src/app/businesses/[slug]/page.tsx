'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Building2, MapPin, Phone, Mail, Globe, Calendar, Package, ShoppingBag,
  Plus, Minus, X, CheckCircle2, ArrowRight, Clock, ShieldCheck
} from 'lucide-react'
import type { Business, BusinessPhoto, Product, OrderItem } from '@/lib/types'
import { format } from 'date-fns'

interface CartItem extends OrderItem {
  image_url: string | null
  max_quantity: number
}

export default function BusinessProfilePage() {
  const { slug } = useParams<{ slug: string }>()
  const supabase = createClient()
  const [business, setBusiness] = useState<Business | null>(null)
  const [photos, setPhotos] = useState<BusinessPhoto[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [activeTab, setActiveTab] = useState<'products' | 'photos'>('products')
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<string | null>(null)

  // Cart & Ordering State
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState<{ id: string; total: number } | null>(null)
  const [checkoutError, setCheckoutError] = useState('')

  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      const { data: biz } = await supabase
        .from('businesses')
        .select('*')
        .eq('slug', slug)
        .single()

      if (biz) {
        setBusiness(biz)

        // Fetch photos
        const { data: ph } = await supabase
          .from('business_photos')
          .select('*')
          .eq('business_id', biz.id)
          .order('created_at', { ascending: false })
        setPhotos(ph || [])

        // Fetch available products
        const { data: prod } = await supabase
          .from('products')
          .select('*')
          .eq('business_id', biz.id)
          .order('created_at', { ascending: false })
        setProducts(prod || [])

        // If no products, default to photos tab
        if (!prod || prod.length === 0) {
          setActiveTab('photos')
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [slug])

  // Cart Handlers
  const addToCart = (product: Product) => {
    if (product.quantity <= 0) return

    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id)
      if (existing) {
        if (existing.quantity >= product.quantity) return prev
        return prev.map(item =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                subtotal: (item.quantity + 1) * item.price,
              }
            : item
        )
      } else {
        return [
          ...prev,
          {
            product_id: product.id,
            product_name: product.name,
            price: Number(product.price),
            quantity: 1,
            subtotal: Number(product.price),
            image_url: product.image_url,
            max_quantity: product.quantity,
          },
        ]
      }
    })
  }

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product_id === productId) {
            const newQty = item.quantity + delta
            if (newQty <= 0) return null
            if (newQty > item.max_quantity) return item
            return {
              ...item,
              quantity: newQty,
              subtotal: newQty * item.price,
            }
          }
          return item
        })
        .filter(Boolean) as CartItem[]
    })
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.subtotal, 0)
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Order Placement
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!business) return
    if (!customerForm.name.trim()) { setCheckoutError('Customer name is required'); return }
    if (!customerForm.phone.trim()) { setCheckoutError('Contact phone number is required'); return }
    if (cart.length === 0) { setCheckoutError('Your order is empty'); return }

    setCheckoutSubmitting(true)
    setCheckoutError('')

    try {
      const orderId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'ord-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9)

      // 1. Insert into orders table (without .select() to prevent SELECT RLS conflict for public customers)
      const { error: orderErr } = await supabase
        .from('orders')
        .insert({
          id: orderId,
          business_id: business.id,
          customer_name: customerForm.name.trim(),
          customer_phone: customerForm.phone.trim(),
          customer_email: customerForm.email.trim() || null,
          customer_address: customerForm.address.trim() || null,
          total_amount: cartTotal,
          status: 'pending',
          notes: customerForm.notes.trim() || null,
        })

      if (orderErr) throw orderErr

      // 2. Insert into order_items table
      const itemsToInsert = cart.map(item => ({
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal,
      }))

      const { error: itemsErr } = await supabase.from('order_items').insert(itemsToInsert)
      if (itemsErr) throw itemsErr

      // 3. Decrement stock (best-effort if owner permissions allow)
      try {
        for (const item of cart) {
          if (item.product_id) {
            const currentProd = products.find(p => p.id === item.product_id)
            if (currentProd) {
              const newQty = Math.max(0, currentProd.quantity - item.quantity)
              await supabase
                .from('products')
                .update({
                  quantity: newQty,
                  is_available: newQty > 0,
                })
                .eq('id', item.product_id)
            }
          }
        }
      } catch {
        // Stock decrement can be synced when owner fulfills order
      }

      // 4. Record transaction in business ledger (best-effort if owner permissions allow)
      try {
        await supabase.from('transactions').insert({
          business_id: business.id,
          type: 'income',
          amount: cartTotal,
          description: `Online Order #${orderId.slice(0, 8).toUpperCase()} (${customerForm.name})`,
          category: 'sales',
          date: format(new Date(), 'yyyy-MM-dd'),
          currency: 'USD',
        })
      } catch {
        // Logged on fulfillment
      }

      // Finish order successfully
      setOrderSuccess({ id: orderId, total: cartTotal })
      setCart([])
      setShowCheckout(false)
      setCustomerForm({ name: '', phone: '', email: '', address: '', notes: '' })

      // Refresh product quantities locally
      const { data: refreshedProd } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', business.id)
      if (refreshedProd) setProducts(refreshedProd)

    } catch (err: any) {
      const msg = err?.message || err?.error_description || (err instanceof Error ? err.message : 'Failed to place order. Please try again.')
      setCheckoutError(msg)
    } finally {
      setCheckoutSubmitting(false)
    }
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    )
  }

  if (!business) {
    return (
      <div className="empty-state" style={{ marginTop: '80px' }}>
        <div className="empty-state-icon">🔍</div>
        <h3>Business not found</h3>
        <p>This business doesn't exist or has been removed.</p>
      </div>
    )
  }

  return (
    <>
      {/* Lightbox */}
      {lightbox && (
        <div className="modal-overlay" onClick={() => setLightbox(null)} style={{ zIndex: 3000 }}>
          <button
            style={{ position: 'absolute', top: '20px', right: '20px', background: 'white', borderRadius: '50%', padding: '8px', display: 'flex' }}
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </button>
          <img src={lightbox} alt="Photo" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: '12px', objectFit: 'contain' }} />
        </div>
      )}

      {/* Order Success Modal */}
      {orderSuccess && (
        <div className="modal-overlay" style={{ zIndex: 3000 }}>
          <div className="modal" style={{ textAlign: 'center', maxWidth: '440px' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#D1FAE5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h2 className="modal-title" style={{ marginBottom: '8px' }}>Order Placed!</h2>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '14px', marginBottom: '16px' }}>
              Your order has been submitted to <strong>{business.name}</strong>.
            </p>
            <div style={{ background: 'var(--color-gray-50)', padding: '16px', borderRadius: '8px', marginBottom: '20px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-gray-500)' }}>Order ID:</span>
                <span style={{ fontWeight: '700' }}>#{orderSuccess.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--color-gray-500)' }}>Total:</span>
                <span style={{ fontWeight: '800', color: 'var(--color-primary)' }}>{fmt(orderSuccess.total)}</span>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginBottom: '20px' }}>
              The business owner has received your contact details and will coordinate your order.
            </p>
            <button onClick={() => setOrderSuccess(null)} className="btn btn-primary w-full">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal / Drawer */}
      {showCheckout && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCheckout(false)} style={{ zIndex: 2500 }}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className="modal-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingBag size={20} color="var(--color-primary)" /> Checkout Order
              </h2>
              <button onClick={() => setShowCheckout(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)' }}>
                <X size={20} />
              </button>
            </div>

            {checkoutError && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{checkoutError}</div>}

            {/* Order Items Summary */}
            <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '16px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
              {cart.map(item => (
                <div key={item.product_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'var(--color-gray-100)', overflow: 'hidden', flexShrink: 0 }}>
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Package size={16} color="var(--color-gray-400)" style={{ margin: '10px auto' }} />
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-gray-900)' }}>{item.product_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>{fmt(item.price)} each</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.product_id as string, -1)}
                      style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: '600', minWidth: '16px', textAlign: 'center' }}>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateCartQuantity(item.product_id as string, 1)}
                      style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--color-border)', background: 'white', cursor: 'pointer' }}
                    >
                      +
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '55px', textAlign: 'right' }}>
                      {fmt(item.subtotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: '600', color: 'var(--color-gray-700)' }}>Total:</span>
              <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>{fmt(cartTotal)}</span>
            </div>

            {/* Customer Details Form */}
            <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Your Full Name *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={customerForm.name}
                  onChange={e => setCustomerForm(p => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input
                    className="form-input"
                    type="tel"
                    placeholder="e.g. (555) 000-0000"
                    value={customerForm.phone}
                    onChange={e => setCustomerForm(p => ({ ...p, phone: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email (Optional)</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@email.com"
                    value={customerForm.email}
                    onChange={e => setCustomerForm(p => ({ ...p, email: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Delivery Address or Pickup Preference</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="Street address or 'In-store pickup'"
                  value={customerForm.address}
                  onChange={e => setCustomerForm(p => ({ ...p, address: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Order Notes / Instructions</label>
                <textarea
                  className="form-textarea"
                  placeholder="Special requests, flavors, or delivery instructions..."
                  value={customerForm.notes}
                  onChange={e => setCustomerForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCheckout(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={checkoutSubmitting}>
                  {checkoutSubmitting ? 'Placing Order...' : `Place Order (${fmt(cartTotal)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Business Cover Banner */}
      <div style={{
        height: 'clamp(150px, 28vw, 260px)',
        background: 'linear-gradient(135deg, var(--color-primary-50), var(--color-primary-100))',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {business.cover_url && (
          <img src={business.cover_url} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}
      </div>

      <div className="container" style={{ paddingTop: '24px', paddingBottom: '100px' }}>
        {/* Profile Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '32px', flexWrap: 'wrap' }}>
          <div style={{
            width: '90px',
            height: '90px',
            background: 'white',
            border: '3px solid white',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
            marginTop: '-45px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
            fontWeight: '800',
            color: 'var(--color-primary)',
            flexShrink: 0
          }}>
            {business.logo_url ? (
              <img src={business.logo_url} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : business.name.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: '800', color: 'var(--color-gray-900)' }}>
                {business.name}
              </h1>
              {business.is_verified && (
                <span className="badge badge-success">✓ Verified</span>
              )}
              <span className="badge badge-primary">{business.category.replace('_', ' ')}</span>
            </div>
            {business.description && (
              <p style={{ marginTop: '6px', color: 'var(--color-gray-600)', maxWidth: '600px' }}>
                {business.description}
              </p>
            )}
          </div>
        </div>

        <div className="profile-layout-grid">
          {/* Main Showcase */}
          <div>
            {/* Nav Tabs */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border)', marginBottom: '24px' }}>
              <button
                onClick={() => setActiveTab('products')}
                style={{
                  padding: '10px 16px',
                  fontWeight: '600',
                  fontSize: '14px',
                  borderBottom: activeTab === 'products' ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: activeTab === 'products' ? 'var(--color-primary)' : 'var(--color-gray-500)',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Package size={16} /> Products & Store ({products.length})
              </button>
              <button
                onClick={() => setActiveTab('photos')}
                style={{
                  padding: '10px 16px',
                  fontWeight: '600',
                  fontSize: '14px',
                  borderBottom: activeTab === 'photos' ? '2px solid var(--color-primary)' : '2px solid transparent',
                  color: activeTab === 'photos' ? 'var(--color-primary)' : 'var(--color-gray-500)',
                  background: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Photos ({photos.length})
              </button>
            </div>

            {/* Tab 1: Products For Sale & Ordering */}
            {activeTab === 'products' && (
              <div>
                {products.length === 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <div className="empty-state" style={{ padding: '40px' }}>
                        <div className="empty-state-icon">🛍️</div>
                        <h3>No products listed for sale</h3>
                        <p>This business has not added any products to its online catalog yet.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '20px' }}>
                    {products.map(product => {
                      const inCart = cart.find(c => c.product_id === product.id)
                      const isOutOfStock = !product.is_available || product.quantity <= 0

                      return (
                        <div key={product.id} className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <div style={{ height: '170px', background: 'var(--color-gray-100)', position: 'relative' }}>
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-gray-400)' }}>
                                <Package size={40} />
                              </div>
                            )}
                            <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                              <span className={`badge ${isOutOfStock ? 'badge-danger' : 'badge-success'}`}>
                                {isOutOfStock ? 'Sold Out' : `${product.quantity} in stock`}
                              </span>
                            </div>
                          </div>

                          <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                              <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--color-gray-900)', margin: 0 }}>
                                {product.name}
                              </h3>
                              <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--color-primary)' }}>
                                {fmt(product.price)}
                              </span>
                            </div>

                            <p style={{ fontSize: '13px', color: 'var(--color-gray-500)', flex: 1, marginBottom: '14px' }}>
                              {product.description || 'Quality product from ' + business.name}
                            </p>

                            {/* Add to Cart Actions */}
                            {isOutOfStock ? (
                              <button disabled className="btn btn-secondary btn-sm w-full" style={{ opacity: 0.6 }}>
                                Currently Unavailable
                              </button>
                            ) : inCart ? (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--color-primary-50)', padding: '6px 10px', borderRadius: '8px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-primary)' }}>
                                  In Cart: {inCart.quantity}
                                </span>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    onClick={() => updateCartQuantity(product.id, -1)}
                                    className="btn btn-sm btn-secondary"
                                    style={{ padding: '2px 8px' }}
                                  >
                                    -
                                  </button>
                                  <button
                                    onClick={() => updateCartQuantity(product.id, 1)}
                                    className="btn btn-sm btn-primary"
                                    style={{ padding: '2px 8px' }}
                                    disabled={inCart.quantity >= product.quantity}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(product)}
                                className="btn btn-primary btn-sm w-full"
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                              >
                                <Plus size={14} /> Add to Order
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Photos Gallery */}
            {activeTab === 'photos' && (
              <div>
                {photos.length > 0 ? (
                  <div className="card">
                    <div className="card-body">
                      <div className="photo-grid">
                        {photos.map(photo => (
                          <div key={photo.id} className="photo-item" onClick={() => setLightbox(photo.url)}>
                            <img src={photo.url} alt={photo.caption || 'Business photo'} />
                            <div className="photo-item-overlay" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="card">
                    <div className="card-body">
                      <div className="empty-state" style={{ padding: '40px' }}>
                        <div className="empty-state-icon">📷</div>
                        <h3>No photos uploaded yet</h3>
                        <p>This business hasn't added photo showcase items.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Contact & Business Info */}
          <div>
            <div className="card">
              <div className="card-body">
                <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: '700', marginBottom: '16px' }}>
                  Contact Information
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {business.address && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <MapPin size={16} color="var(--color-gray-400)" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-700)' }}>
                        {business.address}
                        {business.city && `, ${business.city}`}
                        {business.country && `, ${business.country}`}
                      </span>
                    </div>
                  )}

                  {business.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Phone size={16} color="var(--color-gray-400)" />
                      <a href={`tel:${business.phone}`} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
                        {business.phone}
                      </a>
                    </div>
                  )}

                  {business.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Mail size={16} color="var(--color-gray-400)" />
                      <a href={`mailto:${business.email}`} style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)' }}>
                        {business.email}
                      </a>
                    </div>
                  )}

                  {business.website && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Globe size={16} color="var(--color-gray-400)" />
                      <a href={business.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-primary)', wordBreak: 'break-all' }}>
                        {business.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                    <Calendar size={16} color="var(--color-gray-400)" />
                    <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)' }}>
                      Member since {format(new Date(business.created_at), 'MMMM yyyy')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Safe Ordering Guarantee Card */}
            <div className="card" style={{ marginTop: '16px', background: 'var(--color-primary-50)', border: '1px solid rgba(37,99,235,0.15)' }}>
              <div className="card-body" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontWeight: '700', fontSize: '14px', marginBottom: '6px' }}>
                  <ShieldCheck size={18} /> Verified Direct Orders
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-gray-600)' }}>
                  Orders placed here go directly to the registered business owner.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Cart Bar (visible when items in cart) */}
      {cart.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(16px + env(safe-area-inset-bottom))',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--color-gray-900)',
          color: 'white',
          borderRadius: '40px',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
          zIndex: 2000,
          cursor: 'pointer',
          width: 'calc(100% - 32px)',
          maxWidth: '440px'
        }}
        onClick={() => setShowCheckout(true)}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              background: 'var(--color-primary)',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: '800'
            }}>
              {cartItemCount}
            </div>
            <span style={{ fontSize: '14px', fontWeight: '600' }}>
              {cartItemCount} item{cartItemCount !== 1 ? 's' : ''} in Order
            </span>
          </div>

          <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>
            {fmt(cartTotal)}
          </div>

          <button
            onClick={e => {
              e.stopPropagation()
              setShowCheckout(true)
            }}
            className="btn btn-primary btn-sm"
            style={{ borderRadius: '20px', padding: '6px 16px' }}
          >
            Review & Order <ArrowRight size={14} />
          </button>
        </div>
      )}
    </>
  )
}
