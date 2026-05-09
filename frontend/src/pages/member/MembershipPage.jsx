import { useQuery, useMutation } from '@tanstack/react-query';
import { stripeApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TIERS = [
  { id: 'starter', label: 'Starter', price: '$9/mo', features: ['Free content', 'Community access'] },
  { id: 'member', label: 'Member', price: '$29/mo', features: ['Full content library', 'Live sessions', 'Office hours'] },
  { id: 'vip', label: 'VIP', price: '$99/mo', features: ['Everything in Member', '1-on-1 calls', 'Private channel'] },
];

export default function MembershipPage() {
  const { user } = useAuth();

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => stripeApi.invoices().then((r) => r.data),
  });

  const portalMutation = useMutation({
    mutationFn: () => stripeApi.portal(),
    onSuccess: (res) => { window.location.href = res.data.url; },
    onError: () => toast.error('Could not open billing portal'),
  });

  const checkoutMutation = useMutation({
    mutationFn: (tier) => stripeApi.checkout(tier),
    onSuccess: (res) => { window.location.href = res.data.url; },
    onError: () => toast.error('Could not start checkout'),
  });

  const tierColors = { starter: 'badge-starter', member: 'badge-member', vip: 'badge-vip' };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-cream">Membership</h1>
        <p className="text-muted text-sm mt-1">Manage your plan and billing</p>
      </div>

      {/* Current plan */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider mb-1">Current Plan</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold text-cream capitalize">{user?.tier}</span>
              <span className={tierColors[user?.tier]}>{user?.tier}</span>
            </div>
            <p className={`text-sm mt-1 font-medium ${user?.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>
              Status: {user?.status}
            </p>
          </div>
          {user?.stripeCustomerId && (
            <button onClick={() => portalMutation.mutate()} disabled={portalMutation.isPending} className="btn-secondary text-sm">
              {portalMutation.isPending ? 'Opening...' : 'Manage Billing →'}
            </button>
          )}
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">All Plans</h2>
        <div className="grid gap-3">
          {TIERS.map((t) => (
            <div key={t.id} className={`card flex items-center justify-between gap-4 ${t.id === user?.tier ? 'border-accent' : ''}`}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-cream">{t.label}</span>
                  <span className="text-sm text-muted">{t.price}</span>
                  {t.id === user?.tier && <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">Current</span>}
                </div>
                <p className="text-xs text-muted">{t.features.join(' · ')}</p>
              </div>
              {t.id !== user?.tier && (
                <button onClick={() => checkoutMutation.mutate(t.id)} disabled={checkoutMutation.isPending} className="btn-primary text-sm flex-shrink-0">
                  {user?.tier === 'vip' || (user?.tier === 'member' && t.id === 'starter') ? 'Downgrade' : 'Upgrade'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invoice history */}
      <div className="card">
        <h2 className="text-base font-semibold text-cream mb-4">Invoice History</h2>
        {invoicesLoading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-surface2 rounded animate-pulse" />)}</div>
        ) : !invoices.length ? (
          <p className="text-muted text-sm">No invoices yet.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm text-cream">${inv.amount.toFixed(2)} {inv.currency?.toUpperCase()}</p>
                  <p className="text-xs text-muted">{format(new Date(inv.date), 'PP')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge text-xs ${inv.status === 'paid' ? 'badge-active' : 'badge-inactive'}`}>{inv.status}</span>
                  {inv.pdf && <a href={inv.pdf} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">PDF</a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
