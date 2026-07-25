import { useState } from 'react';
import { useAdminUsers } from '../hooks/useAdminUsers.js';
import { useAppSettings } from '../hooks/useAppSettings.js';
import { fmtDate } from '../lib/format.js';

export default function AdminPage() {
  const { users, loading, error, setBan, deleteUser } = useAdminUsers();
  const { aiEnabled, loading: settingsLoading, setAiEnabled } = useAppSettings();
  const [toggleBusy, setToggleBusy] = useState(false);
  const [toggleError, setToggleError] = useState('');

  const handleToggleAi = async () => {
    setToggleBusy(true);
    setToggleError('');
    try {
      await setAiEnabled(!aiEnabled);
    } catch (err) {
      setToggleError(err.message || '설정 변경에 실패했어요.');
    } finally {
      setToggleBusy(false);
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: 6 }}>관리자</h2>
      <p style={{ opacity: 0.6, fontSize: 14, marginBottom: 22 }}>가입자 관리와 AI 기능 설정이에요.</p>

      <div className="blueprint" style={{ padding: 18, marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="card-kicker">AI 기능</div>
          <div style={{ fontSize: 14, opacity: 0.7, marginTop: 2 }}>
            {settingsLoading ? '불러오는 중...' : aiEnabled ? '전체 사용자에게 켜져 있어요.' : '전체 사용자에게 꺼져 있어요 (관리자는 항상 사용 가능).'}
          </div>
          {toggleError && <div className="error-text" style={{ marginTop: 6 }}>{toggleError}</div>}
        </div>
        <button type="button" className={`btn ${aiEnabled ? 'btn-danger' : 'btn-primary'}`} onClick={handleToggleAi} disabled={toggleBusy || settingsLoading}>
          {toggleBusy ? '변경 중...' : aiEnabled ? 'AI 기능 끄기' : 'AI 기능 켜기'}
        </button>
      </div>

      <h3 style={{ marginBottom: 12, fontSize: 18 }}>가입자 목록 {users.length > 0 && `(${users.length}명)`}</h3>
      {error && <div className="error-text" style={{ marginBottom: 10 }}>{error}</div>}
      {loading ? (
        <div className="empty-state small">불러오는 중...</div>
      ) : users.length === 0 ? (
        <div className="empty-state small">가입자가 없어요.</div>
      ) : (
        <div className="blueprint" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>닉네임</th>
                <th>이메일</th>
                <th>가입일</th>
                <th>최근 로그인</th>
                <th>책</th>
                <th>AI 기능 상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <UserRow key={u.id} u={u} onSetBan={setBan} onDelete={deleteUser} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function UserRow({ u, onSetBan, onDelete }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const target = u.nickname || u.email;

  const toggleBan = async () => {
    setBusy(true);
    setError('');
    try {
      await onSetBan(u.id, !u.banned);
    } catch (err) {
      setError(err.message || '처리에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    setBusy(true);
    setError('');
    try {
      await onDelete(u.id);
    } catch (err) {
      setError(err.message || '삭제에 실패했어요.');
      setBusy(false);
    }
  };

  const aiStatus = u.isAdmin
    ? { label: '무제한', cls: 'tag-accent' }
    : u.aiUsesCount >= 3
      ? { label: '제한 도달 (3/3)', cls: 'tag-danger' }
      : { label: `${u.aiUsesCount}/3 사용`, cls: 'tag-accent-2' };

  return (
    <>
      <tr>
        <td>
          {u.nickname || <span style={{ opacity: 0.5 }}>(없음)</span>}
          {u.isAdmin && <span className="tag tag-accent" style={{ marginLeft: 6 }}>관리자</span>}
          {u.banned && <span className="tag tag-neutral" style={{ marginLeft: 6 }}>정지됨</span>}
        </td>
        <td>{u.email}</td>
        <td>{fmtDate(u.createdAt)}</td>
        <td>{u.lastSignInAt ? fmtDate(u.lastSignInAt) : '-'}</td>
        <td>{u.bookCount}</td>
        <td><span className={`tag ${aiStatus.cls}`}>{aiStatus.label}</span></td>
        <td>
          {!u.isAdmin && (
            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={toggleBan} disabled={busy}>
                {u.banned ? '정지 해제' : '정지'}
              </button>
              <button type="button" className="btn btn-danger" style={{ fontSize: 12 }} onClick={() => setConfirmingDelete((v) => !v)} disabled={busy}>
                삭제
              </button>
            </div>
          )}
        </td>
      </tr>
      {confirmingDelete && (
        <tr>
          <td colSpan={7}>
            <div className="blueprint" style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13 }}>
                이 계정과 모든 데이터를 완전히 삭제해요. 되돌릴 수 없어요. 확인하려면 <b>{target}</b>을(를) 입력하세요.
              </span>
              <input className="input" style={{ maxWidth: 200 }} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
              <button
                type="button" className="btn btn-danger" style={{ fontSize: 12 }}
                onClick={confirmDelete} disabled={busy || confirmText !== target}
              >
                {busy ? '삭제 중...' : '완전히 삭제'}
              </button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setConfirmingDelete(false); setConfirmText(''); }}>
                취소
              </button>
            </div>
          </td>
        </tr>
      )}
      {error && (
        <tr>
          <td colSpan={7}><div className="error-text" style={{ padding: '4px 0' }}>{error}</div></td>
        </tr>
      )}
    </>
  );
}
