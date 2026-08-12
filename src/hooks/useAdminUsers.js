import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

async function authedFetch(url, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `요청에 실패했어요 (${res.status})`);
  return data;
}

export function useAdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await authedFetch('/api/admin/users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || '목록을 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const setBan = useCallback(async (userId, ban) => {
    await authedFetch('/api/admin/set-ban', { method: 'POST', body: JSON.stringify({ userId, ban }) });
    await reload();
  }, [reload]);

  const deleteUser = useCallback(async (userId) => {
    await authedFetch('/api/admin/delete-user', { method: 'POST', body: JSON.stringify({ userId }) });
    await reload();
  }, [reload]);

  const setAiUnlimited = useCallback(async (userId, unlimited) => {
    await authedFetch('/api/admin/set-ai-unlimited', { method: 'POST', body: JSON.stringify({ userId, unlimited }) });
    await reload();
  }, [reload]);

  const resetPassword = useCallback(async (userId) => {
    const data = await authedFetch('/api/admin/reset-password', { method: 'POST', body: JSON.stringify({ userId }) });
    await reload();
    return data.tempPassword;
  }, [reload]);

  return { users, loading, error, reload, setBan, deleteUser, setAiUnlimited, resetPassword };
}
