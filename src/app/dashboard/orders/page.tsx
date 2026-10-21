'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShoppingBag, CheckCircle2, Clock, XCircle, Truck, Phone, Mail, MapPin, ChevronDown } from 'lucide-react'
import type { Business, Order, OrderStatus } from '@/lib/types'
import { format } from 'date-fns'

const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  pending: { label: 'Pending', color: '#D97706', bg: '#FEF3C7' },
  processing: { label: 'Processing', color: '#2563EB', bg: '#DBEAFE' },
  completed: { label: 'Completed', color: '#059669', bg: '#D1FAE5' },
  cancelled: { label: 'Cancelled', color: '#DC2626', bg: '#FEE2E2' },
}

export default function OrdersPage() {
  const supabase = createClient()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedBiz, setSelectedBiz] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

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
      const bizIds = bizList.map((b: Business) => b.id)
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .in('business_id', bizIds)
        .order('created_at', { ascending: false })

      const ordersList: Order[] = (orderData as any) || []

      // Direct fallback fetch in case PostgREST embedded join is empty or restricted
      const orderIds = ordersList.map(o => o.id)
      if (orderIds.length > 0) {
        const { data: allItems } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)

        if (allItems && allItems.length > 0) {
          ordersList.forEach(order => {
            if (!order.order_items || order.order_items.length === 0) {
              order.order_items = allItems.filter(item => item.order_id === order.id)
            }
          })
        }
      }

      setOrders(ordersList)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o))
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const filteredOrders = orders.filter(o => {
    if (selectedBiz !== 'all' && o.business_id !== selectedBiz) return false
    if (statusFilter !== 'all' && o.status !== statusFilter) return false
    return true
  })

  const totalSales = orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + Number(o.total_amount), 0)
  const pendingCount = orders.filter(o => o.status === 'pending').length

  if (loading) {
    return <div className="loading-page"><div className="spinner" style={{ width: '36px', height: '36px' }} /></div>
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Customer Orders</h1>
          <p className="page-subtitle">Track, fulfill, and manage orders placed through your business storefront</p>
        </div>
      </div>

      {businesses.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state">
          <div className="empty-state-icon">🛍️</div>
          <h3>Register a business first</h3>
          <p>Customer orders will appear here once your business is registered.</p>
        </div></div></div>
      ) : (
        <>
          {/* Quick Metrics */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-icon income"><ShoppingBag size={20} /></div>
              <div className="stat-label">Total Store Sales</div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>{fmt(totalSales)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#FEF3C7', color: '#D97706' }}><Clock size={20} /></div>
              <div className="stat-label">Pending Orders</div>
              <div className="stat-value" style={{ color: '#D97706' }}>{pendingCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon profit"><CheckCircle2 size={20} /></div>
              <div className="stat-label">Total Orders Placed</div>
              <div className="stat-value">{orders.length}</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['all', 'pending', 'processing', 'completed', 'cancelled'] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="btn btn-sm"
                  style={{
                    background: statusFilter === s ? 'var(--color-primary)' : 'var(--color-white)',
                    color: statusFilter === s ? 'white' : 'var(--color-gray-600)',
                    border: `1px solid ${statusFilter === s ? 'var(--color-primary)' : 'var(--color-border)'}`
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <select
              className="form-select"
              style={{ width: 'auto', fontSize: '13px' }}
              value={selectedBiz}
              onChange={e => setSelectedBiz(e.target.value)}
            >
              <option value="all">All businesses</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="card"><div className="card-body">
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="empty-state-icon">📦</div>
                <h3>No orders found</h3>
                <p>When customers order products from your public page, they will show up here.</p>
              </div>
            </div></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredOrders.map(order => {
                const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
                const isExpanded = expandedOrder === order.id
                const bizName = businesses.find(b => b.id === order.business_id)?.name
                const items = order.order_items || order.items || []

                return (
                  <div key={order.id} className="card" style={{ overflow: 'hidden' }}>
                    <div className="card-body" style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--color-gray-900)' }}>
                              Order #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 10px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: cfg.color,
                              background: cfg.bg
                            }}>
                              {cfg.label}
                            </span>
                            <span className="badge badge-primary">{bizName}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--color-gray-500)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                            <span>Placed on: <strong>{format(new Date(order.created_at), 'MMM d, yyyy h:mm a')}</strong></span>
                            <span>Customer: <strong>{order.customer_name}</strong></span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={13} /> {order.customer_phone}
                            </span>
                            {order.customer_email && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Mail size={13} /> {order.customer_email}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: 'var(--color-gray-400)' }}>Order Total</div>
                            <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--color-primary)' }}>
                              {fmt(order.total_amount)}
                            </div>
                          </div>

                          {/* Status Dropdown */}
                          <select
                            className="form-select"
                            style={{ width: 'auto', fontSize: '13px', fontWeight: '600' }}
                            value={order.status}
                            onChange={e => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                          >
                            <option value="pending">⏳ Pending</option>
                            <option value="processing">⚙️ Processing</option>
                            <option value="completed">✅ Completed</option>
                            <option value="cancelled">❌ Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Delivery Address & Notes */}
                      {(order.customer_address || order.notes) && (
                        <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--color-gray-50)', borderRadius: '8px', fontSize: '13px' }}>
                          {order.customer_address && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-gray-700)', marginBottom: order.notes ? '4px' : 0 }}>
                              <MapPin size={14} color="var(--color-primary)" />
                              <span>Delivery Address: {order.customer_address}</span>
                            </div>
                          )}
                          {order.notes && (
                            <div style={{ color: 'var(--color-gray-600)', fontStyle: 'italic' }}>
                              Notes: "{order.notes}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Order Items Toggle */}
                      <button
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        className="btn btn-sm btn-secondary"
                        style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <ChevronDown size={14} style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                        {isExpanded ? 'Hide Items' : `View Ordered Items (${items.length})`}
                      </button>

                      {/* Order Items Table */}
                      {isExpanded && (
                        <div style={{ marginTop: '14px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                          <table className="table" style={{ fontSize: '13px' }}>
                            <thead>
                              <tr>
                                <th>Item</th>
                                <th className="text-right">Price</th>
                                <th className="text-right">Quantity</th>
                                <th className="text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.length === 0 ? (
                                <tr>
                                  <td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: '16px' }}>
                                    No item records found for this order.
                                  </td>
                                </tr>
                              ) : (
                                items.map((item, idx) => (
                                  <tr key={item.id || idx}>
                                    <td style={{ fontWeight: '600' }}>{item.product_name}</td>
                                    <td className="text-right">{fmt(item.price)}</td>
                                    <td className="text-right">x{item.quantity}</td>
                                    <td className="text-right" style={{ fontWeight: '700', color: 'var(--color-gray-900)' }}>
                                      {fmt(item.subtotal)}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
