import { useQuery } from '@tanstack/react-query';
import { liveApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const statusBadge = { live: 'bg-red-500/20 text-red-400', scheduled: 'bg-yellow-500/20 text-yellow-400', ended: 'bg-surface2 text-muted' };
const statusLabel = { live: '🔴 Live Now', scheduled: '📅 Scheduled', ended: '⬜ Ended' };

export default function LiveSessions() {
  const { user } = useAuth();
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: () => liveApi.list().then((r) => r.data),
    refetchInterval: 15_000,
  });

  const live = sessions.filter((s) => s.status === 'live');
  const scheduled = sessions.filter((s) => s.status === 'scheduled');
  const ended = sessions.filter((s) => s.status === 'ended');

  const SessionCard = ({ session }) => (
    <div className={`card hover:border-accent/30 transition-colors ${session.locked ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <span className={`badge text-xs px-2.5 py-1 rounded-full font-medium ${statusBadge[session.status]}`}>
          {statusLabel[session.status]}
        </span>
        {session.tierAccess && (
          <span className={`badge text-[10px] ${{ free: 'badge-active', starter: 'badge-starter', member: 'badge-member', vip: 'badge-vip' }[session.tierAccess]}`}>
            {session.tierAccess}
          </span>
        )}
      </div>
      <h3 className="font-semibold text-cream mb-1">{session.title}</h3>
      {session.description && <p className="text-sm text-muted mb-3 line-clamp-2">{session.description}</p>}
      {session.scheduledAt && session.status === 'scheduled' && (
        <p className="text-xs text-muted mb-3">{format(new Date(session.scheduledAt), 'PPP p')}</p>
      )}
      {session.locked ? (
        <div className="flex items-center gap-2 mt-2">
          <span className="text-xs text-muted">🔒 Requires <span className="text-accent capitalize">{session.tierAccess}</span> plan</span>
          <Link to="/membership" className="text-xs text-accent hover:underline">Upgrade</Link>
        </div>
      ) : (
        <div className="flex gap-2 mt-2">
          {session.status === 'live' && (
            <button className="btn-primary text-xs py-1.5 px-4 animate-pulse">Join Live</button>
          )}
          {session.status === 'ended' && session.recordingUrl && (
            <a href={session.recordingUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-xs py-1.5 px-4">▶ Watch Recording</a>
          )}
          {session.status === 'ended' && !session.recordingUrl && (
            <span className="text-xs text-muted">Recording unavailable</span>
          )}
        </div>
      )}
    </div>
  );

  if (isLoading) return (
    <div className="space-y-4 max-w-4xl">
      {[...Array(3)].map((_, i) => <div key={i} className="card h-32 animate-pulse bg-surface2" />)}
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-cream">Live Sessions</h1>
        <p className="text-muted text-sm mt-1">Join live, watch recordings, stay in the loop.</p>
      </div>

      {live.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Happening Now</h2>
          <div className="grid gap-4">{live.map((s) => <SessionCard key={s.id} session={s} />)}</div>
        </div>
      )}

      {scheduled.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Upcoming</h2>
          <div className="grid gap-4">{scheduled.map((s) => <SessionCard key={s.id} session={s} />)}</div>
        </div>
      )}

      {ended.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Past Sessions</h2>
          <div className="grid gap-4">{ended.map((s) => <SessionCard key={s.id} session={s} />)}</div>
        </div>
      )}

      {!sessions.length && (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📡</p>
          <p className="text-muted">No live sessions yet. Check back soon.</p>
        </div>
      )}
    </div>
  );
}
