'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Store, Receipt, Image, Plus, Package, ShoppingBag } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: <LayoutDashboard size={17} /> },
  { href: '/dashboard/businesses', label: 'My Businesses', icon: <Store size={17} /> },
  { href: '/dashboard/products', label: 'Products & Store', icon: <Package size={17} /> },
  { href: '/dashboard/orders', label: 'Orders', icon: <ShoppingBag size={17} /> },
  { href: '/dashboard/transactions', label: 'Transactions', icon: <Receipt size={17} /> },
  { href: '/dashboard/photos', label: 'Photos', icon: <Image size={17} /> },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
          <Link href="/dashboard/businesses/new" className="btn btn-primary w-full btn-sm">
            <Plus size={14} />
            New Business
          </Link>
        </div>
      </aside>

      <div className="dashboard-content">
        {children}
      </div>
    </div>
  )
}
