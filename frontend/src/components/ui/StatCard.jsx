export default function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="card">
      <p className="text-xs font-medium text-muted uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${accent ? 'text-accent' : 'text-cream'}`}>{value}</p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}
