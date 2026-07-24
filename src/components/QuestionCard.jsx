import { useState } from 'react';

export default function QuestionCard({ draft, onSave }) {
  const [thought, setThought] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!thought.trim()) return;
    setBusy(true);
    try {
      await onSave(draft.text, thought);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="blueprint question-card">
      <div style={{ fontSize: 15, fontWeight: 500 }}>{draft.text}</div>
      <textarea
        className="input"
        placeholder="나의 생각을 적어보세요"
        value={thought}
        onChange={(e) => setThought(e.target.value)}
        style={{ minHeight: 60 }}
        disabled={saved}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        {saved ? (
          <span className="saved-mark">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            노트에 저장됨
          </span>
        ) : (
          <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={save} disabled={busy || !thought.trim()}>
            노트에 저장
          </button>
        )}
      </div>
    </div>
  );
}
