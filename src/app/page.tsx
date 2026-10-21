import Link from 'next/link'
import { Building2, ArrowRight, Store, Receipt, Image, LayoutDashboard, Search, Shield } from 'lucide-react'

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <Building2 size={14} />
              The All-in-One Business Hub
            </div>
            <h1>
              Register, Manage &<br />
              <span className="highlight">Grow Your Business</span>
            </h1>
            <p className="hero-desc">
              BizHub gives businesses a powerful home — register your profile, upload
              photos, track transactions, and get discovered by customers.
            </p>
            <div className="hero-actions">
              <Link href="/auth/signup" className="btn btn-primary btn-lg">
                Register your business
                <ArrowRight size={18} />
              </Link>
              <Link href="/businesses" className="btn btn-secondary btn-lg">
                <Search size={18} />
                Explore businesses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="container">
          <p className="section-label">Everything you need</p>
          <h2 className="section-title">Built for modern businesses</h2>
          <p className="section-desc">
            From registration to revenue tracking — everything your business needs,
            all in one place.
          </p>

          <div className="features-grid">
            {[
              {
                icon: <Store size={22} />,
                title: 'Business Registration',
                desc: 'Create a rich business profile with contact info, location, category, and branding in minutes.',
              },
              {
                icon: <Image size={22} />,
                title: 'Photo Gallery',
                desc: 'Upload and showcase your products, services, and premises with a beautiful gallery.',
              },
              {
                icon: <Receipt size={22} />,
                title: 'Transaction Tracking',
                desc: 'Record income and expenses, categorize transactions, and monitor your financial health.',
              },
              {
                icon: <LayoutDashboard size={22} />,
                title: 'Business Dashboard',
                desc: 'Get a bird\'s eye view of your business with visual stats, charts, and summaries.',
              },
              {
                icon: <Search size={22} />,
                title: 'Searchable Hub',
                desc: 'Customers can find and browse your business in the public hub by name or category.',
              },
              {
                icon: <Shield size={22} />,
                title: 'Secure & Private',
                desc: 'Your financial data is private. Powered by Supabase with row-level security.',
              },
            ].map((f) => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{
        background: 'linear-gradient(135deg, #F0F7FF, #E0EFFE)',
        borderTop: '1px solid #DBEAFE',
        padding: 'var(--space-20) 0',
        textAlign: 'center'
      }}>
        <div className="container">
          <h2 className="section-title" style={{ marginBottom: 'var(--space-4)' }}>
            Ready to get started?
          </h2>
          <p className="section-desc">
            Join hundreds of businesses managing their presence on BizHub.
          </p>
          <Link href="/auth/signup" className="btn btn-primary btn-lg">
            Create free account
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: 'var(--color-white)',
        borderTop: '1px solid var(--color-border)',
        padding: 'var(--space-8) 0',
        textAlign: 'center'
      }}>
        <div className="container">
          <div className="navbar-logo" style={{ justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
            <Building2 size={20} />
            Biz<span>Hub</span>
          </div>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
            © {new Date().getFullYear()} BizHub. All rights reserved.
          </p>
        </div>
      </footer>
    </>
  )
}
