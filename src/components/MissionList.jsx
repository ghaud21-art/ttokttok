import { fmtDate } from '../lib/format.js';

export default function MissionList({ missions, onToggle }) {
  const sorted = missions.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(b.created_at) - new Date(a.created_at);
  });
  return (
    <div className="blueprint mission-list">
      {sorted.map((m) => (
        <label className="mission-row" key={m.id}>
          <input type="checkbox" checked={m.done} onChange={() => onToggle(m)} />
          <span className={`mission-text${m.done ? ' done' : ''}`}>{m.text}</span>
          <span className="mission-meta">{m.completed_at ? fmtDate(m.completed_at) : ''}</span>
        </label>
      ))}
    </div>
  );
}
