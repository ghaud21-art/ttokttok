import { useMemo, useState } from 'react';
import BookCard from '../components/BookCard.jsx';
import GenreBar from '../components/GenreBar.jsx';
import BadgeRow from '../components/BadgeRow.jsx';

const STATUS_FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'reading', label: '읽는 중' },
  { key: 'done', label: '완독' },
  { key: 'want', label: '읽고 싶음' },
];

export default function ShelfPage({ books, records, onOpenBook }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGenre, setFilterGenre] = useState(null);

  const now = new Date();
  const thisMonthCount = books.filter((b) => b.finished_at && sameMonth(new Date(b.finished_at), now)).length;
  const thisYearCount = books.filter((b) => b.finished_at && new Date(b.finished_at).getFullYear() === now.getFullYear()).length;
  const totalCount = books.length;

  const genres = useMemo(() => Array.from(new Set(books.map((b) => b.genre))).sort(), [books]);

  const filteredBooks = books
    .filter((b) => (filterStatus === 'all' || b.status === filterStatus) && (!filterGenre || b.genre === filterGenre))
    .slice()
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div>
      <div className="stat-row">
        <div className="blueprint stat-card">
          <div className="card-kicker">이번 달 완독</div>
          <div className="stat-value">{thisMonthCount}<small> 권</small></div>
        </div>
        <div className="blueprint stat-card">
          <div className="card-kicker">올해 완독</div>
          <div className="stat-value">{thisYearCount}<small> 권</small></div>
        </div>
        <div className="blueprint stat-card">
          <div className="card-kicker">전체 등록</div>
          <div className="stat-value">{totalCount}<small> 권</small></div>
        </div>
        <GenreBar books={books} />
      </div>

      <BadgeRow records={records} />

      <div className="filter-row">
        <div className="seg">
          {STATUS_FILTERS.map((opt) => (
            <label className="seg-opt" key={opt.key} style={{ whiteSpace: 'nowrap' }}>
              <input type="radio" name="statusFilter" checked={filterStatus === opt.key} onChange={() => setFilterStatus(opt.key)} />
              {opt.label}
            </label>
          ))}
        </div>
        <div className="chip-row">
          {genres.map((g) => (
            <span
              key={g}
              className={`tag chip ${filterGenre === g ? 'tag-accent' : 'tag-outline'}`}
              onClick={() => setFilterGenre(filterGenre === g ? null : g)}
            >
              {g}
            </span>
          ))}
        </div>
      </div>

      {filteredBooks.length > 0 ? (
        <div className="book-grid">
          {filteredBooks.map((book) => (
            <BookCard key={book.id} book={book} onOpen={onOpenBook} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="title">조건에 맞는 책이 없어요</div>
          <div>필터를 바꾸거나, 오른쪽 위 '책 등록' 버튼으로 새 책을 추가해보세요.</div>
        </div>
      )}
    </div>
  );
}

function sameMonth(a, b) {
  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}
