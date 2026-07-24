import { useMemo, useState } from 'react';
import { useGroups } from '../hooks/useGroups.js';
import { fmtDate, pctOf, STATUS_LABELS, STATUS_TAG_CLASS } from '../lib/format.js';

export default function TogetherPage({ userId, nickname }) {
  const {
    groups, members, questions, answers, missions, doneRows, loading,
    sharedRecords, sharedQuestions, sharedMissions, sharedBooks, questionAnswers,
    createGroup, joinGroup, updateGroup, deleteGroup,
    addGroupQuestion, updateGroupQuestion, deleteGroupQuestion, upsertAnswer,
    addGroupMission, updateGroupMission, deleteGroupMission, toggleGroupMissionDone,
    upsertQuestionAnswer,
  } = useGroups(userId);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(null);

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
        const canManage = q.created_by === userId || g.owner_id === userId;
        return { ...q, myAnswer: mine?.text || '', others, canManage };
      }),
      missions: groupMissions.map((m) => {
        const doneForMission = doneRows.filter((d) => d.group_mission_id === m.id);
        const canManage = m.created_by === userId || g.owner_id === userId;
        return { ...m, doneCount: doneForMission.length, doneByMe: doneForMission.some((d) => d.user_id === userId), canManage };
      }),
      sharedRecords: sharedRecords
        .filter((r) => (r.shared_group_ids || []).includes(g.id))
        .map((r) => ({ ...r, nickname: r.ddok_profiles?.nickname || '독서가' })),
      sharedQuestions: sharedQuestions
        .filter((q) => (q.shared_group_ids || []).includes(g.id))
        .map((q) => {
          const qAnswers = questionAnswers.filter((a) => a.question_id === q.id);
          const mine = qAnswers.find((a) => a.user_id === userId);
          const others = qAnswers.filter((a) => a.user_id !== userId && a.user_id !== q.owner_id);
          return { ...q, nickname: q.ddok_profiles?.nickname || '독서가', myAnswer: mine?.text || '', others, isMine: q.owner_id === userId };
        }),
      sharedMissions: sharedMissions
        .filter((m) => (m.shared_group_ids || []).includes(g.id))
        .map((m) => ({ ...m, nickname: m.ddok_profiles?.nickname || '독서가' })),
      sharedBooks: sharedBooks
        .filter((b) => (b.shared_group_ids || []).includes(g.id))
        .map((b) => ({ ...b, nickname: b.ddok_profiles?.nickname || '독서가' })),
    };
  }), [groups, members, questions, answers, missions, doneRows, sharedRecords, sharedQuestions, sharedMissions, sharedBooks, questionAnswers, userId]);

  const activeGroup = groupsView.find((g) => g.id === activeGroupId) || null;

  if (activeGroup) {
    return (
      <GroupDetailView
        grp={activeGroup}
        userId={userId}
        onBack={() => setActiveGroupId(null)}
        onAddQuestion={(text) => addGroupQuestion(activeGroup.id, text)}
        onUpdateQuestion={(id, text) => updateGroupQuestion(id, text)}
        onDeleteQuestion={(id) => deleteGroupQuestion(id)}
        onAnswer={(qId, text) => upsertAnswer(qId, text)}
        onAddMission={(text) => addGroupMission(activeGroup.id, text)}
        onUpdateMission={(id, text) => updateGroupMission(id, text)}
        onDeleteMission={(id) => deleteGroupMission(id)}
        onToggleMission={(missionId, doneByMe) => toggleGroupMissionDone(missionId, doneByMe)}
        onUpdateGroup={(payload) => updateGroup(activeGroup.id, payload)}
        onDeleteGroup={async () => { await deleteGroup(activeGroup.id); setActiveGroupId(null); }}
        onAnswerSharedQuestion={(qId, text) => upsertQuestionAnswer(qId, text)}
      />
    );
  }

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 22 }}>
        {groupsView.map((grp) => (
          <GroupSummaryCard key={grp.id} grp={grp} userId={userId} onOpen={() => setActiveGroupId(grp.id)} />
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

function GroupSummaryCard({ grp, userId, onOpen }) {
  const sharedCount = grp.sharedRecords.length + grp.sharedQuestions.length + grp.sharedMissions.length + grp.sharedBooks.length;
  return (
    <div className="blueprint group-card" style={{ cursor: 'pointer', padding: 20 }} onClick={onOpen}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="card-kicker">함께읽기 모임</div>
          <h3 style={{ margin: '2px 0 4px' }}>{grp.name}</h3>
          <div style={{ fontSize: 12, opacity: 0.6 }}>
            질문 {grp.questions.length}개 · 미션 {grp.missions.length}개 · 공유된 항목 {sharedCount}건
          </div>
          <div style={{ marginTop: 6 }}>
            초대코드 <span className="invite-code">{grp.invite_code}</span>
          </div>
        </div>
        <div className="member-chips">
          {grp.members.map((mem) => (
            <span key={mem.id} className={`tag ${mem.id === userId ? 'tag-accent' : 'tag-neutral'}`}>{mem.nickname}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GroupDetailView({
  grp, userId, onBack, onAddQuestion, onUpdateQuestion, onDeleteQuestion, onAnswer,
  onAddMission, onUpdateMission, onDeleteMission, onToggleMission,
  onUpdateGroup, onDeleteGroup, onAnswerSharedQuestion,
}) {
  const [newQuestion, setNewQuestion] = useState('');
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [newMission, setNewMission] = useState('');
  const [missionBusy, setMissionBusy] = useState(false);
  const [missionError, setMissionError] = useState('');
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

  const submitQuestion = async () => {
    if (!newQuestion.trim()) return;
    setQuestionBusy(true);
    setQuestionError('');
    try {
      await onAddQuestion(newQuestion);
      setNewQuestion('');
    } catch (err) {
      setQuestionError(err.message || '질문 등록에 실패했어요.');
    } finally {
      setQuestionBusy(false);
    }
  };

  const submitMission = async () => {
    if (!newMission.trim()) return;
    setMissionBusy(true);
    setMissionError('');
    try {
      await onAddMission(newMission);
      setNewMission('');
    } catch (err) {
      setMissionError(err.message || '미션 등록에 실패했어요.');
    } finally {
      setMissionBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          모임 목록으로
        </button>
        {isOwner && (
          <button type="button" className="btn btn-danger" style={{ fontSize: 12 }} onClick={handleDelete} disabled={deleteBusy}>
            {deleteBusy ? '삭제 중...' : '모임 삭제'}
          </button>
        )}
      </div>

      <div className="blueprint group-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div className="card-kicker">함께읽기 모임</div>
            <h3 style={{ margin: '2px 0 4px' }}>{grp.name}</h3>
            {isOwner && (
              <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={() => setShowEditGroup(true)}>모임 이름 수정</button>
            )}
            <div style={{ marginTop: 6 }}>
              초대코드 <span className="invite-code">{grp.invite_code}</span>
            </div>
          </div>
          <div className="member-chips">
            {grp.members.map((mem) => (
              <span key={mem.id} className={`tag ${mem.id === userId ? 'tag-accent' : 'tag-neutral'}`}>{mem.nickname}</span>
            ))}
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
              <GroupQuestion
                key={q.id} q={q} onAnswer={(text) => onAnswer(q.id, text)}
                onEdit={(text) => onUpdateQuestion(q.id, text)}
                onDelete={() => onDeleteQuestion(q.id)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input className="input" placeholder="새 질문 추가하기" value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} />
            <button type="button" className="btn btn-secondary" onClick={submitQuestion} disabled={questionBusy || !newQuestion.trim()}>
              {questionBusy ? '추가 중...' : '추가'}
            </button>
          </div>
          {questionError && <div className="error-text" style={{ marginTop: 6 }}>{questionError}</div>}
        </div>

        <div>
          <h4 style={{ marginBottom: 10, fontSize: 15 }}>함께 미션</h4>
          <div className="blueprint mission-list">
            {grp.missions.map((m) => (
              <GroupMissionRow
                key={m.id} m={m} memberCount={grp.members.length}
                onToggle={() => onToggleMission(m.id, m.doneByMe)}
                onEdit={(text) => onUpdateMission(m.id, text)}
                onDelete={() => onDeleteMission(m.id)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input className="input" placeholder="새 미션 추가하기" value={newMission} onChange={(e) => setNewMission(e.target.value)} />
            <button type="button" className="btn btn-secondary" onClick={submitMission} disabled={missionBusy || !newMission.trim()}>
              {missionBusy ? '추가 중...' : '추가'}
            </button>
          </div>
          {missionError && <div className="error-text" style={{ marginTop: 6 }}>{missionError}</div>}
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
                <SharedQuestion key={q.id} q={q} onAnswer={(text) => onAnswerSharedQuestion(q.id, text)} />
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

function GroupQuestion({ q, onAnswer, onEdit, onDelete }) {
  const [text, setText] = useState(q.myAnswer);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(q.text);
  const [answerBusy, setAnswerBusy] = useState(false);
  const [answerSaved, setAnswerSaved] = useState(false);

  const saveEdit = async () => {
    if (!editText.trim()) return;
    await onEdit(editText);
    setEditing(false);
  };

  const saveAnswer = async () => {
    if (!text.trim()) return;
    setAnswerBusy(true);
    try {
      await onAnswer(text);
      setAnswerSaved(true);
    } finally {
      setAnswerBusy(false);
    }
  };

  const handleDelete = () => {
    if (!window.confirm('이 질문을 삭제할까요? 다른 멤버들의 답변도 함께 사라져요.')) return;
    onDelete();
  };

  return (
    <div className="blueprint" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {editing ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={editText} onChange={(e) => setEditText(e.target.value)} />
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={saveEdit}>저장</button>
          <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setEditing(false); setEditText(q.text); }}>취소</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 500 }}>{q.text}</div>
          {q.canManage && (
            <div style={{ display: 'flex', gap: 4, flex: 'none' }}>
              <button type="button" className="link-btn" style={{ fontSize: 12 }} onClick={() => setEditing(true)}>수정</button>
              <button type="button" className="link-btn" style={{ fontSize: 12, color: '#b3413a' }} onClick={handleDelete}>삭제</button>
            </div>
          )}
        </div>
      )}
      {q.others.map((a) => (
        <div key={a.id} style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
          <b style={{ color: 'var(--color-text)' }}>{a.ddok_profiles?.nickname || '독서가'}</b> · {a.text}
        </div>
      ))}
      <textarea
        className="input" placeholder="나의 생각을 남겨보세요" value={text}
        onChange={(e) => { setText(e.target.value); setAnswerSaved(false); }}
        style={{ minHeight: 52 }}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={saveAnswer} disabled={answerBusy || !text.trim()}>
          {answerBusy ? '저장 중...' : answerSaved ? '저장됨 ✓' : '답변 저장'}
        </button>
      </div>
    </div>
  );
}

function GroupMissionRow({ m, memberCount, onToggle, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(m.text);

  const saveEdit = async () => {
    if (!editText.trim()) return;
    await onEdit(editText);
    setEditing(false);
  };

  const handleDelete = () => {
    if (!window.confirm('이 미션을 삭제할까요? 멤버들의 완료 기록도 함께 사라져요.')) return;
    onDelete();
  };

  if (editing) {
    return (
      <div className="mission-row">
        <input className="input" style={{ flex: 1 }} value={editText} onChange={(e) => setEditText(e.target.value)} />
        <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={saveEdit}>저장</button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={() => { setEditing(false); setEditText(m.text); }}>취소</button>
      </div>
    );
  }

  return (
    <label className="mission-row">
      <input type="checkbox" checked={m.doneByMe} onChange={onToggle} />
      <span className="mission-text">{m.text}</span>
      <span style={{ fontSize: 11, color: 'var(--color-neutral-600)' }}>{m.doneCount}/{memberCount} 완료</span>
      {m.canManage && (
        <span style={{ display: 'flex', gap: 4, flex: 'none' }}>
          <button
            type="button" className="link-btn" style={{ fontSize: 12 }}
            onClick={(e) => { e.preventDefault(); setEditing(true); }}
          >
            수정
          </button>
          <button
            type="button" className="link-btn" style={{ fontSize: 12, color: '#b3413a' }}
            onClick={(e) => { e.preventDefault(); handleDelete(); }}
          >
            삭제
          </button>
        </span>
      )}
    </label>
  );
}

function SharedQuestion({ q, onAnswer }) {
  const [text, setText] = useState(q.myAnswer);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onAnswer(text);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="blueprint" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.6 }}>{q.nickname} · {q.book_title}</div>
      <div style={{ fontSize: 13, opacity: 0.7 }}>{q.question}</div>
      <div style={{ fontSize: 14 }}>나의 생각: {q.my_thought}</div>
      {q.others.map((a) => (
        <div key={a.id} style={{ fontSize: 13, color: 'var(--color-neutral-700)' }}>
          <b style={{ color: 'var(--color-text)' }}>{a.ddok_profiles?.nickname || '독서가'}</b> · {a.text}
        </div>
      ))}
      {!q.isMine && (
        <>
          <textarea
            className="input" placeholder="이 질문에 대한 나의 생각도 남겨보세요" value={text}
            onChange={(e) => { setText(e.target.value); setSaved(false); }}
            style={{ minHeight: 48 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 13 }} onClick={save} disabled={busy || !text.trim()}>
              {busy ? '저장 중...' : saved ? '저장됨 ✓' : '답변 저장'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function CreateGroupDialog({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try { await onSubmit({ name }); } finally { setBusy(false); }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form className="dialog" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">함께읽기 모임 만들기</div>
        <div className="field"><label>모임 이름</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 인문학 모임" /></div>
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('모임 이름을 입력해주세요.'); return; }
    setBusy(true);
    setError('');
    try { await onSubmit({ name }); } finally { setBusy(false); }
  };

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <form className="dialog" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-title">모임 이름 수정</div>
        <div className="field"><label>모임 이름</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} /></div>
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
