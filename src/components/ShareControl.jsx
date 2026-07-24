// 개인 기록/질문/미션 한 건을 특정 함께읽기 모임에 공유하거나 해제하는 작은 선택 컨트롤.
// 속한 모임이 없으면 아무것도 렌더링하지 않는다.
export default function ShareControl({ groups, value, onChange }) {
  if (!groups || groups.length === 0) return null;
  return (
    <select
      className="input"
      style={{ fontSize: 11, padding: '2px 6px', minHeight: 'auto', width: 'auto', maxWidth: 150, flex: 'none' }}
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">공유 안 함</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>{g.name}에 공유</option>
      ))}
    </select>
  );
}
