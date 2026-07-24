const STAR_PATH = 'M12 2.5l2.9 6.26L21 9.77l-4.5 4.38L17.8 21 12 17.77 6.2 21l1.3-6.85L3 9.77l6.1-1.01L12 2.5z';

function StarIcon({ pct, size }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, lineHeight: 0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24">
        <path d={STAR_PATH} fill="var(--color-neutral-300)" />
      </svg>
      {pct > 0 && (
        <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: `${pct}%` }}>
          <svg width={size} height={size} viewBox="0 0 24 24">
            <path d={STAR_PATH} fill="var(--color-accent-2-600)" />
          </svg>
        </span>
      )}
    </span>
  );
}

// value가 없으면(null/0) 아무것도 렌더링하지 않는 것이 기본 동작 — onChange를 넘기면
// 편집 가능한 입력으로, 넘기지 않으면 읽기 전용 표시로 동작한다.
export default function StarRating({ value, onChange, size = 18, showValue = true }) {
  const interactive = typeof onChange === 'function';
  const v = value || 0;

  if (!interactive && !v) return null;

  const handleClick = (star, half) => {
    const clicked = half ? star - 0.5 : star;
    onChange(v === clicked ? null : clicked);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }} onClick={(e) => interactive && e.stopPropagation()}>
      {[1, 2, 3, 4, 5].map((star) => {
        const pct = Math.max(0, Math.min(100, (v - (star - 1)) * 100));
        return (
          <span key={star} style={{ position: 'relative', display: 'inline-block' }}>
            <StarIcon pct={pct} size={size} />
            {interactive && (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', cursor: 'pointer' }}>
                <span style={{ flex: 1 }} onClick={() => handleClick(star, true)} />
                <span style={{ flex: 1 }} onClick={() => handleClick(star, false)} />
              </span>
            )}
          </span>
        );
      })}
      {showValue && v > 0 && (
        <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 2 }}>{v.toFixed(1)}</span>
      )}
    </span>
  );
}
