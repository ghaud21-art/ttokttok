const LINKS = [
  { key: 'shelf', label: '책장' },
  { key: 'together', label: '함께읽기' },
  { key: 'tags', label: '기록 모아보기' },
  { key: 'missions', label: '실천 기록' },
];

export default function NavBar({ screen, nickname, onNavigate, onOpenAddDialog, onLogout }) {
  return (
    <div className="nav">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, cursor: 'pointer' }} onClick={() => onNavigate('shelf')}>
        <span className="nav-brand brand-mark">똑똑</span>
        <span className="brand-sub">우리 사이 똑똑</span>
      </div>
      <div className="nav-links">
        {LINKS.map((l) => (
          <a
            key={l.key} href="#" aria-current={screen === l.key ? 'page' : undefined}
            onClick={(e) => { e.preventDefault(); onNavigate(l.key); }}
          >
            {l.label}
          </a>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 'auto', flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--color-neutral-700)', whiteSpace: 'nowrap' }}>{nickname}님</span>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 12, whiteSpace: 'nowrap' }} onClick={onLogout}>로그아웃</button>
        <button type="button" className="btn btn-primary" style={{ whiteSpace: 'nowrap' }} onClick={onOpenAddDialog}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          책 등록
        </button>
      </div>
    </div>
  );
}
