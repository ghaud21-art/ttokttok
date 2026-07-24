import { useMemo, useState } from 'react';
import { badgeImage, tierForCount } from '../lib/badges.js';

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

export default function AnnualView({ records, pageLogs }) {
  const [year, setYear] = useState(() => new Date().getFullYear());

  const monthStats = useMemo(() => {
    const recordCounts = Array(12).fill(0);
    records.forEach((r) => {
      const d = new Date(r.created_at);
      if (d.getFullYear() === year) recordCounts[d.getMonth()] += 1;
    });
    const pageSums = Array(12).fill(0);
    (pageLogs || []).forEach((l) => {
      const d = new Date(l.created_at);
      if (d.getFullYear() === year) pageSums[d.getMonth()] += l.pages_delta;
    });
    return MONTH_LABELS.map((label, i) => {
      const { tier, tierLabel } = tierForCount(recordCounts[i]);
      return { month: i, label, count: recordCounts[i], pages: pageSums[i], tier, tierLabel };
    });
  }, [records, pageLogs, year]);

  const totalRecords = monthStats.reduce((sum, m) => sum + m.count, 0);
  const totalPages = monthStats.reduce((sum, m) => sum + m.pages, 0);
  const maxPages = Math.max(1, ...monthStats.map((m) => m.pages));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 22 }}>
        <button type="button" className="btn btn-icon btn-ghost" onClick={() => setYear((y) => y - 1)}>‹</button>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, minWidth: 100, textAlign: 'center' }}>
          {year}년
        </div>
        <button type="button" className="btn btn-icon btn-ghost" onClick={() => setYear((y) => y + 1)}>›</button>
      </div>

      <div className="stat-row" style={{ marginBottom: 28 }}>
        <div className="blueprint stat-card">
          <div className="card-kicker">올해 기록</div>
          <div className="stat-value">{totalRecords}<small> 건</small></div>
        </div>
        <div className="blueprint stat-card">
          <div className="card-kicker">올해 읽은 페이지</div>
          <div className="stat-value">{totalPages}<small> 페이지</small></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 14 }}>
        {monthStats.map((m) => (
          <div
            key={m.month} className="blueprint"
            style={{
              padding: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              opacity: m.count === 0 && m.pages === 0 ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.6 }}>{m.label}</div>
            <img src={badgeImage(m.tier)} alt={m.tierLabel} style={{ width: 44, height: 44, objectFit: 'contain' }} />
            <div style={{ fontSize: 12, fontWeight: 600 }}>{m.tierLabel}</div>
            <div style={{ fontSize: 11, opacity: 0.55 }}>기록 {m.count}건</div>
            <div className="progress-track" style={{ width: '100%' }}>
              <span className="progress-fill" style={{ width: `${(m.pages / maxPages) * 100}%` }} />
            </div>
            <div style={{ fontSize: 11, opacity: 0.55 }}>{m.pages}페이지</div>
          </div>
        ))}
      </div>
    </div>
  );
}
