import { useRef, useState } from 'react';
import { uploadAvatarImage } from '../lib/storage.js';
import { csvToBookRows, booksToCSV, templateCSV, downloadCSV } from '../lib/csv.js';
import { FREE_USES, KAKAO_LINK } from '../lib/constants.js';

function exportFilename() {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `ddokddok_${stamp}.csv`;
}

export default function MyPage({ userId, profile, books, onUpdateNickname, onUpdateAvatar, onImportBooks }) {
  const [nickname, setNickname] = useState(profile?.nickname || '');
  const [nickBusy, setNickBusy] = useState(false);
  const [nickError, setNickError] = useState('');
  const [nickSaved, setNickSaved] = useState(false);

  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const avatarInputRef = useRef(null);

  const [importBusy, setImportBusy] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const fileInputRef = useRef(null);

  const isAdmin = !!profile?.is_admin;
  const isUnlimited = isAdmin || !!profile?.ai_unlimited;
  const usesCount = profile?.ai_uses_count || 0;

  const saveNickname = async (e) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    setNickBusy(true);
    setNickError('');
    setNickSaved(false);
    try {
      await onUpdateNickname(nickname.trim());
      setNickSaved(true);
    } catch (err) {
      setNickError(err.message || '저장에 실패했어요.');
    } finally {
      setNickBusy(false);
    }
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setAvatarBusy(true);
    setAvatarError('');
    try {
      const url = await uploadAvatarImage(file, userId);
      await onUpdateAvatar(url);
    } catch (err) {
      setAvatarError(err.message || '업로드에 실패했어요.');
    } finally {
      setAvatarBusy(false);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setImportBusy(true);
    setImportError('');
    setImportResult(null);
    try {
      const text = await file.text();
      const { rows, uncertainCount } = csvToBookRows(text);
      if (rows.length === 0) throw new Error('불러올 수 있는 책 정보를 찾지 못했어요. 양식을 확인해주세요.');
      const { inserted, skipped } = await onImportBooks(rows);
      setImportResult({ inserted, skipped, uncertainCount });
    } catch (err) {
      setImportError(err.message || '파일을 불러오는 중 문제가 발생했어요.');
    } finally {
      setImportBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = () => downloadCSV(exportFilename(), booksToCSV(books));
  const handleTemplate = () => downloadCSV('똑똑_불러오기_양식.csv', templateCSV());

  return (
    <div>
      <h2 style={{ marginBottom: 22 }}>마이페이지</h2>

      <div className="blueprint" style={{ padding: 20, marginBottom: 20 }}>
        <div className="card-kicker" style={{ marginBottom: 12 }}>프로필</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', flex: 'none',
              border: '1px solid var(--color-divider)', background: 'var(--color-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : (nickname[0] || '?')}
          </div>
          <div>
            <label className="btn btn-secondary" style={{ cursor: 'pointer', fontSize: 13 }}>
              {avatarBusy ? '업로드 중...' : '사진 바꾸기'}
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarFile} style={{ display: 'none' }} disabled={avatarBusy} />
            </label>
            {avatarError && <div className="error-text" style={{ marginTop: 6 }}>{avatarError}</div>}
          </div>
        </div>
        <form onSubmit={saveNickname} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label>닉네임</label>
            <input className="input" value={nickname} onChange={(e) => { setNickname(e.target.value); setNickSaved(false); }} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={nickBusy || !nickname.trim()}>
            {nickBusy ? '저장 중...' : '저장'}
          </button>
        </form>
        {nickSaved && <div style={{ fontSize: 12, color: 'var(--color-accent-700)', marginTop: 6 }}>저장했어요.</div>}
        {nickError && <div className="error-text" style={{ marginTop: 6 }}>{nickError}</div>}
      </div>

      <div className="blueprint" style={{ padding: 20, marginBottom: 20 }}>
        <div className="card-kicker" style={{ marginBottom: 8 }}>AI 기능</div>
        <div style={{ fontSize: 14, marginBottom: 8 }}>
          {isUnlimited ? '무제한으로 사용할 수 있어요.' : `무료 ${Math.max(0, FREE_USES - usesCount)}/${FREE_USES}회 남았어요.`}
        </div>
        <div style={{ fontSize: 13, opacity: 0.65 }}>
          더 쓰고 싶으시면{' '}
          <a href={KAKAO_LINK} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', color: 'var(--color-accent-700)' }}>
            오픈채팅으로 문의
          </a>해주세요.
        </div>
      </div>

      <div className="blueprint" style={{ padding: 20 }}>
        <div className="card-kicker" style={{ marginBottom: 8 }}>기록 불러오기 / 내보내기</div>
        <p style={{ fontSize: 13, opacity: 0.65, marginTop: 0, marginBottom: 14 }}>
          다른 곳에서 내보낸 CSV 파일을 그대로 불러올 수 있어요. (장르·페이지 수·표지·출판사는 옮겨지지 않아요.)
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className="btn btn-secondary" onClick={handleTemplate}>양식 다운로드</button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            {importBusy ? '불러오는 중...' : 'CSV 파일 불러오기'}
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: 'none' }} disabled={importBusy} />
          </label>
          <button type="button" className="btn btn-secondary" onClick={handleExport} disabled={books.length === 0}>
            전체 기록 내보내기
          </button>
        </div>
        {importResult && (
          <div style={{ fontSize: 13, color: 'var(--color-accent-700)' }}>
            {importResult.inserted}권을 새로 가져왔어요.
            {importResult.skipped > 0 && ` ${importResult.skipped}권은 이미 있어서 건너뛰었어요.`}
            {importResult.uncertainCount > 0 && ` ${importResult.uncertainCount}권은 독서 상태를 확실히 알 수 없어 '읽는 중'으로 가져왔어요.`}
          </div>
        )}
        {importError && <div className="error-text">{importError}</div>}
      </div>
    </div>
  );
}
