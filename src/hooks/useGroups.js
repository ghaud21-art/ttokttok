import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

export function useGroups(userId) {
  const [groups, setGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [missions, setMissions] = useState([]);
  const [doneRows, setDoneRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setGroups([]); setMembers([]); setQuestions([]); setAnswers([]); setMissions([]); setDoneRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: groupRows } = await supabase.from('ddok_groups').select('*').order('created_at', { ascending: false });
    const groupIds = (groupRows || []).map((g) => g.id);

    if (groupIds.length === 0) {
      setGroups([]); setMembers([]); setQuestions([]); setAnswers([]); setMissions([]); setDoneRows([]);
      setLoading(false);
      return;
    }

    const [{ data: memberRows }, { data: questionRows }, { data: missionRows }] = await Promise.all([
      supabase.from('ddok_group_members').select('group_id, user_id, ddok_profiles(nickname)').in('group_id', groupIds),
      supabase.from('ddok_group_questions').select('*').in('group_id', groupIds).order('created_at', { ascending: true }),
      supabase.from('ddok_group_missions').select('*').in('group_id', groupIds).order('created_at', { ascending: true }),
    ]);

    const questionIds = (questionRows || []).map((q) => q.id);
    const missionIds = (missionRows || []).map((m) => m.id);

    const [{ data: answerRows }, { data: doneRowsData }] = await Promise.all([
      questionIds.length
        ? supabase.from('ddok_group_answers').select('*, ddok_profiles(nickname)').in('group_question_id', questionIds)
        : Promise.resolve({ data: [] }),
      missionIds.length
        ? supabase.from('ddok_group_mission_done').select('*').in('group_mission_id', missionIds)
        : Promise.resolve({ data: [] }),
    ]);

    setGroups(groupRows || []);
    setMembers(memberRows || []);
    setQuestions(questionRows || []);
    setAnswers(answerRows || []);
    setMissions(missionRows || []);
    setDoneRows(doneRowsData || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  const createGroup = useCallback(async ({ name, bookTitle, bookAuthor }) => {
    const { error } = await supabase.from('ddok_groups').insert({
      name: name.trim(), book_title: bookTitle.trim(), book_author: bookAuthor.trim(), owner_id: userId,
    });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const joinGroup = useCallback(async (code) => {
    const { error } = await supabase.rpc('ddok_join_group', { code: code.trim() });
    if (error) throw error;
    await reload();
  }, [reload]);

  const addGroupQuestion = useCallback(async (groupId, text) => {
    const { error } = await supabase.from('ddok_group_questions').insert({ group_id: groupId, text: text.trim() });
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
    const { error } = await supabase.from('ddok_group_missions').insert({ group_id: groupId, text: text.trim() });
    if (error) throw error;
    await reload();
  }, [reload]);

  const toggleGroupMissionDone = useCallback(async (missionId, currentlyDone) => {
    if (currentlyDone) {
      await supabase.from('ddok_group_mission_done').delete().eq('group_mission_id', missionId).eq('user_id', userId);
    } else {
      await supabase.from('ddok_group_mission_done').insert({ group_mission_id: missionId, user_id: userId });
    }
    await reload();
  }, [userId, reload]);

  return {
    groups, members, questions, answers, missions, doneRows, loading, reload,
    createGroup, joinGroup, addGroupQuestion, upsertAnswer, addGroupMission, toggleGroupMissionDone,
  };
}
