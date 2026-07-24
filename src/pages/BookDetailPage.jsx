import { useRef, useState } from 'react';
import { STATUS_LABELS, STATUS_TAG_CLASS, pctOf, fmtDate } from '../lib/format.js';
import { parseTags } from '../lib/format.js';
import { generateQuestions, generateMissions } from '../lib/gemini.js';
import RecordForm from '../components/RecordForm.jsx';
import RecordCard from '../components/RecordCard.jsx';
import QuestionCard from '../components/QuestionCard.jsx';
import MissionList from '../components/MissionList.jsx';
import AddBookDialog from '../components/AddBookDialog.jsx';

const SPARKLE = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
);

export default function BookDetailPage({
  userId, book, records, questions, missions,
  onBack, onSetProgress, onAddRecord, onDeleteRecord,
  onSaveQuestion, onAddMissions, onToggleMission, onOpenTag, onGoMissionsArchive,
  onUpdateBook, onDeleteBook,
}) {
  const [questionDrafts, setQuestionDrafts] = useState([]);
  const [aiBusy, setAiBusy] = useState({ questions: false, missions: false });
  const [aiError, setAiError] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const lastGenMissionIds = useRef([]);

  const bookRecords = records.filter((r) => r.book_id === book.id).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const bookQuestions = questions.filter((q) => q.book_id === book.id).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const bookMissions = missions.filter((m) => m.book_id === book.id);
  const pct = pctOf(book);

  const submitRecord = async ({ type, text, tagsText }) => {
    await onAddRecord(book.id, { type, text, tags: parseTags(tagsText) });
  };

  const runGenerateQuestions = async () => {
    setAiError('');
    setAiBusy((s) => ({ ...s, questions: true }));
    try {
      const { questions: qs } = await generateQuestions(book, records);
      setQuestionDrafts((qs || []).slice(0, 5).map((text, i) => ({ id: `${Date.now()}-${i}`, text })));
    } catch (err) {
      setAiError(err.message || '질문 생성에 실패했어요.');
    } finally {
      setAiBusy((s) => ({ ...s, questions: false }));
    }
  };

  const runGenerateMissions = async () => {
    setAiError('');
    setAiBusy((s) => ({ ...s, missions: true }));
    try {
      const { missions: ms } = await generateMissions(book, records);
      const newIds = await onAddMissions(book.id, (ms || []).slice(0, 5), lastGenMissionIds.current);
      lastGenMissionIds.current = newIds;
    } catch (err) {
      setAiError(err.message || '미션 생성에 실패했어요.');
    } finally {
      setAiBusy((s) => ({ ...s, missions: false }));
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('정말 이 책을 삭제할까요? 이 책의 기록·질문·미션도 함께 삭제됩니다.')) return;
    setDeleteBusy(true);
    try {
      await onDeleteBook(book.id);
      onBack();
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          책장으로
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowEditDialog(true)}>수정</button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={deleteBusy}>
            {deleteBusy ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>

      <div className="blueprint book-header">
        <div className="cover-wrap book-cover-lg">
          {book.cover_url ? <img src={book.cover_url} alt={book.title} /> : <div className="cover-placeholder">cover</div>}
        </div>
        <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            <h1 style={{ margin: '0 0 4px', fontSize: 28 }}>{book.title}</h1>
            <div style={{ opacity: 0.65, fontSize: 14 }}>{book.author}</div>
          </div>
          <div className="tag-list">
            <span className={STATUS_TAG_CLASS[book.status]}>{STATUS_LABELS[book.status]}</span>
            <span className="tag tag-neutral">{book.genre}</span>
          </div>
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, opacity: 0.65 }}>현재 {book.current_page} / {book.total_pages} 페이지 · {pct}%</label>
            <div className="progress-track">
              <span className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <input
              type="range" min="0" max={book.total_pages || 0} value={book.current_page}
              onChange={(e) => onSetProgress(book, e.target.value)}
              style={{ width: '100%', accentColor: 'var(--color-accent)' }}
            />
          </div>
        </div>
      </div>

      <div className="section">
        <h3 style={{ marginBottom: 14 }}>인상 깊은 부분 기록하기</h3>
        <RecordForm onSubmit={submitRecord} />
      </div>

      <div className="section">
        <h3 style={{ marginBottom: 14 }}>인사이트 갤러리</h3>
        {bookRecords.length > 0 ? (
          <div className="record-grid">
            {bookRecords.map((r) => (
              <RecordCard key={r.id} record={r} onDelete={onDeleteRecord} onTagClick={onOpenTag} />
            ))}
          </div>
        ) : (
          <div className="empty-state small">아직 기록이 없어요. 위에서 첫 인용구나 인사이트를 남겨보세요.</div>
        )}
      </div>

      <div className="section">
        <div className="section-head">
          <h3 style={{ margin: 0 }}>AI 성찰 질문</h3>
          <button type="button" className="btn btn-secondary" onClick={runGenerateQuestions} disabled={aiBusy.questions}>
            {SPARKLE}
            {aiBusy.questions ? '생성 중...' : questionDrafts.length > 0 ? '다시 생성하기' : '질문 생성하기'}
          </button>
        </div>
        {aiError && <div className="error-text" style={{ marginBottom: 10 }}>{aiError}</div>}
        {questionDrafts.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {questionDrafts.map((d) => (
              <QuestionCard key={d.id} draft={d} onSave={(question, thought) => onSaveQuestion(book.id, question, thought)} />
            ))}
          </div>
        )}
        {bookQuestions.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <h4 style={{ marginBottom: 10, opacity: 0.7 }}>나의 독서 노트</h4>
            <div>
              {bookQuestions.map((q) => (
                <div className="notebook-item" key={q.id}>
                  <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 6 }}>{q.question}</div>
                  <div style={{ fontSize: 14 }}>나의 생각: {q.my_thought}</div>
                  <div className="timestamp" style={{ marginTop: 6 }}>{fmtDate(q.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="section" style={{ marginBottom: 0 }}>
        <div className="section-head">
          <h3 style={{ margin: 0 }}>AI 실천 미션</h3>
          <button type="button" className="btn btn-secondary" onClick={runGenerateMissions} disabled={aiBusy.missions}>
            {SPARKLE}
            {aiBusy.missions ? '생성 중...' : bookMissions.length > 0 ? '미션 다시 생성하기' : '미션 생성하기'}
          </button>
        </div>
        {bookMissions.length > 0 && <MissionList missions={bookMissions} onToggle={onToggleMission} />}
        <p style={{ fontSize: 12, opacity: 0.55, marginTop: 12 }}>
          완료한 미션은 <span className="link-btn" onClick={onGoMissionsArchive}>실천 기록</span>에서 모아볼 수 있어요.
        </p>
      </div>

      {showEditDialog && (
        <AddBookDialog
          userId={userId}
          book={book}
          onClose={() => setShowEditDialog(false)}
          onSubmit={async (payload) => { await onUpdateBook(book.id, payload); setShowEditDialog(false); }}
        />
      )}
    </div>
  );
}
