import { computeMonthlyMedals, badgeImage } from '../lib/badges.js';

export default function BadgeRow({ records }) {
  const medals = computeMonthlyMedals(records);
  return (
    <div className="blueprint stat-card" style={{ marginBottom: 'var(--space-6)', padding: 16 }}>
      <div className="card-kicker">월별 기록 배지</div>
      <div className="badge-row">
        {medals.map((m) => (
          <div className={`blueprint badge-card${m.dim ? ' dim' : ''}`} key={m.key}>
            <img className="badge-img" src={badgeImage(m.tier)} alt={m.tierLabel} />
            <div className="badge-month">{m.monthLabel}</div>
            <div className="badge-tier">{m.tierLabel}</div>
            <div className="badge-count">기록 {m.count}건</div>
          </div>
        ))}
      </div>
    </div>
  );
}
