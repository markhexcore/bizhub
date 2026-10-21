'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp, TrendingDown, DollarSign, Activity,
  Store, Receipt, Image, Plus, ArrowRight
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { format, subMonths, startOfMonth } from 'date-fns'
import type { Business, Transaction } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export default function DashboardPage() {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (!user) return

      const { data: bizData } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })

      const bizList = bizData || []
      setBusinesses(bizList)

      if (bizList.length > 0) {
        const bizIds = bizList.map((b: Business) => b.id)
        const { data: txData } = await supabase
          .from('transactions')
          .select('*')
          .in('business_id', bizIds)
          .order('date', { ascending: false })
        setTransactions(txData || [])
      }

      setLoading(false)
    }
    fetchData()
  }, [])

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((s, t) => s + Number(t.amount), 0)

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount), 0)

  const netProfit = totalIncome - totalExpenses

  // Build last 6 months chart data
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i)
    const label = format(month, 'MMM')
    const monthStart = startOfMonth(month)
    const monthEnd = startOfMonth(subMonths(month, -1))

    const income = transactions
      .filter(t => t.type === 'income' && new Date(t.date) >= monthStart && new Date(t.date) < monthEnd)
      .reduce((s, t) => s + Number(t.amount), 0)

    const expense = transactions
      .filter(t => t.type === 'expense' && new Date(t.date) >= monthStart && new Date(t.date) < monthEnd)
      .reduce((s, t) => s + Number(t.amount), 0)

    return { label, income, expense }
  })

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(n)

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
          <h1 className="page-title">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 👋
          </h1>
          <p className="page-subtitle">
            Here's an overview of your business portfolio
          </p>
        </div>
        <Link href="/dashboard/businesses/new" className="btn btn-primary">
          <Plus size={16} />
          Add Business
        </Link>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {[
          {
            label: 'Total Income',
            value: fmt(totalIncome),
            icon: <TrendingUp size={22} />,
            cls: 'income',
          },
          {
            label: 'Total Expenses',
            value: fmt(totalExpenses),
            icon: <TrendingDown size={22} />,
            cls: 'expense',
          },
          {
            label: 'Net Profit',
            value: fmt(netProfit),
            icon: <DollarSign size={22} />,
            cls: 'profit',
          },
          {
            label: 'Businesses',
            value: businesses.length.toString(),
            icon: <Store size={22} />,
            cls: 'total',
          },
        ].map(stat => (
          <div key={stat.label} className="stat-card">
            <div className={`stat-icon ${stat.cls}`}>{stat.icon}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-value">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Chart + Recent Transactions */}
      <div className="dashboard-overview-grid">
        {/* Chart */}
        <div className="card">
          <div className="card-body">
            <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: '700', marginBottom: '20px' }}>
              Income vs Expenses (Last 6 months)
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ border: '1px solid var(--color-border)', borderRadius: '8px', fontSize: '13px' }}
                  formatter={(value: any) => [`$${Number(value || 0).toFixed(2)}`]}
                />
                <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" strokeWidth={2} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="#EF4444" strokeWidth={2} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-body">
            <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: '700', marginBottom: '16px' }}>
              Quick Actions
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Add a transaction', icon: <Receipt size={16} />, href: '/dashboard/transactions' },
                { label: 'Upload photos', icon: <Image size={16} />, href: '/dashboard/photos' },
                { label: 'Register new business', icon: <Store size={16} />, href: '/dashboard/businesses/new' },
                { label: 'Browse hub', icon: <Activity size={16} />, href: '/businesses' },
              ].map(action => (
                <Link
                  key={action.label}
                  href={action.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-border)',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: '500',
                    color: 'var(--color-gray-700)',
                    transition: 'all 150ms',
                    textDecoration: 'none'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-primary)', e.currentTarget.style.color = 'var(--color-primary)', e.currentTarget.style.background = 'var(--color-primary-50)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)', e.currentTarget.style.color = 'var(--color-gray-700)', e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {action.icon}
                    {action.label}
                  </span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {transactions.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: 'var(--font-size-base)', fontWeight: '700' }}>Recent Transactions</h2>
              <Link href="/dashboard/transactions" className="btn btn-secondary btn-sm">View all</Link>
            </div>
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 5).map(tx => (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: '500' }}>{tx.description}</td>
                      <td>
                        <span className="badge badge-primary">{tx.category}</span>
                      </td>
                      <td style={{ color: 'var(--color-gray-500)' }}>
                        {format(new Date(tx.date), 'MMM d, yyyy')}
                      </td>
                      <td className="text-right" style={{ fontWeight: '700', color: tx.type === 'income' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                        {tx.type === 'income' ? '+' : '-'}{fmt(Number(tx.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* No businesses CTA */}
      {businesses.length === 0 && (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state-icon">🏢</div>
              <h3>Register your first business</h3>
              <p>Get started by adding your business to the BizHub directory.</p>
              <Link href="/dashboard/businesses/new" className="btn btn-primary" style={{ marginTop: '16px' }}>
                <Plus size={16} />
                Register a business
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
