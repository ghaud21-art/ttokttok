import { useState } from 'react';

export default function ForcePasswordChangePage({ onSubmit, onLogout }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError('비밀번호는 6자 이상이어야 해요.'); return; }
    if (password !== confirm) { setError('비밀번호가 서로 달라요.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSubmit(password);
    } catch (err) {
      setError(err.message || '비밀번호 변경에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-screen">
      <form className="blueprint auth-card" style={{ textAlign: 'left' }} onSubmit={submit}>
        <h3 style={{ marginBottom: 6 }}>새 비밀번호 설정</h3>
        <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 16 }}>
          관리자가 비밀번호를 재설정했어요. 계속 사용하려면 새 비밀번호를 설정해주세요.
        </p>
        <div className="field">
          <label>새 비밀번호</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자 이상" autoFocus />
        </div>
        <div className="field" style={{ marginTop: 10 }}>
          <label>새 비밀번호 확인</label>
          <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <div className="error-text" style={{ marginTop: 10 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="submit" className="btn btn-primary" disabled={busy || !password || !confirm}>
            {busy ? '변경 중...' : '비밀번호 변경'}
          </button>
          {onLogout && (
            <button type="button" className="btn btn-ghost" onClick={onLogout}>로그아웃</button>
          )}
        </div>
      </form>
    </div>
  );
}
