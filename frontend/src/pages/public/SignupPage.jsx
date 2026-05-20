import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { stripeApi } from '../../api';
import toast from 'react-hot-toast';

const tiers = [
  { id: 'starter', label: 'Starter', price: '$9/mo', desc: 'Content library + community' },
  { id: 'member', label: 'Member', price: '$29/mo', desc: 'Full access + live sessions', popular: true },
  { id: 'vip', label: 'VIP', price: '$99/mo', desc: '1-on-1 calls + private channel' },
];

export default function SignupPage() {
  const { register } = useAuth();
  const [params] = useSearchParams();
  const workspaceId = params.get('workspace');
  const [form, setForm] = useState({ name: '', email: '', password: '', tier: params.get('tier') || 'member' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      await register({ name: form.name, email: form.email, password: form.password, tier: form.tier, workspaceId });
      // Redirect to Stripe checkout
      const { data } = await stripeApi.checkout(form.tier);
      window.location.href = data.url;
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white font-bold mx-auto mb-4">CC</div>
          <h1 className="text-2xl font-bold text-cream">Join Creator Core</h1>
          <p className="text-muted text-sm mt-1">Choose your plan, then complete payment</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Tier selection */}
          <div className="space-y-2">
            {tiers.map((t) => (
              <label key={t.id} className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-colors ${form.tier === t.id ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:border-accent/40'}`}>
                <input type="radio" name="tier" value={t.id} checked={form.tier === t.id} onChange={(e) => setForm({ ...form, tier: e.target.value })} className="accent-accent" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-cream">{t.label}</span>
                    {t.popular && <span className="text-[10px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-medium uppercase tracking-wider">Popular</span>}
                  </div>
                  <p className="text-xs text-muted">{t.desc}</p>
                </div>
                <span className="text-sm font-bold text-cream">{t.price}</span>
              </label>
            ))}
          </div>

          <div className="card space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input className="input" type="text" placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" placeholder="Min. 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creating account...' : 'Continue to Payment →'}
            </button>
          </div>

          <p className="text-center text-xs text-muted">
            Payments powered by Stripe. Cancel anytime.
          </p>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already a member?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
