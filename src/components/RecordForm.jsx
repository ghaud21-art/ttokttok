import { useState } from 'react';

export default function RecordForm({ onSubmit }) {
  const [type, setType] = useState('quote');
  const [text, setText] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSubmit({ type, text, tagsText });
      setText('');
      setTagsText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="blueprint record-form">
      <div className="seg" style={{ alignSelf: 'flex-start' }}>
        <label className="seg-opt">
          <input type="radio" name="recordType" checked={type === 'quote'} onChange={() => setType('quote')} />
          인용구
        </label>
        <label className="seg-opt">
          <input type="radio" name="recordType" checked={type === 'insight'} onChange={() => setType('insight')} />
          영감
        </label>
      </div>
      <textarea
        className="input"
        placeholder="문장을 그대로, 혹은 든 생각을 자유롭게 적어보세요"
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ minHeight: 80 }}
      />
      <input
        className="input"
        placeholder="태그 (예: #자유의지 #관계)"
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
      />
      <button type="button" className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={submit} disabled={busy || !text.trim()}>
        기록 저장
      </button>
    </div>
  );
}
