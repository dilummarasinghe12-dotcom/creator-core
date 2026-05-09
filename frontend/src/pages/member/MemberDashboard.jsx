import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/ui/StatCard';
import { formatDistanceToNow } from 'date-fns';

export default function MemberDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['member-stats'],
    queryFn: () => analyticsApi.me().then((r) => r.data),
  });

  const tierColors = { starter: 'badge-starter', member: 'badge-member', vip: 'badge-vip' };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-cream">Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-muted text-sm mt-1">Here's your membership overview</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-24 animate-pulse bg-surface2" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Membership Tier" value={<span className={tierColors[user?.tier]}>{user?.tier}</span>} />
          <StatCard label="Content Viewed" value={data?.viewCount ?? 0} />
          <StatCard label="Downloads" value={data?.downloadCount ?? 0} />
          <StatCard label="Days as Member" value={data?.daysSinceJoin ?? 0} accent />
        </div>
      )}

      {/* Recent Activity */}
      <div className="card">
        <h2 className="text-base font-semibold text-cream mb-4">Recent Activity</h2>
        {!data?.recentActivity?.length ? (
          <p className="text-muted text-sm">No activity yet. Explore the content library to get started.</p>
        ) : (
          <div className="space-y-3">
            {data.recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center text-base flex-shrink-0">
                  {a.product?.emoji || (a.eventType === 'login' ? '🔑' : '◉')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cream truncate">
                    {a.eventType === 'view' && `Viewed ${a.product?.title || 'content'}`}
                    {a.eventType === 'download' && `Downloaded ${a.product?.title || 'file'}`}
                    {a.eventType === 'login' && 'Signed in'}
                    {a.eventType === 'signup' && 'Joined Creator Core'}
                  </p>
                  <p className="text-xs text-muted">{formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upgrade prompt for starter */}
      {user?.tier === 'starter' && (
        <div className="card border-accent/30">
          <div className="flex items-start gap-4">
            <div className="text-2xl">◆</div>
            <div>
              <h3 className="font-semibold text-cream mb-1">Unlock more content</h3>
              <p className="text-sm text-muted mb-3">Upgrade to Member or VIP to access the full content library, live sessions, and more.</p>
              <a href="/membership" className="btn-primary text-sm">Upgrade Plan</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
