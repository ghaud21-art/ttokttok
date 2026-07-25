import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient.js';

// ddok_app_settings는 조회는 로그인 사용자 전체, 수정은 관리자만 가능하도록 RLS로 막혀 있다.
export function useAppSettings() {
  const [aiEnabled, setAiEnabledState] = useState(true);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ddok_app_settings').select('ai_enabled').eq('id', true).maybeSingle();
    setAiEnabledState(data ? data.ai_enabled !== false : true);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const setAiEnabled = useCallback(async (value) => {
    const { error } = await supabase.from('ddok_app_settings')
      .update({ ai_enabled: value, updated_at: new Date().toISOString() })
      .eq('id', true);
    if (error) throw error;
    await reload();
  }, [reload]);

  return { aiEnabled, loading, setAiEnabled, reload };
}
