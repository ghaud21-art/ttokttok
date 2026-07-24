import { STATUS_LABELS, STATUS_TAG_CLASS, pctOf } from '../lib/format.js';

export default function BookCard({ book, onOpen }) {
  const pct = pctOf(book);
  return (
    <div className="blueprint book-card" onClick={() => onOpen(book.id)}>
      <div className="cover-wrap">
        {book.cover_url ? (
          <img src={book.cover_url} alt={book.title} />
        ) : (
          <div className="cover-placeholder">cover</div>
        )}
      </div>
      <div>
        <div className="card-title">{book.title}</div>
        <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>{book.author}</div>
      </div>
      <div className="tag-list">
        <span className={STATUS_TAG_CLASS[book.status]}>{STATUS_LABELS[book.status]}</span>
        <span className="tag tag-neutral">{book.genre}</span>
      </div>
      <div className="progress-row">
        <div className="progress-track">
          <span className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="progress-label">{pct}%</span>
      </div>
    </div>
  );
}
