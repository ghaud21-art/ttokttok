import { fmtDate } from '../lib/format.js';
import ShareControl from './ShareControl.jsx';

export default function MissionList({ missions, onToggle, groups, onShare, onDelete }) {
  const sorted = missions.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  const handleDelete = (e, id) => {
    e.preventDefault();
    if (!window.confirm('이 미션을 삭제할까요?')) return;
    onDelete(id);
  };

  return (
    <div className="blueprint mission-list">
      {sorted.map((m) => (
        <label className="mission-row" key={m.id}>
          <input type="checkbox" checked={m.done} onChange={() => onToggle(m)} />
          <span className={`mission-text${m.done ? ' done' : ''}`}>{m.text}</span>
          <span className="mission-meta">{m.completed_at ? fmtDate(m.completed_at) : ''}</span>
          {onShare && (
            <ShareControl groups={groups} value={m.shared_group_ids} onChange={(groupIds) => onShare(m.id, groupIds)} />
          )}
          {onDelete && (
            <button type="button" className="btn btn-icon btn-ghost" style={{ width: 22, height: 22, flex: 'none' }} onClick={(e) => handleDelete(e, m.id)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </label>
      ))}
    </div>
  );
}
