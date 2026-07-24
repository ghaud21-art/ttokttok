import { useEffect, useRef, useState } from 'react';

// 개인 기록/질문/미션/독서현황 한 건을 여러 함께읽기 모임에 동시에 공유하는 컨트롤.
// value: 현재 공유 중인 group id 배열. onChange(nextArray)로 전체 목록을 넘겨준다 (Promise 반환 가정).
// 속한 모임이 없으면 아무것도 렌더링하지 않는다.
export default function ShareControl({ groups, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef(null);
  const selected = value || [];

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!groups || groups.length === 0) return null;

  const toggle = async (gid) => {
    const next = selected.includes(gid) ? selected.filter((id) => id !== gid) : [...selected, gid];
    setBusy(true);
    setError('');
    try {
      await onChange(next);
    } catch (err) {
      setError(err.message || '공유 저장에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  const label = selected.length === 0 ? '공유 안 함' : `${selected.length}개 모임에 공유 중`;

  return (
    <div ref={ref} style={{ position: 'relative', flex: 'none' }} onClick={(e) => e.stopPropagation()}>
      <button
        type="button" className="btn btn-secondary"
        style={{ fontSize: 11, padding: '2px 8px', minHeight: 'auto' }}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? '저장 중...' : label}
      </button>
      {open && (
        <div
          className="blueprint elev-md"
          style={{
            position: 'absolute', zIndex: 20, top: '110%', right: 0, minWidth: 180,
            padding: 8, background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          {groups.map((g) => (
            <label
              key={g.id}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: busy ? 'default' : 'pointer', padding: '4px 6px', borderRadius: 6 }}
            >
              <input type="checkbox" checked={selected.includes(g.id)} disabled={busy} onChange={() => toggle(g.id)} />
              {g.name}
            </label>
          ))}
          {error && <div style={{ fontSize: 11, color: '#b3413a', padding: '2px 6px' }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
