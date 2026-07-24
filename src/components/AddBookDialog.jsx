import { useState } from 'react';
import { uploadCoverImage } from '../lib/storage.js';

const STATUS_OPTIONS = [
  { key: 'reading', label: '읽는 중' },
  { key: 'done', label: '완독' },
  { key: 'want', label: '읽고 싶음' },
];

export default function AddBookDialog({ userId, book, onClose, onSubmit }) {
  const isEdit = Boolean(book);
  const [title, setTitle] = useState(book?.title || '');
  const [author, setAuthor] = useState(book?.author || '');
  const [genre, setGenre] = useState(book?.genre || '');
  const [totalPages, setTotalPages] = useState(book?.total_pages ? String(book.total_pages) : '');
  const [status, setStatus] = useState(book?.status || 'reading');
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [coverUrl, setCoverUrl] = useState(book?.cover_url || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    setBusy(true);
    setError('');
    try {
      let finalCoverUrl = coverUrl.trim();
      if (coverFile) {
        finalCoverUrl = await uploadCoverImage(coverFile, userId);
      }
      await onSubmit({ title, author, genre, totalPages, status, coverUrl: finalCoverUrl });
    } catch (err) {
      setError(err.message || '등록 중 문제가 발생했어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form className="dialog" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">{isEdit ? '책 정보 수정' : '책 등록'}</div>
        <div className="field">
          <label>제목</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="책 제목" />
        </div>
        <div className="field">
          <label>저자</label>
          <input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="저자 (선택)" />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>장르</label>
            <input className="input" value={genre} onChange={(e) => setGenre(e.target.value)} placeholder="예: 소설, 인문" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>전체 페이지 수</label>
            <input className="input" type="number" min="0" value={totalPages} onChange={(e) => setTotalPages(e.target.value)} placeholder="예: 320" />
          </div>
        </div>
        <div className="field">
          <label>상태</label>
          <div className="seg">
            {STATUS_OPTIONS.map((opt) => (
              <label className="seg-opt" key={opt.key}>
                <input type="radio" name="newBookStatus" checked={status === opt.key} onChange={() => setStatus(opt.key)} />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
        <div className="field">
          <label>표지 이미지</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {(coverPreview || coverUrl) && (
              <div className="cover-wrap" style={{ width: 52, height: 70, flex: 'none' }}>
                <img src={coverPreview || coverUrl} alt="" />
              </div>
            )}
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              파일 선택
              <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            </label>
            <input
              className="input" style={{ flex: 1, minWidth: 140 }}
              placeholder="또는 이미지 URL 입력"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
            />
          </div>
        </div>
        {error && <div className="error-text">{error}</div>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? (isEdit ? '저장 중...' : '등록 중...') : (isEdit ? '저장' : '등록')}
          </button>
        </div>
      </form>
    </div>
  );
}
