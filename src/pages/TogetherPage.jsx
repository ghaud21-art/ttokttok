import { useMemo, useState } from 'react';
import { useGroups } from '../hooks/useGroups.js';
import { fmtDate, pctOf, STATUS_LABELS, STATUS_TAG_CLASS } from '../lib/format.js';

export default function TogetherPage({ userId, nickname }) {
  const {
    groups, members, questions, answers, missions, doneRows, loading,
    sharedRecords, sharedQuestions, sharedMissions, sharedBooks,
    createGroup, joinGroup, updateGroup, deleteGroup, addGroupQuestion, upsertAnswer, addGroupMission, toggleGroupMissionDone,
  } = useGroups(userId);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const groupsView = useMemo(() => groups.map((g) => {
    const groupMembers = members.filter((m) => m.group_id === g.id);
    const groupQuestions = questions.filter((q) => q.group_id === g.id);
    const groupMissions = missions.filter((m) => m.group_id === g.id);
    return {
      ...g,
      members: groupMembers.map((m) => ({ id: m.user_id, nickname: m.ddok_profiles?.nickname || '독서가' })),
      questions: groupQuestions.map((q) => {
        const qAnswers = answers.filter((a) => a.group_question_id === q.id);
        const mine = qAnswers.find((a) => a.user_id === userId);
        const others = qAnswers.filter((a) => a.user_id !== userId);
        return { ...q, myAnswer: mine?.text || '', others };
      }),
      missions: groupMissions.map((m) => {
        const doneForMission = doneRows.filter((d) => d.group_mission_id === m.id);
        return { ...m, doneCount: doneForMission.length, doneByMe: doneForMission.some((d) => d.user_id === userId) };
      }),
      sharedRecords: sharedRecords
        .filter((r) => r.shared_group_id === g.id)
        .map((r) => ({ ...r, nickname: r.ddok_profiles?.nickname || '독서가' })),
      sharedQuestions: sharedQuestions
        .filter((q) => q.shared_group_id === g.id)
        .map((q) => ({ ...q, nickname: q.ddok_profiles?.nickname || '독서가' })),
      sharedMissions: sharedMissions
        .filter((m) => m.shared_group_id === g.id)
        .map((m) => ({ ...m, nickname: m.ddok_profiles?.nickname || '독서가' })),
      sharedBooks: sharedBooks
        .filter((b) => b.shared_group_id === g.id)
        .map((b) => ({ ...b, nickname: b.ddok_profiles?.nickname || '독서가' })),
    };
  }), [groups, members, questions, answers, missions, doneRows, sharedRecords, sharedQuestions, sharedMissions, sharedBooks, userId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>함께읽기</h2>
          <p style={{ opacity: 0.6, fontSize: 14 }}>같은 책을 읽는 사람들과 질문·미션·기록을 함께 나눠보세요.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setShowJoin(true)}>초대코드로 참여</button>
          <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>모임 만들기</button>
        </div>
      </div>

      {!loading && groupsView.length === 0 && (
        <div className="empty-state small" style={{ marginTop: 20 }}>
          아직 참여 중인 모임이 없어요. '모임 만들기'로 새 함께읽기를 시작하거나, 초대코드로 참여해보세요.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 22 }}>
        {groupsView.map((grp) => (
          <GroupCard
            key={grp.id}
            grp={grp}
            userId={userId}
            onAddQuestion={(text) => addGroupQuestion(grp.id, text)}
            onAnswer={(qId, text) => upsertAnswer(qId, text)}
            onAddMission={(text) => addGroupMission(grp.id, text)}
            onToggleMission={(missionId, doneByMe) => toggleGroupMissionDone(missionId, doneByMe)}
            onUpdateGroup={(payload) => updateGroup(grp.id, payload)}
            onDeleteGroup={() => deleteGroup(grp.id)}
          />
        ))}
      </div>

      {showCreate && (
        <CreateGroupDialog
          onClose={() => setShowCreate(false)}
          onSubmit={async (payload) => { await createGroup(payload); setShowCreate(false); }}
        />
      )}
      {showJoin && (
        <JoinGroupDialog
          onClose={() => setShowJoin(false)}
          onSubmit={async (code) => { await joinGroup(code); setShowJoin(false); }}
        />
      )}
    </div>
  );
}

function GroupCard({ grp, userId, onAddQuestion, onAnswer, onAddMission, onToggleMission, onUpdateGroup, onDeleteGroup }) {
  const [newQuestion, setNewQuestion] = useState('');
  const [newMission, setNewMission] = useState('');
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const isOwner = grp.owner_id === userId;

  const handleDelete = async () => {
    if (!window.confirm(`정말 '${grp.name}' 모임을 삭제할까요? 모임의 질문·미션·공유 기록이 모두 사라지고, 되돌릴 수 없어요.`)) return;
    setDeleteBusy(true);
    try {
      await onDeleteGroup();
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="blueprint group-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="card-kicker">함께 읽는 중</div>
          <h3 style={{ margin: '2px 0 4px' }}>{grp.name}</h3>
          <div style={{ fontSize: 13, opacity: 0.65, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{grp.book_title || '아직 책이 정해지지 않았어요'} {grp.book_author && `· ${grp.book_author}`}</span>
            {isOwner && (
              <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={() => setShowEditGroup(true)}>모임 정보 수정</button>
            )}
          </div>
          <div style={{ marginTop: 6 }}>
            초대코드 <span className="invite-code">{grp.invite_code}</span>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
          <div className="member-chips">
            {grp.members.map((mem) => (
              <span key={mem.id} className={`tag ${mem.id === userId ? 'tag-accent' : 'tag-neutral'}`}>{mem.nickname}</span>
            ))}
          </div>
          {isOwner && (
            <button type="button" className="btn btn-danger" style={{ fontSize: 12 }} onClick={handleDelete} disabled={deleteBusy}>
              {deleteBusy ? '삭제 중...' : '모임 삭제'}
            </button>
          )}
        </div>
      </div>

      <div>
        <h4 style={{ marginBottom: 10, fontSize: 15 }}>멤버 독서 현황판</h4>
        {grp.sharedBooks.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {grp.sharedBooks.map((b) => {
              const pct = pctOf(b);
              return (
                <div key={b.id} className="blueprint" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="cover-wrap" style={{ width: 36, height: 48, flex: 'none' }}>
                    {b.cover_url ? <img src={b.cover_url} alt={b.title} /> : <div className="cover-placeholder" style={{ fontSize: 8 }}>cover</div>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>{b.nickname}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.title} <span style={{ fontWeight: 400, opacity: 0.6 }}>{b.author}</span>
                    </div>
                    <div className="progress-row" style={{ marginTop: 4 }}>
                      <div className="progress-track">
                        <span className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="progress-label">{pct}%</span>
                    </div>
                  </div>
                  <span className={STATUS_TAG_CLASS[b.status]} style={{ flex: 'none' }}>{STATUS_LABELS[b.status]}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state small">아직 공유된 독서 현황이 없어요. 개인 책장 → 책 상세에서 이 모임에 현황을 공유해보세요.</div>
        )}
      </div>

      <div>
        <h4 style={{ marginBottom: 10, fontSize: 15 }}>함께 질문</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {grp.questions.map((q) => (
            <GroupQuestion key={q.id} q={q} onAnswer={(text) => onAnswer(q.id, text)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input className="input" placeholder="새 질문 추가하기" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
          <button
            type="button" className="btn btn-secondary"
            onClick={() => { if (newQuestion.trim()) { onAddQuestion(newQuestion); setNewQuestion(''); } }}
          >
            추가
          </button>
        </div>
      </div>

      <div>
        <h4 style={{ marginBottom: 10, fontSize: 15 }}>함께 미션</h4>
        <div className="blueprint mission-list">
          {grp.missions.map((m) => (
            <label className="mission-row" key={m.id}>
              <input type="checkbox" checked={m.doneByMe} onChange={() => onToggleMission(m.id, m.doneByMe)} />
              <span className="mission-text">{m.text}</span>
              <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{m.doneCount}/{grp.members.length} 완료</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input className="input" placeholder="새 미션 추가하기" value={newMission} onChange={(e) => setNewMission(e.target.value)} />
          <button
            type="button" className="btn btn-secondary"
            onClick={() => { if (newMission.trim()) { onAddMission(newMission); setNewMission(''); } }}
          >
            추가
          </button>
        </div>
      </div>

      <div>
        <h4 style={{ marginBottom: 10, fontSize: 15 }}>멤버들이 공유한 기록</h4>
        {grp.sharedRecords.length > 0 ? (
          <div className="record-grid">
            {grp.sharedRecords.map((r) => (
              <div className="blueprint record-card" key={r.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span className={r.type === 'quote' ? 'tag tag-outline' : 'tag tag-accent'}>{r.type === 'quote' ? '인용구' : '인사이트'}</span>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>{r.nickname} · {r.book_title}</span>
                </div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55 }}>{r.text}</p>
                <div className="timestamp">{fmtDate(r.created_at)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state small">아직 공유된 기록이 없어요. 개인 책장의 기록 카드에서 이 모임에 공유해보세요.</div>
        )}
      </div>

      <div>
        <h4 style={{ marginBottom: 10, fontSize: 15 }}>멤버들의 AI 질문 노트</h4>
        {grp.sharedQuestions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {grp.sharedQuestions.map((q) => (
              <div className="blueprint" style={{ padding: 14 }} key={q.id}>
                <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>{q.nickname} · {q.book_title}</div>
                <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 6 }}>{q.question}</div>
                <div style={{ fontSize: 14 }}>나의 생각: {q.my_thought}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state small">아직 공유된 질문 노트가 없어요.</div>
        )}
      </div>

      <div>
        <h4 style={{ marginBottom: 10, fontSize: 15 }}>멤버들의 AI 미션</h4>
        {grp.sharedMissions.length > 0 ? (
          <div className="blueprint mission-list">
            {grp.sharedMissions.map((m) => (
              <div className="mission-row" key={m.id}>
                <span style={{ fontSize: 16, flex: 'none' }}>{m.done ? '✅' : '⬜'}</span>
                <span className="mission-text">{m.text}</span>
                <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{m.nickname}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state small">아직 공유된 미션이 없어요.</div>
        )}
      </div>

      {showEditGroup && (
        <EditGroupDialog
          grp={grp}
          onClose={() => setShowEditGroup(false)}
          onSubmit={async (payload) => { await onUpdateGroup(payload); setShowEditGroup(false); }}
        />
      )}
    </div>
  );
}

function GroupQuestion({ q, onAnswer }) {
  const [text, setText] = useState(q.myAnswer);
  return (
    <div className="blueprint" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 14, fontWeight: 500 }}>{q.text}</div>
      {q.others.map((a) => (
        <div key={a.id} style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
          <b style={{ color: 'var(--color-text)' }}>{a.ddok_profiles?.nickname || '독서가'}</b> · {a.text}
        </div>
      ))}
      <textarea
        className="input" placeholder="나의 생각을 남겨보세요" value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { if (text.trim() && text !== q.myAnswer) onAnswer(text); }}
        style={{ minHeight: 52 }}
      />
    </div>
  );
}

function CreateGroupDialog({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try { await onSubmit({ name, bookTitle, bookAuthor }); } finally { setBusy(false); }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form className="dialog" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">함께읽기 모임 만들기</div>
        <div className="field"><label>모임 이름</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 인문학 모임" /></div>
        <div className="field"><label>같이 읽을 책 제목</label><input className="input" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} /></div>
        <div className="field"><label>저자</label><input className="input" value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} /></div>
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '생성 중...' : '만들기'}</button>
        </div>
      </form>
    </div>
  );
}

function EditGroupDialog({ grp, onClose, onSubmit }) {
  const [name, setName] = useState(grp.name || '');
  const [bookTitle, setBookTitle] = useState(grp.book_title || '');
  const [bookAuthor, setBookAuthor] = useState(grp.book_author || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('모임 이름을 입력해주세요.'); return; }
    setBusy(true);
    setError('');
    try { await onSubmit({ name, bookTitle, bookAuthor }); } finally { setBusy(false); }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form className="dialog" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">모임 정보 수정</div>
        <div className="field"><label>모임 이름</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label>책 제목</label><input className="input" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} /></div>
        <div className="field"><label>저자</label><input className="input" value={bookAuthor} onChange={(e) => setBookAuthor(e.target.value)} /></div>
        {error && <div className="error-text">{error}</div>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '저장 중...' : '저장'}</button>
        </div>
      </form>
    </div>
  );
}

function JoinGroupDialog({ onClose, onSubmit }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setError('');
    try { await onSubmit(code); } catch (err) { setError(err.message || '참여에 실패했어요.'); } finally { setBusy(false); }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form className="dialog" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">초대코드로 참여</div>
        <div className="field"><label>초대코드</label><input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="예: a1b2c3" /></div>
        {error && <div className="error-text">{error}</div>}
        <div className="dialog-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>취소</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '참여 중...' : '참여하기'}</button>
        </div>
      </form>
    </div>
  );
}
