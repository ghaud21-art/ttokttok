import { useMemo, useState } from 'react';
import { badgeImage, tierForCount } from '../lib/badges.js';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const DOT_COLORS = [
  'var(--color-accent-700)', 'var(--color-accent-2-600)', 'var(--color-neutral-700)',
  'var(--color-accent-500)', 'var(--color-accent-2-800)', 'var(--color-neutral-500)',
];

export default function CalendarView({ records, books, onOpenBook }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const titleById = useMemo(() => {
    const map = {};
    books.forEach((b) => { map[b.id] = b.title; });
    return map;
  }, [books]);

  const monthRecords = useMemo(
    () => records.filter((r) => {
      const d = new Date(r.created_at);
      return d.getFullYear() === year && d.getMonth() === month;
    }),
    [records, year, month]
  );

  const finishedThisMonth = useMemo(
    () => books.filter((b) => {
      if (!b.finished_at) return false;
      const d = new Date(b.finished_at);
      return d.getFullYear() === year && d.getMonth() === month;
    }),
    [books, year, month]
  );

  const startedThisMonth = useMemo(
    () => books.filter((b) => {
      if (!b.started_at) return false;
      const d = new Date(b.started_at);
      return d.getFullYear() === year && d.getMonth() === month;
    }),
    [books, year, month]
  );

  const bookIdsInMonth = useMemo(() => {
    const ids = [];
    monthRecords.forEach((r) => { if (!ids.includes(r.book_id)) ids.push(r.book_id); });
    finishedThisMonth.forEach((b) => { if (!ids.includes(b.id)) ids.push(b.id); });
    startedThisMonth.forEach((b) => { if (!ids.includes(b.id)) ids.push(b.id); });
    return ids;
  }, [monthRecords, finishedThisMonth, startedThisMonth]);

  const colorForBook = (bookId) => DOT_COLORS[bookIdsInMonth.indexOf(bookId) % DOT_COLORS.length];

  const dayEvents = useMemo(() => {
    const map = {};
    monthRecords.forEach((r) => {
      const day = new Date(r.created_at).getDate();
      if (!map[day]) map[day] = [];
      if (!map[day].includes(r.book_id)) map[day].push(r.book_id);
    });
    finishedThisMonth.forEach((b) => {
      const day = new Date(b.finished_at).getDate();
      if (!map[day]) map[day] = [];
      if (!map[day].includes(b.id)) map[day].push(b.id);
    });
    startedThisMonth.forEach((b) => {
      const day = new Date(b.started_at).getDate();
      if (!map[day]) map[day] = [];
      if (!map[day].includes(b.id)) map[day].push(b.id);
    });
    return map;
  }, [monthRecords, finishedThisMonth, startedThisMonth]);

  const { tier, tierLabel } = tierForCount(monthRecords.length);

  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstWeekday + totalDays) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - firstWeekday + 1;
    return dayNum >= 1 && dayNum <= totalDays ? dayNum : null;
  });

  const today = new Date();

  const booksSummary = bookIdsInMonth.map((id) => {
    const book = books.find((b) => b.id === id);
    const count = monthRecords.filter((r) => r.book_id === id).length;
    const finished = finishedThisMonth.some((b) => b.id === id);
    const started = startedThisMonth.some((b) => b.id === id);
    return { id, title: titleById[id] || book?.title || '(삭제된 책)', count, finished, started, color: colorForBook(id) };
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 22 }}>
        <button type="button" className="btn btn-icon btn-ghost" onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</button>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 20, minWidth: 120, textAlign: 'center' }}>
          {year}년 {month + 1}월
        </div>
        <button type="button" className="btn btn-icon btn-ghost" onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 28 }}>
        <img src={badgeImage(tier)} alt={tierLabel} style={{ width: 96, height: 96, objectFit: 'contain' }} />
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 18 }}>{tierLabel}</div>
        <div style={{ fontSize: 13, opacity: 0.6 }}>이 달의 기록 {monthRecords.length}건</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 12, opacity: 0.5, padding: '4px 0' }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 28 }}>
        {cells.map((day, i) => {
          const isToday = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
          const bookIds = day && dayEvents[day] ? dayEvents[day] : [];
          return (
            <div
              key={i}
              className={day ? 'blueprint' : undefined}
              style={{
                minHeight: 64, padding: '6px 8px',
                visibility: day ? 'visible' : 'hidden',
                border: isToday ? '1.5px solid var(--color-accent)' : undefined,
              }}
            >
              {day && (
                <>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{day}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                    {bookIds.slice(0, 4).map((bid) => (
                      <span
                        key={bid} title={titleById[bid]}
                        style={{ width: 7, height: 7, borderRadius: '50%', background: colorForBook(bid), display: 'inline-block' }}
                      />
                    ))}
                    {bookIds.length > 4 && <span style={{ fontSize: 9, opacity: 0.5 }}>+{bookIds.length - 4}</span>}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <h4 style={{ marginBottom: 10 }}>이 달에 읽은 책</h4>
      {booksSummary.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {booksSummary.map((b) => (
            <div
              key={b.id} className="blueprint"
              style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
              onClick={() => onOpenBook(b.id)}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: b.color, flex: 'none' }} />
              <span style={{ flex: 1, fontSize: 14 }}>{b.title}</span>
              {b.started && <span className="tag tag-accent">시작</span>}
              {b.finished && <span className="tag tag-neutral">완독</span>}
              <span style={{ fontSize: 12, opacity: 0.55 }}>기록 {b.count}건</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state small">이 달에는 기록이 없어요.</div>
      )}
    </div>
  );
}
