import { useQuery } from '@tanstack/react-query';
import { stripeApi } from '../../api';
import StatCard from '../../components/ui/StatCard';
import { format } from 'date-fns';

export default function RevenuePage() {
  const { data: mrrData, isLoading: mrrLoading } = useQuery({
    queryKey: ['admin-mrr'],
    queryFn: () => stripeApi.mrr().then((r) => r.data),
  });

  const { data: transactions = [], isLoading: txLoading } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => stripeApi.transactions().then((r) => r.data),
  });

  const TIER_COLORS = { starter: 'badge-starter', member: 'badge-member', vip: 'badge-vip' };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-cream">Revenue</h1>
        <p className="text-muted text-sm mt-1">Stripe billing overview</p>
      </div>

      {mrrLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-surface2" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Monthly Recurring Revenue" value={`$${mrrData?.mrr ?? 0}`} accent />
          <StatCard label="Active Subscriptions" value={mrrData?.activeSubscriptions ?? 0} />
          <StatCard label="Total Transactions" value={transactions.length} />
        </div>
      )}

      {!mrrLoading && mrrData?.revenueByTier && (
        <div className="card">
          <h2 className="text-base font-semibold text-cream mb-4">Revenue by Tier</h2>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(mrrData.revenueByTier).map(([tier, amount]) => (
              <div key={tier} className="bg-surface2 rounded-xl p-4 text-center">
                <span className={`${TIER_COLORS[tier] || 'badge'} mb-2 inline-block capitalize`}>{tier}</span>
                <p className="text-2xl font-bold text-cream mt-1">${Math.round(amount)}</p>
                <p className="text-xs text-muted">/ month</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-cream">Recent Transactions</h2>
        </div>
        {txLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-surface2 rounded-lg" />)}
          </div>
        ) : !transactions.length ? (
          <div className="p-12 text-center text-muted">No transactions yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs text-muted font-medium uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider hidden sm:table-cell">Customer</th>
                <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider hidden md:table-cell">Description</th>
                <th className="text-right px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider">Amount</th>
                <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-surface2 transition-colors">
                  <td className="px-6 py-3 text-muted text-xs">{format(new Date(tx.date), 'MMM d, yyyy')}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted text-xs truncate max-w-[160px]">{tx.email || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted text-xs truncate max-w-[200px]">{tx.description || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-cream">
                    ${tx.amount.toFixed(2)} <span className="text-muted text-xs uppercase">{tx.currency}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${tx.status === 'succeeded' ? 'badge-active' : tx.status === 'failed' ? 'badge-cancelled' : 'badge-inactive'}`}>
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
