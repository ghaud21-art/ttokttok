import { useMemo, useState } from 'react';
import { badgeImage } from '../lib/badges.js';

const MONTH_LABELS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const RANK_TIER = [
  { tier: 'gold', tierLabel: '금 배지' },
  { tier: 'silver', tierLabel: '은 배지' },
  { tier: 'bronze', tierLabel: '동 배지' },
];

export default function AnnualView({ records, books, pageLogs }) {
  const [year, setYear] = useState(() => new Date().getFullYear());

  // page_logs 기능이 생기기 전에 이미 완독한 책은 로그가 없으므로, 완독일이 있는데
  // 해당 책의 로그가 하나도 없다면 전체 페이지를 완독한 달에 한 번에 반영해준다.
  const effectivePageLogs = useMemo(() => {
    const loggedBookIds = new Set((pageLogs || []).map((l) => l.book_id));
    const backfill = (books || [])
      .filter((b) => b.status === 'done' && b.finished_at && b.total_pages > 0 && !loggedBookIds.has(b.id))
      .map((b) => ({ book_id: b.id, pages_delta: b.total_pages, created_at: b.finished_at }));
    return [...(pageLogs || []), ...backfill];
  }, [books, pageLogs]);

  const monthStats = useMemo(() => {
    const recordCounts = Array(12).fill(0);
    records.forEach((r) => {
      const d = new Date(r.created_at);
      if (d.getFullYear() === year) recordCounts[d.getMonth()] += 1;
    });

    const finishedCounts = Array(12).fill(0);
    (books || []).forEach((b) => {
      if (!b.finished_at) return;
      const d = new Date(b.finished_at);
      if (d.getFullYear() === year) finishedCounts[d.getMonth()] += 1;
    });

    const pageSums = Array(12).fill(0);
    effectivePageLogs.forEach((l) => {
      const d = new Date(l.created_at);
      if (d.getFullYear() === year) pageSums[d.getMonth()] += l.pages_delta;
    });

    // 완독 권수가 많은 순으로 상위 3개월에만 금/은/동 배지 부여 (0권인 달은 제외)
    const ranked = Array.from({ length: 12 }, (_, i) => i)
      .filter((i) => finishedCounts[i] > 0)
      .sort((a, b) => finishedCounts[b] - finishedCounts[a]);
    const medalByMonth = {};
    ranked.slice(0, 3).forEach((monthIdx, rank) => { medalByMonth[monthIdx] = RANK_TIER[rank]; });

    return MONTH_LABELS.map((label, i) => {
      const medal = medalByMonth[i] || { tier: 'none', tierLabel: '기록 없음' };
      return {
        month: i, label, recordCount: recordCounts[i], finishedCount: finishedCounts[i], pages: pageSums[i],
        tier: medal.tier, tierLabel: medal.tierLabel,
      };
    });
  }, [records, books, effectivePageLogs, year]);

  const totalFinished = monthStats.reduce((sum, m) => sum + m.finishedCount, 0);
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
          <div className="card-kicker">올해 완독</div>
          <div className="stat-value">{totalFinished}<small> 권</small></div>
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
              opacity: m.finishedCount === 0 && m.pages === 0 ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 13, opacity: 0.6 }}>{m.label}</div>
            <img src={badgeImage(m.tier)} alt={m.tierLabel} style={{ width: 44, height: 44, objectFit: 'contain' }} />
            <div style={{ fontSize: 12, fontWeight: 600 }}>{m.tierLabel}</div>
            <div style={{ fontSize: 11, opacity: 0.55 }}>완독 {m.finishedCount}권</div>
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
