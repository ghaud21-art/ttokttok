import { useMemo } from 'react';
import { fmtDate } from '../lib/format.js';

export default function MissionsArchivePage({ missions, books, onOpenBook, onToggle }) {
  const titleById = useMemo(() => {
    const map = {};
    books.forEach((b) => { map[b.id] = b.title; });
    return map;
  }, [books]);

  const completed = missions.filter((m) => m.done);

  const groups = useMemo(() => {
    const map = {};
    completed.forEach((m) => {
      if (!map[m.book_id]) map[m.book_id] = { bookId: m.book_id, bookTitle: titleById[m.book_id] || '', items: [], latest: 0 };
      map[m.book_id].items.push(m);
      const t = m.completed_at ? new Date(m.completed_at).getTime() : 0;
      map[m.book_id].latest = Math.max(map[m.book_id].latest, t);
    });
    return Object.values(map).sort((a, b) => b.latest - a.latest);
  }, [completed, titleById]);

  return (
    <div>
      <h2 style={{ marginBottom: 6 }}>실천 기록</h2>
      <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 22 }}>지금까지 완료한 실천 미션 {completed.length}개</p>

      {groups.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {groups.map((g) => (
            <div key={g.bookId}>
              <div
                style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-heading)', marginBottom: 8, cursor: 'pointer' }}
                onClick={() => onOpenBook(g.bookId)}
              >
                {g.bookTitle}
              </div>
              <div className="blueprint mission-list">
                {g.items.map((m) => (
                  <label className="mission-row" key={m.id}>
                    <input type="checkbox" checked onChange={() => onToggle(m)} />
                    <span className="mission-text">{m.text}</span>
                    <span className="mission-meta">{fmtDate(m.completed_at)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state small">아직 완료된 실천 미션이 없어요. 책 상세 화면에서 미션을 완료해보세요.</div>
      )}
    </div>
  );
}
