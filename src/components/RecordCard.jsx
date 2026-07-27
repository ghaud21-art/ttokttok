import { useState } from 'react';
import { fmtDate } from '../lib/format.js';
import { renderQuoteImage } from '../lib/quoteImage.js';
import { downloadBlob } from '../lib/download.js';
import ShareControl from './ShareControl.jsx';

export default function RecordCard({ record, onDelete, onTagClick, showBookLink, onOpenBook, groups, onShare, author }) {
  const isQuote = record.type === 'quote';
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState('');

  const handleImageExport = async () => {
    setImgBusy(true);
    setImgError('');
    try {
      const blob = await renderQuoteImage({
        text: record.text, type: record.type, bookTitle: record.book_title || record.bookTitle || '', author,
      });
      const filename = `ddokddok_${isQuote ? '인용구' : '영감'}_${record.id.slice(0, 8)}.png`;
      const file = new File([blob], filename, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: '똑똑' });
      } else {
        downloadBlob(filename, blob);
      }
    } catch (err) {
      if (err?.name !== 'AbortError') setImgError('이미지를 만드는 중 문제가 발생했어요.');
    } finally {
      setImgBusy(false);
    }
  };

  return (
    <div className="blueprint record-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <span className={isQuote ? 'tag tag-outline' : 'tag tag-accent'}>{isQuote ? '인용구' : '영감'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            type="button" className="btn btn-icon btn-ghost" style={{ width: 22, height: 22 }}
            onClick={handleImageExport} disabled={imgBusy} title="이미지로 저장"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
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
      </div>
      {imgError && <div className="error-text" style={{ fontSize: 12 }}>{imgError}</div>}
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
            <ShareControl groups={groups} value={record.shared_group_ids} onChange={(groupIds) => onShare(record.id, groupIds)} />
          )}
        </div>
      )}
    </div>
  );
}
