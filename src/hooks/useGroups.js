import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

export function useGroups(userId) {
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [doneRows, setDoneRows] = useState([]);
  const [sharedRecords, setSharedRecords] = useState([]);
  const [sharedQuestions, setSharedQuestions] = useState([]);
  const [sharedMissions, setSharedMissions] = useState([]);
  const [sharedBooks, setSharedBooks] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [questionComments, setQuestionComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setGroups([]); setMembers([]); setQuestions([]); setAnswers([]); setMissions([]); setDoneRows([]);
      setSharedRecords([]); setSharedQuestions([]); setSharedMissions([]); setSharedBooks([]); setQuestionAnswers([]);
      setGoals([]); setQuestionComments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: groupRows } = await supabase.from('ddok_groups').select('*').order('created_at', { ascending: false });
    const groupIds = (groupRows || []).map((g) => g.id);

    if (groupIds.length === 0) {
      setGroups([]); setMembers([]); setQuestions([]); setAnswers([]); setMissions([]); setDoneRows([]);
      setSharedRecords([]); setSharedQuestions([]); setSharedMissions([]); setSharedBooks([]); setQuestionAnswers([]);
      setGoals([]); setQuestionComments([]);
      setLoading(false);
      return;
    }

    const { data: shareRows } = await supabase.from('ddok_shares').select('item_type, item_id, group_id').in('group_id', groupIds);
    const idsByType = { record: [], question: [], mission: [], book: [] };
    (shareRows || []).forEach((s) => {
      if (idsByType[s.item_type] && !idsByType[s.item_type].includes(s.item_id)) idsByType[s.item_type].push(s.item_id);
    });

    const [
      { data: memberRows }, { data: questionRows }, { data: missionRows },
      { data: sharedRecordRows }, { data: sharedQuestionRows }, { data: sharedMissionRows }, { data: sharedBookRows },
      { data: goalRows },
    ] = await Promise.all([
      supabase.from('ddok_group_members').select('group_id, user_id, ddok_profiles(nickname)').in('group_id', groupIds),
      supabase.from('ddok_group_questions').select('*').in('group_id', groupIds).order('created_at', { ascending: true }),
      supabase.from('ddok_group_missions').select('*').in('group_id', groupIds).order('created_at', { ascending: true }),
      idsByType.record.length
        ? supabase.from('ddok_records').select('*, ddok_profiles(nickname)').in('id', idsByType.record).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      idsByType.question.length
        ? supabase.from('ddok_questions').select('*, ddok_profiles(nickname)').in('id', idsByType.question).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      idsByType.mission.length
        ? supabase.from('ddok_missions').select('*, ddok_profiles(nickname)').in('id', idsByType.mission).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      idsByType.book.length
        ? supabase.from('ddok_books').select('*, ddok_profiles(nickname)').in('id', idsByType.book).order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      supabase.from('ddok_group_goals').select('*').in('group_id', groupIds),
    ]);

    const groupIdsFor = (type, id) => (shareRows || []).filter((s) => s.item_type === type && s.item_id === id).map((s) => s.group_id);
    const attachShareGroups = (rows, type) => (rows || []).map((row) => ({ ...row, shared_group_ids: groupIdsFor(type, row.id) }));

    const questionIds = (questionRows || []).map((q) => q.id);
    const missionIds = (missionRows || []).map((m) => m.id);
    const sharedQuestionIds = idsByType.question;

    const [{ data: answerRows }, { data: doneRowsData }, { data: questionAnswerRows }, { data: commentRows }] = await Promise.all([
      questionIds.length
        ? supabase.from('ddok_group_answers').select('*, ddok_profiles(nickname)').in('group_question_id', questionIds)
        : Promise.resolve({ data: [] }),
      missionIds.length
        ? supabase.from('ddok_group_mission_done').select('*').in('group_mission_id', missionIds)
        : Promise.resolve({ data: [] }),
      sharedQuestionIds.length
        ? supabase.from('ddok_question_answers').select('*, ddok_profiles(nickname)').in('question_id', sharedQuestionIds)
        : Promise.resolve({ data: [] }),
      questionIds.length
        ? supabase.from('ddok_group_question_comments').select('*, ddok_profiles(nickname)').in('group_question_id', questionIds).order('created_at', { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

    setGroups(groupRows || []);
    setMembers(memberRows || []);
    setQuestions(questionRows || []);
    setAnswers(answerRows || []);
    setMissions(missionRows || []);
    setDoneRows(doneRowsData || []);
    setSharedRecords(attachShareGroups(sharedRecordRows, 'record'));
    setSharedQuestions(attachShareGroups(sharedQuestionRows, 'question'));
    setSharedMissions(attachShareGroups(sharedMissionRows, 'mission'));
    setSharedBooks(attachShareGroups(sharedBookRows, 'book'));
    setQuestionAnswers(questionAnswerRows || []);
    setGoals(goalRows || []);
    setQuestionComments(commentRows || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  const createGroup = useCallback(async ({ name }) => {
    const { error } = await supabase.from('ddok_groups').insert({ name: name.trim(), owner_id: userId });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const updateGroup = useCallback(async (groupId, { name }) => {
    const { error } = await supabase.from('ddok_groups').update({ name: name.trim() }).eq('id', groupId);
    if (error) throw error;
    await reload();
  }, [reload]);

  const deleteGroup = useCallback(async (groupId) => {
    const { error } = await supabase.from('ddok_groups').delete().eq('id', groupId);
    if (error) throw error;
    await reload();
  }, [reload]);

  const joinGroup = useCallback(async (code) => {
    const { error } = await supabase.rpc('ddok_join_group', { code: code.trim() });
    if (error) throw error;
    await reload();
  }, [reload]);

  const addGroupQuestion = useCallback(async (groupId, text) => {
    const { error } = await supabase.from('ddok_group_questions').insert({ group_id: groupId, text: text.trim(), created_by: userId });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const updateGroupQuestion = useCallback(async (id, text) => {
    const { error } = await supabase.from('ddok_group_questions').update({ text: text.trim() }).eq('id', id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const deleteGroupQuestion = useCallback(async (id) => {
    const { error } = await supabase.from('ddok_group_questions').delete().eq('id', id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const upsertAnswer = useCallback(async (groupQuestionId, text) => {
    const { error } = await supabase.from('ddok_group_answers')
      .upsert({ group_question_id: groupQuestionId, user_id: userId, text, updated_at: new Date().toISOString() },
        { onConflict: 'group_question_id,user_id' });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const addGroupMission = useCallback(async (groupId, text) => {
    const { error } = await supabase.from('ddok_group_missions').insert({ group_id: groupId, text: text.trim(), created_by: userId });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const updateGroupMission = useCallback(async (id, text) => {
    const { error } = await supabase.from('ddok_group_missions').update({ text: text.trim() }).eq('id', id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const deleteGroupMission = useCallback(async (id) => {
    const { error } = await supabase.from('ddok_group_missions').delete().eq('id', id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const upsertQuestionAnswer = useCallback(async (questionId, text) => {
    const { error } = await supabase.from('ddok_question_answers')
      .upsert({ question_id: questionId, user_id: userId, text, updated_at: new Date().toISOString() },
        { onConflict: 'question_id,user_id' });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const toggleGroupMissionDone = useCallback(async (missionId, currentlyDone) => {
    if (currentlyDone) {
      await supabase.from('ddok_group_mission_done').delete().eq('group_mission_id', missionId).eq('user_id', userId);
    } else {
      await supabase.from('ddok_group_mission_done').insert({ group_mission_id: missionId, user_id: userId });
    }
    await reload();
  }, [userId, reload]);

  const kickMember = useCallback(async (groupId, memberId) => {
    const { error } = await supabase.from('ddok_group_members').delete().eq('group_id', groupId).eq('user_id', memberId);
    if (error) throw error;
    await reload();
  }, [reload]);

  const setGroupGoal = useCallback(async (groupId, goalText) => {
    const now = new Date();
    const { error } = await supabase.from('ddok_group_goals').upsert({
      group_id: groupId, year: now.getFullYear(), month: now.getMonth() + 1,
      goal_text: goalText.trim(), updated_by: userId, updated_at: now.toISOString(),
    }, { onConflict: 'group_id,year,month' });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const addQuestionComment = useCallback(async (groupQuestionId, text) => {
    const { error } = await supabase.from('ddok_group_question_comments')
      .insert({ group_question_id: groupQuestionId, user_id: userId, text: text.trim() });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const deleteQuestionComment = useCallback(async (id) => {
    const { error } = await supabase.from('ddok_group_question_comments').delete().eq('id', id);
    if (error) throw error;
    await reload();
  }, [reload]);

  return {
    groups, members, questions, answers, missions, doneRows, loading, reload,
    sharedRecords, sharedQuestions, sharedMissions, sharedBooks, questionAnswers,
    goals, questionComments,
    createGroup, joinGroup, updateGroup, deleteGroup,
    addGroupQuestion, updateGroupQuestion, deleteGroupQuestion, upsertAnswer,
    addGroupMission, updateGroupMission, deleteGroupMission, toggleGroupMissionDone,
    upsertQuestionAnswer,
    kickMember, setGroupGoal, addQuestionComment, deleteQuestionComment,
  };
}
