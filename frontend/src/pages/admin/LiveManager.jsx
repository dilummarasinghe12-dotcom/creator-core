import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { liveApi } from '../../api';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { format, formatDistanceToNow } from 'date-fns';

const TIERS = ['starter', 'member', 'vip'];

const STATUS_BADGE = {
  scheduled: 'bg-blue-500/10 text-blue-400',
  live: 'bg-green-500/10 text-green-400',
  ended: 'bg-surface2 text-muted',
};

function SessionForm({ initial = {}, onSubmit, loading }) {
  const [form, setForm] = useState({
    title: initial.title || '',
    description: initial.description || '',
    tierAccess: initial.tierAccess || 'starter',
    scheduledAt: initial.scheduledAt ? initial.scheduledAt.slice(0, 16) : '',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div>
        <label className="label">Title</label>
        <input className="input" value={form.title} onChange={set('title')} required />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={3} value={form.description} onChange={set('description')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Tier Access</label>
          <select className="input" value={form.tierAccess} onChange={set('tierAccess')}>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Scheduled At</label>
          <input type="datetime-local" className="input" value={form.scheduledAt} onChange={set('scheduledAt')} />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : initial.id ? 'Save Changes' : 'Schedule Session'}
        </button>
      </div>
    </form>
  );
}

export default function LiveManager() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [endModal, setEndModal] = useState(null);
  const [recordingUrl, setRecordingUrl] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['admin-live'],
    queryFn: () => liveApi.list().then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (data) => liveApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-live'] }); toast.success('Session scheduled'); setModal(null); },
    onError: () => toast.error('Failed to create session'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }) => liveApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-live'] }); toast.success('Updated'); setModal(null); },
    onError: () => toast.error('Failed to update'),
  });

  const start = useMutation({
    mutationFn: (id) => liveApi.start(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-live'] }); toast.success('Session started — you\'re live!'); },
    onError: () => toast.error('Failed to start'),
  });

  const end = useMutation({
    mutationFn: ({ id, recordingUrl }) => liveApi.end(id, { recordingUrl }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-live'] }); toast.success('Session ended'); setEndModal(null); setRecordingUrl(''); },
    onError: () => toast.error('Failed to end session'),
  });

  const remove = useMutation({
    mutationFn: (id) => liveApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-live'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleDelete = (s) => {
    if (!confirm(`Delete "${s.title}"?`)) return;
    remove.mutate(s.id);
  };

  const liveSessions = sessions.filter((s) => s.status === 'live');
  const scheduled = sessions.filter((s) => s.status === 'scheduled');
  const ended = sessions.filter((s) => s.status === 'ended');

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cream">Live Sessions</h1>
          <p className="text-muted text-sm mt-1">Manage your live events</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">+ Schedule Session</button>
      </div>

      {liveSessions.length > 0 && (
        <div className="card border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <h2 className="text-sm font-semibold text-green-400">Currently Live</h2>
          </div>
          {liveSessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-cream font-semibold">{s.title}</p>
                <p className="text-xs text-muted">{s.viewerCount} viewers · Started {s.startedAt && formatDistanceToNow(new Date(s.startedAt), { addSuffix: true })}</p>
              </div>
              <button onClick={() => setEndModal(s)} className="btn-secondary text-sm">End Session</button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {isLoading ? (
          [...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-surface2" />)
        ) : !sessions.length ? (
          <div className="card text-center text-muted py-12">No sessions yet. Schedule your first live event.</div>
        ) : (
          [...scheduled, ...ended].map((s) => (
            <div key={s.id} className="card flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`badge ${STATUS_BADGE[s.status]}`}>{s.status}</span>
                  <span className={`badge-${s.tierAccess}`}>{s.tierAccess}</span>
                </div>
                <p className="text-cream font-medium truncate">{s.title}</p>
                {s.scheduledAt && (
                  <p className="text-xs text-muted mt-0.5">{format(new Date(s.scheduledAt), 'MMM d, yyyy · h:mm a')}</p>
                )}
                {s.status === 'ended' && s.viewerCount > 0 && (
                  <p className="text-xs text-muted">{s.viewerCount} total viewers</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {s.status === 'scheduled' && (
                  <button onClick={() => start.mutate(s.id)} disabled={start.isPending} className="btn-primary text-sm">Go Live</button>
                )}
                <button onClick={() => setModal(s)} className="btn-ghost text-sm">Edit</button>
                <button onClick={() => handleDelete(s)} className="btn-ghost text-sm text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Schedule Session' : `Edit: ${modal?.title}`}>
        {modal && (
          <SessionForm
            initial={modal === 'create' ? {} : modal}
            onSubmit={(data) => modal === 'create' ? create.mutate(data) : update.mutate({ id: modal.id, data })}
            loading={create.isPending || update.isPending}
          />
        )}
      </Modal>

      <Modal open={!!endModal} onClose={() => setEndModal(null)} title="End Session" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Recording URL (optional)</label>
            <input className="input" placeholder="https://…" value={recordingUrl} onChange={(e) => setRecordingUrl(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setEndModal(null)} className="btn-secondary">Cancel</button>
            <button onClick={() => end.mutate({ id: endModal.id, recordingUrl })} disabled={end.isPending} className="btn-primary">
              {end.isPending ? 'Ending…' : 'End Session'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
