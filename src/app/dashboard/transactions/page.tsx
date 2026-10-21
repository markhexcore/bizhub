'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, TrendingUp, TrendingDown, Filter, Calendar } from 'lucide-react'
import type { Business, Transaction, TransactionType } from '@/lib/types'
import { format } from 'date-fns'

const TX_CATEGORIES = [
  'sales', 'service', 'subscription', 'refund', 'other_income',
  'rent', 'utilities', 'payroll', 'supplies', 'marketing', 'travel', 'equipment', 'tax', 'other_expense'
]

export default function TransactionsPage() {
  const supabase = createClient()
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [filterType, setFilterType] = useState<'all' | TransactionType>('all')
  const [filterBiz, setFilterBiz] = useState<string>('all')

  const [form, setForm] = useState({
    business_id: '',
    type: 'income' as TransactionType,
    amount: '',
    description: '',
    category: 'sales',
    date: format(new Date(), 'yyyy-MM-dd'),
    currency: 'USD',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

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
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .in('business_id', bizList.map((b: Business) => b.id))
        .order('date', { ascending: false })
      setTransactions(txData || [])
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filteredTx = transactions.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false
    if (filterBiz !== 'all' && tx.business_id !== filterBiz) return false
    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.business_id) { setError('Please select a business'); return }
    if (!form.amount || isNaN(Number(form.amount))) { setError('Please enter a valid amount'); return }
    setSubmitting(true)
    setError('')

    const { error: insertError } = await supabase.from('transactions').insert({
      business_id: form.business_id,
      type: form.type,
      amount: Number(form.amount),
      description: form.description,
      category: form.category,
      date: form.date,
      currency: form.currency,
    })

    if (insertError) {
      setError(insertError.message)
    } else {
      setShowModal(false)
      setForm({ business_id: form.business_id, type: 'income', amount: '', description: '', category: 'sales', date: format(new Date(), 'yyyy-MM-dd'), currency: 'USD' })
      await fetchData()
    }
    setSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions(prev => prev.filter(t => t.id !== id))
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)

  const totalIncome = filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  if (loading) {
    return <div className="loading-page"><div className="spinner" style={{ width: '36px', height: '36px' }} /></div>
  }

  return (
    <div>
      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <h2 className="modal-title">Add Transaction</h2>

            {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Business</label>
                <select className="form-select" value={form.business_id} onChange={e => setForm(p => ({ ...p, business_id: e.target.value }))} required>
                  <option value="">Select a business...</option>
                  {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm(p => ({
                    ...p,
                    type: e.target.value as TransactionType,
                    category: e.target.value === 'income' ? 'sales' : 'rent'
                  }))}>
                    <option value="income">💚 Income</option>
                    <option value="expense">🔴 Expense</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (USD)</label>
                  <input className="form-input" type="number" placeholder="0.00" min="0" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-input" type="text" placeholder="e.g. Monthly rent payment" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    {TX_CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Track your income and expenses</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" disabled={businesses.length === 0}>
          <Plus size={16} />
          Add Transaction
        </button>
      </div>

      {businesses.length === 0 ? (
        <div className="card"><div className="card-body"><div className="empty-state">
          <div className="empty-state-icon">💳</div>
          <h3>Register a business first</h3>
          <p>You need at least one business before adding transactions.</p>
        </div></div></div>
      ) : (
        <>
          {/* Summary */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card">
              <div className="stat-icon income"><TrendingUp size={20} /></div>
              <div className="stat-label">Total Income</div>
              <div className="stat-value" style={{ color: 'var(--color-success)' }}>{fmt(totalIncome)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon expense"><TrendingDown size={20} /></div>
              <div className="stat-label">Total Expenses</div>
              <div className="stat-value" style={{ color: 'var(--color-danger)' }}>{fmt(totalExpense)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon profit"><span style={{ fontWeight: 800, fontSize: '18px' }}>$</span></div>
              <div className="stat-label">Net Profit</div>
              <div className="stat-value" style={{ color: (totalIncome - totalExpense) >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                {fmt(totalIncome - totalExpense)}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['all', 'income', 'expense'] as const).map(t => (
                <button key={t} onClick={() => setFilterType(t)} className="btn btn-sm"
                  style={{
                    background: filterType === t ? 'var(--color-primary)' : 'var(--color-white)',
                    color: filterType === t ? 'white' : 'var(--color-gray-600)',
                    border: `1px solid ${filterType === t ? 'var(--color-primary)' : 'var(--color-border)'}`
                  }}>
                  {t === 'all' ? 'All' : t === 'income' ? '💚 Income' : '🔴 Expenses'}
                </button>
              ))}
            </div>
            <select
              className="form-select"
              style={{ width: 'auto', fontSize: '13px' }}
              value={filterBiz}
              onChange={e => setFilterBiz(e.target.value)}
            >
              <option value="all">All businesses</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {filteredTx.length === 0 ? (
            <div className="card"><div className="card-body"><div className="empty-state" style={{ padding: '40px' }}>
              <div className="empty-state-icon">📊</div>
              <h3>No transactions</h3>
              <p>Add your first income or expense record.</p>
            </div></div></div>
          ) : (
            <div className="card">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Business</th>
                      <th>Category</th>
                      <th><Calendar size={13} style={{ display: 'inline-block', verticalAlign: 'middle' }} /> Date</th>
                      <th className="text-right">Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTx.map(tx => (
                      <tr key={tx.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {tx.type === 'income' ? (
                              <TrendingUp size={15} color="var(--color-success)" />
                            ) : (
                              <TrendingDown size={15} color="var(--color-danger)" />
                            )}
                            <span style={{ fontWeight: '500' }}>{tx.description}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--color-gray-500)', fontSize: '13px' }}>
                          {businesses.find(b => b.id === tx.business_id)?.name || '—'}
                        </td>
                        <td><span className="badge badge-primary">{tx.category.replace('_', ' ')}</span></td>
                        <td style={{ color: 'var(--color-gray-500)', fontSize: '13px' }}>
                          {format(new Date(tx.date), 'MMM d, yyyy')}
                        </td>
                        <td className="text-right" style={{
                          fontWeight: '700',
                          color: tx.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)'
                        }}>
                          {tx.type === 'income' ? '+' : '-'}{fmt(Number(tx.amount))}
                        </td>
                        <td>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="btn btn-sm"
                            style={{ color: 'var(--color-gray-400)', padding: '4px' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
