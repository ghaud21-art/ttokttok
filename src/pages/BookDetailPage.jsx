import { useEffect, useRef, useState } from 'react';
import { STATUS_LABELS, STATUS_TAG_CLASS, pctOf, fmtDate } from '../lib/format.js';
import { parseTags } from '../lib/format.js';
import { generateQuestions, generateMissions } from '../lib/gemini.js';
import { useMyGroups } from '../hooks/useMyGroups.js';
import RecordForm from '../components/RecordForm.jsx';
import RecordCard from '../components/RecordCard.jsx';
import QuestionCard from '../components/QuestionCard.jsx';
import MissionList from '../components/MissionList.jsx';
import AddBookDialog from '../components/AddBookDialog.jsx';
import ShareControl from '../components/ShareControl.jsx';
import StarRating from '../components/StarRating.jsx';

const SPARKLE = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
  </svg>
);

export default function BookDetailPage({
  userId, book, records, questions, missions,
  onBack, onSetProgress, onAddRecord, onDeleteRecord,
  onSaveQuestion, onUpdateQuestion, onDeleteQuestion, onAddMissions, onToggleMission, onOpenTag, onGoMissionsArchive,
  onUpdateBook, onDeleteBook, onShareRecord, onShareQuestion, onShareMission, onShareBook, onUpdateRating,
}) {
  const [questionDrafts, setQuestionDrafts] = useState([]);
  const [aiBusy, setAiBusy] = useState({ questions: false, missions: false });
  const [aiError, setAiError] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const lastGenMissionIds = useRef([]);
  const { groups: myGroups } = useMyGroups(userId);
  const [localPage, setLocalPage] = useState(book.current_page);

  // 슬라이더를 드래그하는 동안 onChange가 여러 번 연속으로 발생하는데, 매번 서버에
  // 커밋하면 페이지 이동량이 중복 집계된다(연간기록 페이지 수 부풀림의 원인이었음).
  // 드래그 중에는 화면 표시만 갱신하고, 손을 뗐을 때 한 번만 실제로 커밋한다.
  useEffect(() => { setLocalPage(book.current_page); }, [book.current_page]);
  const commitProgress = (value) => { onSetProgress(book, value); };

  const bookRecords = records.filter((r) => r.book_id === book.id).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const bookQuestions = questions.filter((q) => q.book_id === book.id).slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const bookMissions = missions.filter((m) => m.book_id === book.id);
  const pct = pctOf(book);
  const localPct = book.total_pages > 0 ? Math.min(100, Math.round((localPage / book.total_pages) * 100)) : pct;

  const submitRecord = async ({ type, text, tagsText }) => {
    await onAddRecord(book.id, book.title, { type, text, tags: parseTags(tagsText) });
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
      const newIds = await onAddMissions(book.id, book.title, (ms || []).slice(0, 5), lastGenMissionIds.current);
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
          {onUpdateRating && (
            <StarRating value={book.rating} onChange={(r) => onUpdateRating(book.id, r)} size={22} />
          )}
          <div className="tag-list" style={{ alignItems: 'center' }}>
            <span className={STATUS_TAG_CLASS[book.status]}>{STATUS_LABELS[book.status]}</span>
            <span className="tag tag-neutral">{book.genre}</span>
            {onShareBook && (
              <ShareControl groups={myGroups} value={book.shared_group_ids} onChange={(groupIds) => onShareBook(book.id, groupIds)} />
            )}
          </div>
          {(book.started_at || book.finished_at) && (
            <div style={{ fontSize: 12, opacity: 0.6, display: 'flex', gap: 12 }}>
              {book.started_at && <span>시작일 {fmtDate(book.started_at)}</span>}
              {book.finished_at && <span>완독일 {fmtDate(book.finished_at)}</span>}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 220, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, opacity: 0.65 }}>현재 {localPage} / {book.total_pages} 페이지 · {localPct}%</label>
            <div className="progress-track">
              <span className="progress-fill" style={{ width: `${localPct}%` }} />
            </div>
            <input
              type="range" min="0" max={book.total_pages || 0} value={localPage}
              onChange={(e) => setLocalPage(Number(e.target.value))}
              onMouseUp={(e) => commitProgress(e.target.value)}
              onTouchEnd={(e) => commitProgress(e.target.value)}
              onKeyUp={(e) => commitProgress(e.target.value)}
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
              <RecordCard
                key={r.id} record={r} onDelete={onDeleteRecord} onTagClick={onOpenTag}
                groups={myGroups} onShare={onShareRecord}
              />
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
              <QuestionCard key={d.id} draft={d} onSave={(question, thought) => onSaveQuestion(book.id, book.title, question, thought)} />
            ))}
          </div>
        )}
        {bookQuestions.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <h4 style={{ marginBottom: 10, opacity: 0.7 }}>나의 독서 노트</h4>
            <div>
              {bookQuestions.map((q) => (
                <NotebookItem
                  key={q.id} q={q} groups={myGroups}
                  onShare={onShareQuestion}
                  onUpdate={(myThought) => onUpdateQuestion(q.id, myThought)}
                  onDelete={() => onDeleteQuestion(q.id)}
                />
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
        {bookMissions.length > 0 && (
          <MissionList missions={bookMissions} onToggle={onToggleMission} groups={myGroups} onShare={onShareMission} />
        )}
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

function NotebookItem({ q, groups, onShare, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(q.my_thought);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onUpdate(text);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm('이 독서 노트를 삭제할까요?')) return;
    onDelete();
  };

  return (
    <div className="notebook-item">
      <div style={{ fontSize: 13, opacity: 0.65, marginBottom: 6 }}>{q.question}</div>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <textarea className="input" value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 60 }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={save} disabled={busy}>저장</button>
            <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={() => { setEditing(false); setText(q.my_thought); }}>취소</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 14 }}>나의 생각: {q.my_thought}</div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        <div className="timestamp">{fmtDate(q.created_at)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {!editing && (
            <>
              <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={() => setEditing(true)}>수정</button>
              <button type="button" className="link-btn" style={{ fontSize: 12, color: '#b3413a' }} onClick={handleDelete}>삭제</button>
            </>
          )}
          {onShare && <ShareControl groups={groups} value={q.shared_group_ids} onChange={(groupIds) => onShare(q.id, groupIds)} />}
        </div>
      </div>
    </div>
  );
}
