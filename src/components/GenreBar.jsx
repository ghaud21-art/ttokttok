const DONUT_COLORS = [
  'var(--color-accent-700)', 'var(--color-accent-500)', 'var(--color-accent-300)',
  'var(--color-neutral-600)', 'var(--color-accent-2-600)', 'var(--color-neutral-400)',
];

export default function GenreBar({ books }) {
  const counts = {};
  books.forEach((b) => { counts[b.genre] = (counts[b.genre] || 0) + 1; });
  const total = books.length;
  const entries = Object.entries(counts);

  return (
    <div className="blueprint stat-card wide">
      <div className="card-kicker">장르 분포</div>
      <div className="genre-bar-track">
        {entries.map(([name, count], i) => (
          <span
            key={name}
            style={{ display: 'block', height: '100%', width: `${total > 0 ? (count / total) * 100 : 0}%`, background: DONUT_COLORS[i % DONUT_COLORS.length] }}
          />
        ))}
      </div>
      <div className="genre-bar-legend">
        {entries.map(([name, count], i) => (
          <div className="genre-legend-item" key={name}>
            <span className="genre-legend-dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="text-muted">{name} · {count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
