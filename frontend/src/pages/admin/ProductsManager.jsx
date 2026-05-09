import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../../api';
import Modal from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const TYPES = ['video', 'pdf', 'tool', 'live'];
const TIERS = ['starter', 'member', 'vip'];

function ProductForm({ initial = {}, onSubmit, loading }) {
  const [form, setForm] = useState({
    title: initial.title || '',
    description: initial.description || '',
    type: initial.type || 'video',
    tierAccess: initial.tierAccess || 'starter',
    emoji: initial.emoji || '',
    duration: initial.duration || '',
    published: initial.published ?? false,
  });
  const [file, setFile] = useState(null);
  const [thumb, setThumb] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    if (file) fd.append('file', file);
    if (thumb) fd.append('thumbnail', thumb);
    onSubmit(fd);
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const ACCEPT = { video: 'video/mp4,video/webm', pdf: 'application/pdf', tool: '*', live: '*' };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label">Title</label>
        <input className="input" value={form.title} onChange={set('title')} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={set('type')}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tier Access</label>
          <select className="input" value={form.tierAccess} onChange={set('tierAccess')}>
            {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={3} value={form.description} onChange={set('description')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Emoji</label>
          <input className="input" value={form.emoji} onChange={set('emoji')} placeholder="🎬" />
        </div>
        <div>
          <label className="label">Duration</label>
          <input className="input" value={form.duration} onChange={set('duration')} placeholder="45 min" />
        </div>
      </div>
      <div>
        <label className="label">
          File {initial.fileUrl && <span className="text-xs text-accent ml-1">(already uploaded — leave blank to keep)</span>}
        </label>
        <input
          type="file"
          className="input text-sm"
          accept={ACCEPT[form.type] || '*'}
          onChange={(e) => setFile(e.target.files[0])}
        />
        {file && <p className="text-xs text-muted mt-1">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}
      </div>
      <div>
        <label className="label">
          Thumbnail {initial.thumbnailUrl && <span className="text-xs text-accent ml-1">(already uploaded — leave blank to keep)</span>}
        </label>
        <input type="file" accept="image/*" className="input text-sm" onChange={(e) => setThumb(e.target.files[0])} />
        {thumb && <p className="text-xs text-muted mt-1">{thumb.name}</p>}
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.published} onChange={set('published')} className="w-4 h-4 accent-accent" />
        <span className="text-sm text-cream">Published</span>
      </label>
      {loading && (
        <div className="space-y-1">
          <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full animate-pulse w-full" />
          </div>
          <p className="text-xs text-muted text-center">Uploading… large files may take a moment</p>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Uploading…' : initial.id ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>
  );
}

export default function ProductsManager() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // null | 'create' | product object

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: () => productsApi.list().then((r) => r.data),
  });

  const create = useMutation({
    mutationFn: (fd) => productsApi.create(fd),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product created'); setModal(null); },
    onError: () => toast.error('Failed to create product'),
  });

  const update = useMutation({
    mutationFn: ({ id, fd }) => productsApi.update(id, fd),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Product updated'); setModal(null); },
    onError: () => toast.error('Failed to update product'),
  });

  const remove = useMutation({
    mutationFn: (id) => productsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const handleDelete = (p) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    remove.mutate(p.id);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-cream">Products</h1>
          <p className="text-muted text-sm mt-1">Manage your content library</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-primary">+ New Product</button>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-10 animate-pulse bg-surface2 rounded-lg" />)}
          </div>
        ) : !products.length ? (
          <div className="p-12 text-center text-muted">No products yet. Create your first one.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-6 py-3 text-xs text-muted font-medium uppercase tracking-wider">Product</th>
                <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider hidden sm:table-cell">Type</th>
                <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider hidden md:table-cell">Tier</th>
                <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider hidden lg:table-cell">Views</th>
                <th className="text-left px-4 py-3 text-xs text-muted font-medium uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-surface2 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl flex-shrink-0">{p.emoji || '▶'}</span>
                      <div className="min-w-0">
                        <p className="text-cream font-medium truncate max-w-xs">{p.title}</p>
                        <p className="text-xs text-muted">{formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-muted capitalize">{p.type}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`badge-${p.tierAccess}`}>{p.tierAccess}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted">{p.viewCount}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${p.published ? 'badge-active' : 'bg-surface2 text-muted'}`}>
                      {p.published ? 'Live' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setModal(p)} className="btn-ghost text-xs py-1 px-2">Edit</button>
                      <button onClick={() => handleDelete(p)} className="btn-ghost text-xs py-1 px-2 text-red-400 hover:text-red-300">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'New Product' : `Edit: ${modal?.title}`}
        size="lg"
      >
        {modal && (
          <ProductForm
            initial={modal === 'create' ? {} : modal}
            onSubmit={(fd) => modal === 'create' ? create.mutate(fd) : update.mutate({ id: modal.id, fd })}
            loading={create.isPending || update.isPending}
          />
        )}
      </Modal>
    </div>
  );
}
