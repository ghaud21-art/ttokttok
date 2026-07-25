import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient.js';

export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('ddok_profiles').select('id, nickname, is_admin, ai_uses_count, ai_unlimited').eq('id', userId).maybeSingle();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      loadProfile(data.session?.user?.id).finally(() => setLoading(false));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      loadProfile(newSession?.user?.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(async (email, password, nickname) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname: nickname?.trim() || undefined } },
    });
    if (error) throw error;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updateNickname = useCallback(async (nickname) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from('ddok_profiles').update({ nickname }).eq('id', session.user.id);
    if (error) throw error;
    await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const reloadProfile = useCallback(() => loadProfile(session?.user?.id), [session, loadProfile]);

  return {
    session,
    user: session?.user || null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateNickname,
    reloadProfile,
  };
}
