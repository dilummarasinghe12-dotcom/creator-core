import { Link } from 'react-router-dom';

const tiers = [
  {
    name: 'Starter',
    price: '$9',
    period: '/mo',
    features: ['Access to free content', 'Community access', 'Monthly Q&A replay', 'Email support'],
    cta: 'Get Started',
    tier: 'starter',
    highlight: false,
  },
  {
    name: 'Member',
    price: '$29',
    period: '/mo',
    features: ['Everything in Starter', 'Full content library', 'Live session access', 'Direct community chat', 'Weekly office hours'],
    cta: 'Join Now',
    tier: 'member',
    highlight: true,
  },
  {
    name: 'VIP',
    price: '$99',
    period: '/mo',
    features: ['Everything in Member', '1-on-1 calls (2/month)', 'Private Discord channel', 'Early product access', 'Personal review & feedback'],
    cta: 'Go VIP',
    tier: 'vip',
    highlight: false,
  },
];

const features = [
  { icon: '▶', title: 'Exclusive Content', desc: 'Videos, PDFs, tools — gated by your membership tier.' },
  { icon: '◉', title: 'Live Sessions', desc: 'Go live directly to your members with built-in recording.' },
  { icon: '◆', title: 'Real Revenue', desc: 'Stripe-powered subscriptions. See your MRR grow in real time.' },
  { icon: '⊞', title: 'Member Dashboard', desc: 'Every member gets a clean personal dashboard and profile.' },
  { icon: '◎', title: 'Member Management', desc: 'Invite, remove, and message members from one place.' },
  { icon: '◈', title: 'Analytics', desc: 'Churn rate, MRR, growth charts. Data you can actually use.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-cream">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-sm">CC</div>
          <span className="font-bold text-cream">Creator Core</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
          <Link to="/signup" className="btn-primary text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center">
        <span className="inline-block bg-accent/10 text-accent text-xs font-semibold px-3 py-1 rounded-full mb-6 uppercase tracking-wider">Membership OS for Creators</span>
        <h1 className="text-5xl md:text-6xl font-extrabold text-cream leading-tight mb-6">
          Run your paid<br />community like a <span className="text-accent">pro</span>
        </h1>
        <p className="text-muted text-lg max-w-xl mx-auto mb-10">
          Creator Core is the all-in-one platform for creators who want real memberships, real revenue, and real tools — not a bloated mess.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link to="/signup" className="btn-primary px-8 py-3 text-base">Start Your Membership</Link>
          <Link to="/login" className="btn-secondary px-8 py-3 text-base">Sign In</Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center text-cream mb-12">Everything you need, nothing you don't</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(({ icon, title, desc }) => (
            <div key={title} className="card hover:border-accent/30 transition-colors">
              <div className="text-2xl mb-3">{icon}</div>
              <h3 className="font-semibold text-cream mb-1">{title}</h3>
              <p className="text-sm text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-2xl font-bold text-center text-cream mb-4">Simple, transparent pricing</h2>
        <p className="text-center text-muted mb-12">Choose the tier that fits your goals. Upgrade anytime.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <div key={tier.name} className={`card relative ${tier.highlight ? 'border-accent ring-1 ring-accent' : ''}`}>
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">Most Popular</span>
                </div>
              )}
              <p className="text-muted text-sm font-medium mb-1">{tier.name}</p>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-extrabold text-cream">{tier.price}</span>
                <span className="text-muted mb-1">{tier.period}</span>
              </div>
              <ul className="space-y-2.5 mb-8">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted">
                    <span className="text-accent mt-0.5 flex-shrink-0">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to={`/signup?tier=${tier.tier}`} className={`block text-center font-semibold py-2.5 rounded-lg transition-colors ${tier.highlight ? 'bg-accent hover:bg-accent-hover text-white' : 'bg-surface2 hover:bg-border text-cream border border-border'}`}>
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-cream mb-4">Ready to build your community?</h2>
        <p className="text-muted mb-8">Join creators who are earning real money from their knowledge and audience.</p>
        <Link to="/signup" className="btn-primary px-10 py-3 text-base">Get Started Free</Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8 text-center text-muted text-sm">
        <p>© {new Date().getFullYear()} Creator Core. Built for serious creators.</p>
      </footer>
    </div>
  );
}
