import { useMemo, useState } from 'react';
import RecordCard from '../components/RecordCard.jsx';

export default function TagsPage({ records, books, onOpenBook, activeTag, onSelectTag, noHeading }) {
  const [search, setSearch] = useState('');

  const titleById = useMemo(() => {
    const map = {};
    books.forEach((b) => { map[b.id] = b.title; });
    return map;
  }, [books]);

  const recordsWithBook = useMemo(
    () => records.map((r) => ({ ...r, bookTitle: titleById[r.book_id] || '' })),
    [records, titleById]
  );

  const tagCounts = useMemo(() => {
    const counts = {};
    records.forEach((r) => (r.tags || []).forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [records]);

  const q = search.trim().toLowerCase();
  const searchResults = q
    ? recordsWithBook
        .filter((r) =>
          r.text.toLowerCase().includes(q) ||
          r.bookTitle.toLowerCase().includes(q) ||
          (r.tags || []).some((t) => t.toLowerCase().includes(q))
        )
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : [];

  const tagRecords = activeTag
    ? recordsWithBook
        .filter((r) => (r.tags || []).includes(activeTag))
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : [];

  return (
    <div>
      {!noHeading && <h2 style={{ marginBottom: 18 }}>기록 모아보기</h2>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        <input
          className="input" style={{ maxWidth: 280 }}
          placeholder="기록·책 제목·태그 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {q && (
          <button type="button" className="btn btn-ghost" onClick={() => setSearch('')}>지우기</button>
        )}
      </div>

      {q ? (
        <>
          <div style={{ marginBottom: 14, fontSize: 14, opacity: 0.7 }}>"{search.trim()}" 검색 결과 {searchResults.length}건</div>
          {searchResults.length > 0 ? (
            <div className="record-grid">
              {searchResults.map((rec) => (
                <RecordCard key={rec.id} record={rec} showBookLink onOpenBook={onOpenBook} />
              ))}
            </div>
          ) : (
            <div className="empty-state small">검색 결과가 없어요.</div>
          )}
        </>
      ) : (
        <>
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
            <div className="empty-state small">위에서 태그를 선택하거나, 검색으로 원하는 기록을 찾아보세요.</div>
          )}
        </>
      )}
    </div>
  );
}
