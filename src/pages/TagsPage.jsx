import { useMemo } from 'react';
import RecordCard from '../components/RecordCard.jsx';

export default function TagsPage({ records, books, onOpenBook, activeTag, onSelectTag }) {
  const titleById = useMemo(() => {
    const map = {};
    books.forEach((b) => { map[b.id] = b.title; });
    return map;
  }, [books]);

  const tagCounts = useMemo(() => {
    const counts = {};
    records.forEach((r) => (r.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const tagRecords = activeTag
    ? records
        .filter((r) => (r.tags || []).includes(activeTag))
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map((r) => ({ ...r, bookTitle: titleById[r.book_id] || '' }))
    : [];

  return (
    <div>
      <h2 style={{ marginBottom: 18 }}>기록 모아보기</h2>
      {tagCounts.length > 0 ? (
        <div className="tag-cloud">
          {tagCounts.map(([name, count]) => (
            <span
              key={name}
              className={`tag chip ${activeTag === name ? 'tag-accent' : 'tag-outline'}`}
              onClick={() => onSelectTag(activeTag === name ? null : name)}
            >
              #{name} <span style={{ opacity: 0.55, marginLeft: 4 }}>{count}</span>
            </span>
          ))}
        </div>
      ) : (
        <div className="empty-state small">아직 태그가 붙은 기록이 없어요.</div>
      )}

      {activeTag ? (
        <>
          <div style={{ marginBottom: 14, fontSize: 14, opacity: 0.7 }}>#{activeTag} 태그의 기록 {tagRecords.length}건</div>
          <div className="record-grid">
            {tagRecords.map((rec) => (
              <RecordCard key={rec.id} record={rec} showBookLink onOpenBook={onOpenBook} />
            ))}
          </div>
        </>
      ) : (
        <div className="empty-state small">위에서 태그를 선택하면 다른 책의 기록도 함께 모아볼 수 있어요.</div>
      )}
    </div>
  );
}
