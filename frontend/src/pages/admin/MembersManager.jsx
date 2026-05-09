import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '../../api';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const TIERS = ['starter', 'member', 'vip'];
const STATUSES = ['active', 'inactive', 'cancelled'];

export default function MembersManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [inviteModal, setInviteModal] = useState(false);
  const [emailModal, setEmailModal] = useState(null);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', tier: 'starter' });
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['admin-members', tierFilter],
    queryFn: () => membersApi.list(tierFilter ? { tier: tierFilter } : {}).then((r) => r.data),
  });

  const invite = useMutation({
    mutationFn: (data) => membersApi.invite(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-members'] }); toast.success('Invitation sent'); setInviteModal(false); setInviteForm({ name: '', email: '', tier: 'starter' }); },
    onError: () => toast.error('Failed to send invite'),
  });

  const updateMember = useMutation({
    mutationFn: ({ id, data }) => membersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-members'] }); toast.success('Updated'); },
    onError: () => toast.error('Failed to update'),
  });

  const removeMember = useMutation({
    mutationFn: (id) => membersApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-members'] }); toast.success('Member removed'); },
    onError: () => toast.error('Failed to remove'),
  });

  const sendEmail = useMutation({
    mutationFn: ({ id, data }) => membersApi.email(id, data),
    onSuccess: () => { toast.success('Email sent'); setEmailModal(null); setEmailForm({ subject: '', message: '' }); },
    onError: () => toast.error('Failed to send email'),
  });

  const filtered = members.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleRemove = (m) => {
    if (!confirm(`Remove ${m.name}?`)) return;
    removeMember.mutate(m.id);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cream">Members</h1>
          <p className="text-muted text-sm mt-1">{members.length} total members</p>
        </div>
        <button onClick={() => setInviteModal(true)} className="btn-primary">+ Invite Member</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          className="input flex-1"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input sm:w-40" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
          <option value="">All tiers</option>
          {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse bg-surface2 rounded-lg" />)}
          </div>
        ) : !filtered.length ? (
          <div className="p-12 text-center text-muted">No members found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs text-muted font-medium uppercase tracking-wider">Member</th>
                <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider hidden sm:table-cell">Tier</th>
                <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider hidden lg:table-cell">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-surface2 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent text-sm font-bold flex-shrink-0">
                        {m.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-cream font-medium truncate">{m.name}</p>
                        <p className="text-xs text-muted truncate">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <select
                      className="bg-transparent text-sm focus:outline-none cursor-pointer"
                      value={m.tier}
                      onChange={(e) => updateMember.mutate({ id: m.id, data: { tier: e.target.value } })}
                    >
                      {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <select
                      className="bg-transparent text-sm focus:outline-none cursor-pointer"
                      value={m.status}
                      onChange={(e) => updateMember.mutate({ id: m.id, data: { status: e.target.value } })}
                    >
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted text-xs">
                    {formatDistanceToNow(new Date(m.joinedAt), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEmailModal(m)} className="btn-ghost text-xs py-1 px-2">Email</button>
                      <button onClick={() => handleRemove(m)} className="btn-ghost text-xs py-1 px-2 text-red-400 hover:text-red-300">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={inviteModal} onClose={() => setInviteModal(false)} title="Invite Member">
        <form onSubmit={(e) => { e.preventDefault(); invite.mutate(inviteForm); }} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={inviteForm.name} onChange={(e) => setInviteForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Starting Tier</label>
            <select className="input" value={inviteForm.tier} onChange={(e) => setInviteForm((f) => ({ ...f, tier: e.target.value }))}>
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={invite.isPending} className="btn-primary">
              {invite.isPending ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={!!emailModal} onClose={() => setEmailModal(null)} title={`Email ${emailModal?.name}`}>
        <form onSubmit={(e) => { e.preventDefault(); sendEmail.mutate({ id: emailModal.id, data: emailForm }); }} className="space-y-4">
          <div>
            <label className="label">Subject</label>
            <input className="input" value={emailForm.subject} onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Message</label>
            <textarea className="input" rows={5} value={emailForm.message} onChange={(e) => setEmailForm((f) => ({ ...f, message: e.target.value }))} required />
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={sendEmail.isPending} className="btn-primary">
              {sendEmail.isPending ? 'Sending…' : 'Send Email'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
