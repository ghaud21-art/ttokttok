import { useMemo, useState } from 'react';
import { useGroups } from '../hooks/useGroups.js';

export default function TogetherPage({ userId, nickname }) {
  const {
    groups, members, questions, answers, missions, doneRows, loading,
    createGroup, joinGroup, addGroupQuestion, upsertAnswer, addGroupMission, toggleGroupMissionDone,
  } = useGroups(userId);

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const groupsView = useMemo(() => groups.map((g) => {
    const groupMembers = members.filter((m) => m.group_id === g.id);
    const groupQuestions = questions.filter((q) => q.group_id === g.id);
    const groupMissions = missions.filter((m) => m.group_id === g.id);
    return {
      ...g,
      members: groupMembers.map((m) => ({ id: m.user_id, nickname: m.profiles?.nickname || '독서가' })),
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
    };
  }), [groups, members, questions, answers, missions, doneRows, userId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 6 }}>
        <div>
          <h2 style={{ marginBottom: 6 }}>함께읽기</h2>
          <p style={{ opacity: 0.6, fontSize: 14 }}>같은 책을 읽는 사람들과 질문과 미션을 함께 나눠보세요.</p>
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

function GroupCard({ grp, userId, onAddQuestion, onAnswer, onAddMission, onToggleMission }) {
  const [newQuestion, setNewQuestion] = useState('');
  const [newMission, setNewMission] = useState('');

  return (
    <div className="blueprint group-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="card-kicker">함께 읽는 중</div>
          <h3 style={{ margin: '2px 0 4px' }}>{grp.name}</h3>
          <div style={{ fontSize: 13, opacity: 0.65 }}>{grp.book_title} · {grp.book_author}</div>
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
          <b style={{ color: 'var(--color-text)' }}>{a.profiles?.nickname || '독서가'}</b> · {a.text}
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
