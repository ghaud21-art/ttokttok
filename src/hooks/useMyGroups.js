import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

// 공유 대상 그룹 선택지처럼, 이름만 가볍게 필요한 곳에서 쓰는 최소 목록 훅.
export function useMyGroups(userId) {
  const [groups, setGroups] = useState([]);

  const reload = useCallback(async () => {
    if (!userId) { setGroups([]); return; }
    const { data } = await supabase.from('ddok_groups').select('id, name').order('name', { ascending: true });
    setGroups(data || []);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  return { groups, reload };
}
