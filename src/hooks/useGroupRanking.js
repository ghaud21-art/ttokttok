import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

export function useGroupRanking(groupId) {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!groupId) {
      setRanking([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('ddok_group_ranking', { gid: groupId });
    if (!error) setRanking(data || []);
    setLoading(false);
  }, [groupId]);

  useEffect(() => { reload(); }, [reload]);

  return { ranking, loading, reload };
}
