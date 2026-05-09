import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../api';
import StatCard from '../../components/ui/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

const TIER_COLORS = { starter: '#3B82F6', member: '#FF6D00', vip: '#A855F7' };

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => analyticsApi.dashboard().then((r) => r.data),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-bold text-cream">Dashboard</h1>
        <p className="text-muted text-sm mt-1">Platform overview</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-surface2" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Members" value={data?.totalMembers ?? 0} />
          <StatCard label="Active Members" value={data?.activeMembers ?? 0} />
          <StatCard label="New This Month" value={data?.newThisMonth ?? 0} />
          <StatCard label="Est. MRR" value={`$${data?.mrr ?? 0}`} accent />
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="text-base font-semibold text-cream mb-4">Member Growth (6 months)</h2>
          {isLoading ? (
            <div className="h-48 animate-pulse bg-surface2 rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.monthlyGrowth ?? []} barSize={28}>
                <XAxis dataKey="month" tick={{ fill: '#9B9BAA', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9B9BAA', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#0F0F1A', border: '1px solid #1E1E30', borderRadius: 8, color: '#F0EBE0' }}
                  cursor={{ fill: '#1E1E30' }}
                />
                <Bar dataKey="members" fill="#FF6D00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="text-base font-semibold text-cream mb-4">Revenue by Tier</h2>
          {isLoading ? (
            <div className="h-48 animate-pulse bg-surface2 rounded-lg" />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={data?.revenueByTier ?? []} dataKey="mrr" nameKey="tier" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                    {(data?.revenueByTier ?? []).map((entry) => (
                      <Cell key={entry.tier} fill={TIER_COLORS[entry.tier] || '#1E1E30'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#0F0F1A', border: '1px solid #1E1E30', borderRadius: 8, color: '#F0EBE0' }}
                    formatter={(v) => [`$${v}`, 'MRR']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {(data?.revenueByTier ?? []).map((t) => (
                  <div key={t.tier} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[t.tier] }} />
                      <span className="text-muted capitalize">{t.tier}</span>
                    </div>
                    <span className="text-cream font-medium">${t.mrr} · {t.members}m</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="text-base font-semibold text-cream mb-4">Recent Members</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-surface2 rounded-lg" />)}
          </div>
        ) : !data?.recentMembers?.length ? (
          <p className="text-muted text-sm">No members yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {data.recentMembers.map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold flex-shrink-0">
                  {m.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cream font-medium truncate">{m.name}</p>
                  <p className="text-xs text-muted truncate">{m.email}</p>
                </div>
                <span className={`badge-${m.tier}`}>{m.tier}</span>
                <span className="text-xs text-muted hidden sm:block">{formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
