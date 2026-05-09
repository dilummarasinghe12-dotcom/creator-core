import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/ui/Modal';
import { Link } from 'react-router-dom';

const TYPE_ICONS = { video: '▶', pdf: '📄', tool: '🔧', live: '◉' };
const TYPES = ['all', 'video', 'pdf', 'tool', 'live'];

const tierLabel = (t) => ({ free: 'Free', starter: 'Starter', member: 'Member', vip: 'VIP' }[t] || t);
const tierBadge = (t) => ({ free: 'badge-active', starter: 'badge-starter', member: 'badge-member', vip: 'badge-vip' }[t] || 'badge-starter');

function ContentViewer({ product, onClose }) {
  if (!product) return null;

  const handleDownloadClick = () => {
    productsApi.trackDownload(product.id).catch(() => {});
  };

  return (
    <Modal open onClose={onClose} title={product.title} size="xl">
      <div className="space-y-4">
        {product.type === 'video' && (
          <video
            src={product.fileUrl}
            controls
            autoPlay
            className="w-full rounded-lg bg-black max-h-[60vh]"
            onContextMenu={(e) => e.preventDefault()}
          >
            Your browser does not support video playback.
          </video>
        )}

        {product.type === 'pdf' && (
          <iframe
            src={product.fileUrl}
            title={product.title}
            className="w-full rounded-lg bg-surface2"
            style={{ height: '60vh' }}
          />
        )}

        {(product.type === 'tool' || product.type === 'live') && product.fileUrl && (
          <div className="bg-surface2 rounded-lg p-8 text-center">
            <p className="text-3xl mb-3">{product.emoji || TYPE_ICONS[product.type]}</p>
            <p className="text-cream font-medium mb-1">{product.title}</p>
            {product.description && <p className="text-muted text-sm mb-4">{product.description}</p>}
            <a
              href={product.fileUrl}
              download
              onClick={handleDownloadClick}
              className="btn-primary inline-block"
            >
              Download File
            </a>
          </div>
        )}

        {!product.fileUrl && (
          <div className="bg-surface2 rounded-lg p-8 text-center">
            <p className="text-muted text-sm">No file attached to this content yet.</p>
          </div>
        )}

        <div className="flex items-start gap-4 pt-1">
          <div className="flex-1 min-w-0">
            {product.description && <p className="text-sm text-muted">{product.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted">
              <span className="capitalize">{product.type}</span>
              {product.duration && <span>· {product.duration}</span>}
              <span>· {product.viewCount} views</span>
            </div>
          </div>
          {product.fileUrl && product.type !== 'video' && (
            <a
              href={product.fileUrl}
              download
              onClick={handleDownloadClick}
              className="btn-secondary text-sm flex-shrink-0"
            >
              ↓ Download
            </a>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default function ContentLibrary() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all');
  const [viewing, setViewing] = useState(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', filter],
    queryFn: () => productsApi.list(filter !== 'all' ? { type: filter } : {}).then((r) => r.data),
  });

  const handleOpen = (p) => {
    setViewing(p);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-cream">Content Library</h1>
        <p className="text-muted text-sm mt-1">
          Your <span className="text-accent font-medium capitalize">{user?.tier}</span> plan gives you access to{' '}
          {user?.tier === 'vip' ? 'everything' : user?.tier === 'member' ? 'Member and below' : 'Starter and free content'}.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TYPES.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${filter === t ? 'bg-accent text-white' : 'bg-surface2 text-muted hover:text-cream border border-border'}`}>
            {t === 'all' ? 'All' : t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="card h-40 animate-pulse bg-surface2" />)}
        </div>
      ) : !products.length ? (
        <div className="card text-center py-16">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-muted">No content here yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className={`card relative flex flex-col hover:border-accent/30 transition-colors ${p.locked ? 'opacity-60' : ''}`}>
              {p.thumbnailUrl && !p.locked && (
                <div className="h-32 rounded-lg bg-surface2 overflow-hidden mb-3 -mx-1">
                  <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}

              {p.locked && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-bg/40 backdrop-blur-[2px]">
                  <div className="text-center">
                    <div className="text-2xl mb-1">🔒</div>
                    <p className="text-xs text-muted">Requires <span className="text-accent capitalize">{tierLabel(p.tierAccess)}</span></p>
                    <Link to="/membership" className="text-xs text-accent hover:underline mt-1 block">Upgrade</Link>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.emoji || TYPE_ICONS[p.type] || '◉'}</span>
                  <span className={`${tierBadge(p.tierAccess)} text-[10px]`}>{tierLabel(p.tierAccess)}</span>
                </div>
                {p.duration && <span className="text-xs text-muted">{p.duration}</span>}
              </div>

              <h3 className="font-semibold text-cream text-sm mb-1 line-clamp-2">{p.title}</h3>
              {p.description && <p className="text-xs text-muted line-clamp-2 mb-3">{p.description}</p>}

              {!p.locked && (
                <div className="flex items-center gap-3 mt-auto pt-2">
                  {p.fileUrl ? (
                    <button
                      onClick={() => handleOpen(p)}
                      className="text-xs text-accent hover:text-accent-hover font-medium flex items-center gap-1"
                    >
                      {p.type === 'video' ? '▶ Watch' : p.type === 'pdf' ? '📄 View' : '↓ Download'}
                    </button>
                  ) : (
                    <span className="text-xs text-muted italic">No file yet</span>
                  )}
                  <span className="text-xs text-muted ml-auto">{p.viewCount} views</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ContentViewer product={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
