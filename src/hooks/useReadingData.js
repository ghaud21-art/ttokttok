import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

export function useReadingData(userId) {
  const [books, setBooks] = useState([]);
  const [records, setRecords] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setBooks([]); setRecords([]); setQuestions([]); setMissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [b, r, q, m, sharesRes] = await Promise.all([
      supabase.from('ddok_books').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('ddok_records').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('ddok_questions').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('ddok_missions').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('ddok_shares').select('item_type, item_id, group_id').eq('owner_id', userId),
    ]);

    const sharesByItem = {};
    (sharesRes.data || []).forEach((s) => {
      const key = `${s.item_type}:${s.item_id}`;
      (sharesByItem[key] ||= []).push(s.group_id);
    });
    const attachShares = (rows, type) => (rows || []).map((row) => ({
      ...row, shared_group_ids: sharesByItem[`${type}:${row.id}`] || [],
    }));

    setBooks(attachShares(b.data, 'book'));
    setRecords(attachShares(r.data, 'record'));
    setQuestions(attachShares(q.data, 'question'));
    setMissions(attachShares(m.data, 'mission'));
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  const addBook = useCallback(async (book) => {
    const total = parseInt(book.totalPages, 10) || 0;
    const row = {
      owner_id: userId,
      title: book.title.trim(),
      author: (book.author || '').trim(),
      genre: (book.genre || '').trim() || '미분류',
      total_pages: total,
      current_page: book.status === 'done' ? total : 0,
      status: book.status,
      cover_url: book.coverUrl || '',
      started_at: book.status === 'want' ? null : (book.startedAt || new Date().toISOString()),
      finished_at: book.status === 'done' ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from('ddok_books').insert(row);
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const updateBook = useCallback(async (bookId, book) => {
    const existing = books.find((b) => b.id === bookId);
    const total = parseInt(book.totalPages, 10) || 0;
    let current_page = existing ? Math.min(existing.current_page, total || existing.current_page) : 0;
    let finished_at = existing?.finished_at || null;
    if (book.status === 'done') {
      current_page = total;
      finished_at = finished_at || new Date().toISOString();
    } else {
      finished_at = null;
    }
    const started_at = book.status === 'want' ? null : (book.startedAt || existing?.started_at || new Date().toISOString());
    const row = {
      title: book.title.trim(),
      author: (book.author || '').trim(),
      genre: (book.genre || '').trim() || '미분류',
      total_pages: total,
      current_page,
      status: book.status,
      cover_url: book.coverUrl || '',
      started_at,
      finished_at,
    };
    const { error } = await supabase.from('ddok_books').update(row).eq('id', bookId);
    if (error) throw error;
    await reload();
  }, [books, reload]);

  const deleteBook = useCallback(async (bookId) => {
    const { error } = await supabase.from('ddok_books').delete().eq('id', bookId);
    if (error) throw error;
    await reload();
  }, [reload]);

  const setBookProgress = useCallback(async (book, rawPage) => {
    let page = parseInt(rawPage, 10);
    if (Number.isNaN(page) || page < 0) page = 0;
    if (book.total_pages > 0 && page > book.total_pages) page = book.total_pages;
    let status = book.status;
    let finished_at = book.finished_at;
    let started_at = book.started_at;
    if (book.total_pages > 0 && page >= book.total_pages) {
      status = 'done';
      finished_at = finished_at || new Date().toISOString();
      started_at = started_at || new Date().toISOString();
    } else if (page > 0 && status === 'want') {
      status = 'reading';
      started_at = started_at || new Date().toISOString();
    }
    const { error } = await supabase.from('ddok_books')
      .update({ current_page: page, status, finished_at, started_at })
      .eq('id', book.id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const addRecord = useCallback(async (bookId, bookTitle, { type, text, tags }) => {
    const { error } = await supabase.from('ddok_records').insert({
      book_id: bookId, owner_id: userId, book_title: bookTitle, type, text: text.trim(), tags,
    });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const deleteRecord = useCallback(async (id) => {
    const { error } = await supabase.from('ddok_records').delete().eq('id', id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const saveQuestionAnswer = useCallback(async (bookId, bookTitle, question, myThought) => {
    const { error } = await supabase.from('ddok_questions').insert({
      book_id: bookId, owner_id: userId, book_title: bookTitle, question, my_thought: myThought.trim(),
    });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const updateQuestion = useCallback(async (id, myThought) => {
    const { error } = await supabase.from('ddok_questions').update({ my_thought: myThought.trim() }).eq('id', id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const deleteQuestion = useCallback(async (id) => {
    const { error } = await supabase.from('ddok_questions').delete().eq('id', id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const addMissions = useCallback(async (bookId, bookTitle, texts, staleIds) => {
    if (staleIds?.length) {
      await supabase.from('ddok_missions').delete().in('id', staleIds).eq('done', false);
    }
    const rows = texts.map((text) => ({ book_id: bookId, owner_id: userId, book_title: bookTitle, text }));
    const { data, error } = await supabase.from('ddok_missions').insert(rows).select();
    if (error) throw error;
    await reload();
    return (data || []).map((d) => d.id);
  }, [userId, reload]);

  const toggleMission = useCallback(async (mission) => {
    const done = !mission.done;
    const { error } = await supabase.from('ddok_missions')
      .update({ done, completed_at: done ? new Date().toISOString() : null })
      .eq('id', mission.id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const setShares = useCallback(async (itemType, id, groupIds) => {
    await supabase.from('ddok_shares').delete().eq('item_type', itemType).eq('item_id', id).eq('owner_id', userId);
    if (groupIds.length) {
      const rows = groupIds.map((gid) => ({ item_type: itemType, item_id: id, group_id: gid, owner_id: userId }));
      const { error } = await supabase.from('ddok_shares').insert(rows);
      if (error) throw error;
    }
    await reload();
  }, [userId, reload]);

  const shareRecord = useCallback((id, groupIds) => setShares('record', id, groupIds), [setShares]);
  const shareQuestion = useCallback((id, groupIds) => setShares('question', id, groupIds), [setShares]);
  const shareMission = useCallback((id, groupIds) => setShares('mission', id, groupIds), [setShares]);
  const shareBook = useCallback((id, groupIds) => setShares('book', id, groupIds), [setShares]);

  return {
    books, records, questions, missions, loading, reload,
    addBook, updateBook, deleteBook, setBookProgress, addRecord, deleteRecord,
    saveQuestionAnswer, updateQuestion, deleteQuestion, addMissions, toggleMission,
    shareRecord, shareQuestion, shareMission, shareBook,
  };
}
