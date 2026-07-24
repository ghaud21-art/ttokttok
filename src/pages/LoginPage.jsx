import { useState } from 'react';

export default function LoginPage({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');
    if (!email.trim() || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'signup') {
        await onSignUp(email.trim(), password, nickname);
        setNotice('가입 확인 메일을 보냈어요. 메일함을 확인한 뒤 로그인해주세요.');
        setMode('signin');
      } else {
        await onSignIn(email.trim(), password);
      }
    } catch (err) {
      setError(err.message || '문제가 발생했어요. 다시 시도해주세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="center-screen">
      <form className="blueprint auth-card" onSubmit={submit}>
        <div>
          <div style={{
            display: 'inline-block', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 38,
            letterSpacing: '-0.02em', color: '#fff', background: 'var(--color-accent)', padding: '4px 20px',
            borderRadius: 'var(--radius-lg)',
          }}>똑똑</div>
          <div className="brand-sub" style={{ marginTop: 4 }}>우리 사이 똑똑</div>
        </div>

        {mode === 'signup' && (
          <div className="field" style={{ textAlign: 'left' }}>
            <label>닉네임</label>
            <input
              className="input"
              placeholder="닉네임을 입력해주세요"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
            />
          </div>
        )}
        <div className="field" style={{ textAlign: 'left' }}>
          <label>이메일</label>
          <input
            className="input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field" style={{ textAlign: 'left' }}>
          <label>비밀번호</label>
          <input
            className="input"
            type="password"
            placeholder="비밀번호 (6자 이상)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <div className="error-text">{error}</div>}
        {notice && <div style={{ fontSize: 13, color: 'var(--color-accent-700)' }}>{notice}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? '처리 중...' : mode === 'signup' ? '가입하고 시작하기' : '시작하기'}
        </button>

        <button
          type="button"
          className="link-btn"
          style={{ fontSize: 13 }}
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(''); setNotice(''); }}
        >
          {mode === 'signup' ? '이미 계정이 있어요 · 로그인' : '처음이신가요? · 회원가입'}
        </button>
      </form>
    </div>
  );
}
