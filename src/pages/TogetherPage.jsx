import { useMemo, useState } from 'react';
import { useGroups } from '../hooks/useGroups.js';
import { useGroupRanking } from '../hooks/useGroupRanking.js';
import { fmtDate, pctOf, STATUS_LABELS, STATUS_TAG_CLASS } from '../lib/format.js';
import { badgeImage, RANK_TIER } from '../lib/badges.js';

const RANKING_SORT = [
  { key: 'books_month', label: '이번 달' },
  { key: 'books_year', label: '올해' },
  { key: 'books_total', label: '전체' },
];

export default function TogetherPage({ userId, nickname }) {
  const {
    groups, members, questions, answers, missions, doneRows, loading,
    sharedRecords, sharedQuestions, sharedMissions, sharedBooks, questionAnswers,
    goals, questionComments,
    createGroup, joinGroup, updateGroup, deleteGroup,
    addGroupQuestion, updateGroupQuestion, deleteGroupQuestion, upsertAnswer,
    addGroupMission, updateGroupMission, deleteGroupMission, toggleGroupMissionDone,
    upsertQuestionAnswer,
    kickMember, setGroupGoal, addQuestionComment, deleteQuestionComment,
  } = useGroups(userId);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const groupsView = useMemo(() => groups.map((g) => {
    const groupMembers = members.filter((m) => m.group_id === g.id);
    const groupQuestions = questions.filter((q) => q.group_id === g.id);
    const groupMissions = missions.filter((m) => m.group_id === g.id);
    const goal = goals.find((gl) => gl.group_id === g.id && gl.year === currentYear && gl.month === currentMonth) || null;
    return {
      ...g,
      goal,
      members: groupMembers.map((m) => ({ id: m.user_id, nickname: m.ddok_profiles?.nickname || '독서가' })),
      questions: groupQuestions.map((q) => {
        const qAnswers = answers.filter((a) => a.group_question_id === q.id);
        const mine = qAnswers.find((a) => a.user_id === userId);
        const others = qAnswers.filter((a) => a.user_id !== userId);
        const canManage = q.created_by === userId || g.owner_id === userId;
        const comments = questionComments.filter((c) => c.group_question_id === q.id);
        return { ...q, myAnswer: mine?.text || '', others, canManage, comments };
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
  }), [
    groups, members, questions, answers, missions, doneRows, sharedRecords, sharedQuestions, sharedMissions, sharedBooks,
    questionAnswers, userId, goals, questionComments, currentYear, currentMonth,
  ]);

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
        onKickMember={(memberId) => kickMember(activeGroup.id, memberId)}
        onSetGoal={(target) => setGroupGoal(activeGroup.id, target)}
        onAddComment={(questionId, text) => addQuestionComment(questionId, text)}
        onDeleteComment={(id) => deleteQuestionComment(id)}
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
  onKickMember, onSetGoal, onAddComment, onDeleteComment,
}) {
  const [newQuestion, setNewQuestion] = useState('');
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionError, setQuestionError] = useState('');
  const [newMission, setNewMission] = useState('');
  const [missionBusy, setMissionBusy] = useState(false);
  const [missionError, setMissionError] = useState('');
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [tab, setTab] = useState('main');
  const isOwner = grp.owner_id === userId;
  const { ranking, loading: rankingLoading } = useGroupRanking(grp.id);

  const handleDelete = async () => {
    if (!window.confirm(`정말 '${grp.name}' 모임을 삭제할까요? 모임의 질문·미션·공유 기록이 모두 사라지고, 되돌릴 수 없어요.`)) return;
    setDeleteBusy(true);
    try {
      await onDeleteGroup();
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleKick = async (memberId, memberNickname) => {
    if (!window.confirm(`${memberNickname}님을 모임에서 내보낼까요?`)) return;
    try {
      await onKickMember(memberId);
    } catch (err) {
      alert(err.message || '내보내기에 실패했어요.');
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

        <div className="seg" style={{ marginTop: 16 }}>
          <label className="seg-opt"><input type="radio" name="groupTab" checked={tab === 'main'} onChange={() => setTab('main')} />메인</label>
          <label className="seg-opt"><input type="radio" name="groupTab" checked={tab === 'share'} onChange={() => setTab('share')} />함께 나누기</label>
          <label className="seg-opt"><input type="radio" name="groupTab" checked={tab === 'ranking'} onChange={() => setTab('ranking')} />랭킹</label>
          <label className="seg-opt"><input type="radio" name="groupTab" checked={tab === 'settings'} onChange={() => setTab('settings')} />모임 설정</label>
        </div>

        {tab === 'main' && (
          <>
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
              <h4 style={{ marginBottom: 10, fontSize: 15 }}>이번 달 목표</h4>
              <GroupGoalCard goal={grp.goal} onSetGoal={onSetGoal} editable={false} />
            </div>
          </>
        )}

        {tab === 'share' && (
          <>
            <div>
              <h4 style={{ marginBottom: 10, fontSize: 15 }}>
                함께 질문 <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.55 }}>— 함께 나누고 싶은 이야기</span>
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {grp.questions.map((q) => (
                  <GroupQuestion
                    key={q.id} q={q} userId={userId} onAnswer={(text) => onAnswer(q.id, text)}
                    onEdit={(text) => onUpdateQuestion(q.id, text)}
                    onDelete={() => onDeleteQuestion(q.id)}
                    onAddComment={(text) => onAddComment(q.id, text)}
                    onDeleteComment={onDeleteComment}
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
              <h4 style={{ marginBottom: 10, fontSize: 15 }}>
                함께 미션 <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.55 }}>— 함께 실천하고 싶은 것</span>
              </h4>
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
              <h4 style={{ marginBottom: 10, fontSize: 15 }}>멤버들의 질문노트</h4>
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
              <h4 style={{ marginBottom: 10, fontSize: 15 }}>멤버들의 실천미션</h4>
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
          </>
        )}

        {tab === 'ranking' && (
          <div>
            <h4 style={{ marginBottom: 10, fontSize: 15 }}>모임 랭킹</h4>
            <GroupRankingList ranking={ranking} loading={rankingLoading} userId={userId} />
          </div>
        )}

        {tab === 'settings' && (
          <>
            <div>
              <h4 style={{ marginBottom: 10, fontSize: 15 }}>이번 달 목표</h4>
              <GroupGoalCard goal={grp.goal} onSetGoal={onSetGoal} />
            </div>

            <div>
              <h4 style={{ marginBottom: 10, fontSize: 15 }}>멤버 관리</h4>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {grp.members.map((mem) => (
                  <div
                    key={mem.id}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--color-divider)' }}
                  >
                    <span style={{ fontSize: 14 }}>
                      {mem.nickname}
                      {mem.id === grp.owner_id && <span className="tag tag-accent" style={{ marginLeft: 6 }}>모임장</span>}
                    </span>
                    {isOwner && mem.id !== userId && (
                      <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => handleKick(mem.id, mem.nickname)}>
                        강퇴
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
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

function GroupGoalCard({ goal, onSetGoal, editable = true }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(goal?.goal_text || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    if (!text.trim()) { setError('목표를 입력해주세요.'); return; }
    setBusy(true);
    setError('');
    try {
      await onSetGoal(text.trim());
      setEditing(false);
    } catch (err) {
      setError(err.message || '저장에 실패했어요.');
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="blueprint" style={{ padding: 14 }}>
        <input
          className="input" value={text} onChange={(e) => setText(e.target.value)}
          placeholder="예: 매일 10분씩 책 읽기"
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={save} disabled={busy}>
            {busy ? '저장 중...' : '저장'}
          </button>
          <button
            type="button" className="btn btn-ghost" style={{ fontSize: 12 }}
            onClick={() => { setEditing(false); setError(''); setText(goal?.goal_text || ''); }}
          >
            취소
          </button>
          {error && <span className="error-text">{error}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="blueprint" style={{ padding: 14 }}>
      {goal?.goal_text ? (
        <div style={{ fontSize: 14 }}>{goal.goal_text}</div>
      ) : (
        <div className="empty-state small" style={{ padding: '4px 0' }}>
          {editable ? '아직 이번 달 목표가 없어요.' : '아직 설정된 목표가 없어요. 모임 설정에서 추가해보세요.'}
        </div>
      )}
      {editable && (
        <button type="button" className="link-btn" style={{ fontSize: 12, marginTop: 8 }} onClick={() => setEditing(true)}>
          {goal?.goal_text ? '목표 수정' : '목표 설정하기'}
        </button>
      )}
    </div>
  );
}

function GroupRankingList({ ranking, loading, userId }) {
  const [sortKey, setSortKey] = useState('books_month');
  const sorted = ranking.slice().sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0));

  return (
    <div>
      <div className="seg" style={{ marginBottom: 12 }}>
        {RANKING_SORT.map((opt) => (
          <label className="seg-opt" key={opt.key}>
            <input type="radio" name="rankingSort" checked={sortKey === opt.key} onChange={() => setSortKey(opt.key)} />
            {opt.label}
          </label>
        ))}
      </div>
      {loading ? (
        <div className="empty-state small">불러오는 중...</div>
      ) : sorted.length === 0 ? (
        <div className="empty-state small">멤버가 없어요.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((r, i) => {
            const medal = RANK_TIER[i];
            return (
              <div key={r.user_id} className="blueprint" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 26, flex: 'none', textAlign: 'center' }}>
                  {medal
                    ? <img src={badgeImage(medal.tier)} alt={medal.tierLabel} style={{ width: 24, height: 24, objectFit: 'contain' }} />
                    : <span style={{ fontSize: 12, opacity: 0.5 }}>{i + 1}</span>}
                </div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: r.user_id === userId ? 600 : 400 }}>
                  {r.nickname}
                  {r.user_id === userId && <span style={{ fontSize: 11, opacity: 0.55 }}> (나)</span>}
                </div>
                <div style={{ fontSize: 13, opacity: 0.7 }}>{r[sortKey] || 0}권</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GroupQuestion({ q, userId, onAnswer, onEdit, onDelete, onAddComment, onDeleteComment }) {
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
      {q.comments.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderTop: '1px solid var(--color-divider)', paddingTop: 10 }}>
          {q.comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12 }}>
              <span>
                <b style={{ color: 'var(--color-text)' }}>{c.ddok_profiles?.nickname || '독서가'}</b>
                <span style={{ color: 'var(--color-neutral-700)' }}> · {c.text}</span>
              </span>
              {c.user_id === userId && (
                <button
                  type="button" className="link-btn" style={{ fontSize: 11, color: '#b3413a', flex: 'none' }}
                  onClick={() => onDeleteComment(c.id)}
                >
                  삭제
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <CommentInput onSubmit={onAddComment} />
    </div>
  );
}

function CommentInput({ onSubmit }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSubmit(text);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <input
        className="input" style={{ fontSize: 13 }} placeholder="댓글 달기" value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
      />
      <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={submit} disabled={busy || !text.trim()}>
        등록
      </button>
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
