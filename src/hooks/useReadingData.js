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
    const [b, r, q, m] = await Promise.all([
      supabase.from('books').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('records').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('questions').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
      supabase.from('missions').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
    ]);
    setBooks(b.data || []);
    setRecords(r.data || []);
    setQuestions(q.data || []);
    setMissions(m.data || []);
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
      finished_at: book.status === 'done' ? new Date().toISOString() : null,
    };
    const { error } = await supabase.from('books').insert(row);
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const setBookProgress = useCallback(async (book, rawPage) => {
    let page = parseInt(rawPage, 10);
    if (Number.isNaN(page) || page < 0) page = 0;
    if (book.total_pages > 0 && page > book.total_pages) page = book.total_pages;
    let status = book.status;
    let finished_at = book.finished_at;
    if (book.total_pages > 0 && page >= book.total_pages) {
      status = 'done';
      finished_at = finished_at || new Date().toISOString();
    } else if (page > 0 && status === 'want') {
      status = 'reading';
    }
    const { error } = await supabase.from('books')
      .update({ current_page: page, status, finished_at })
      .eq('id', book.id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const addRecord = useCallback(async (bookId, { type, text, tags }) => {
    const { error } = await supabase.from('records').insert({
      book_id: bookId, owner_id: userId, type, text: text.trim(), tags,
    });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const deleteRecord = useCallback(async (id) => {
    const { error } = await supabase.from('records').delete().eq('id', id);
    if (error) throw error;
    await reload();
  }, [reload]);

  const saveQuestionAnswer = useCallback(async (bookId, question, myThought) => {
    const { error } = await supabase.from('questions').insert({
      book_id: bookId, owner_id: userId, question, my_thought: myThought.trim(),
    });
    if (error) throw error;
    await reload();
  }, [userId, reload]);

  const addMissions = useCallback(async (bookId, texts, staleIds) => {
    if (staleIds?.length) {
      await supabase.from('missions').delete().in('id', staleIds).eq('done', false);
    }
    const rows = texts.map((text) => ({ book_id: bookId, owner_id: userId, text }));
    const { data, error } = await supabase.from('missions').insert(rows).select();
    if (error) throw error;
    await reload();
    return (data || []).map((d) => d.id);
  }, [userId, reload]);

  const toggleMission = useCallback(async (mission) => {
    const done = !mission.done;
    const { error } = await supabase.from('missions')
      .update({ done, completed_at: done ? new Date().toISOString() : null })
      .eq('id', mission.id);
    if (error) throw error;
    await reload();
  }, [reload]);

  return {
    books, records, questions, missions, loading, reload,
    addBook, setBookProgress, addRecord, deleteRecord,
    saveQuestionAnswer, addMissions, toggleMission,
  };
}
