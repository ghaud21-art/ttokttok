import { fmtDate } from '../lib/format.js';
import ShareControl from './ShareControl.jsx';

export default function RecordCard({ record, onDelete, onTagClick, showBookLink, onOpenBook, groups, onShare }) {
  const isQuote = record.type === 'quote';
  return (
    <div className="blueprint record-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span className={isQuote ? 'tag tag-outline' : 'tag tag-accent'}>{isQuote ? '인용구' : '인사이트'}</span>
        {showBookLink ? (
          <span style={{ fontSize: 12, opacity: 0.6, cursor: 'pointer' }} onClick={() => onOpenBook(record.book_id)}>
            {record.bookTitle} →
          </span>
        ) : onDelete && (
          <button type="button" className="btn btn-icon btn-ghost" style={{ width: 22, height: 22 }} onClick={() => onDelete(record.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{record.text}</p>
      {onTagClick && (
        <div className="tag-list">
          {(record.tags || []).map((t) => (
            <span key={t} className="tag tag-outline" style={{ cursor: 'pointer' }} onClick={() => onTagClick(t)}>#{t}</span>
          ))}
        </div>
      )}
      {!showBookLink && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div className="timestamp">{fmtDate(record.created_at)}</div>
          {onShare && (
            <ShareControl groups={groups} value={record.shared_group_id} onChange={(gid) => onShare(record.id, gid)} />
          )}
        </div>
      )}
    </div>
  );
}
