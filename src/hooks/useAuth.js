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
    const { data, error } = await supabase.from('ddok_profiles').select('id, nickname, is_admin, ai_uses_count, ai_unlimited, avatar_url, must_change_password').eq('id', userId).maybeSingle();
    if (error) console.error('[useAuth] 프로필을 불러오지 못했어요 (마이그레이션이 밀려있지 않은지 확인하세요):', error.message);
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

  const updateAvatar = useCallback(async (avatarUrl) => {
    if (!session?.user?.id) return;
    const { error } = await supabase.from('ddok_profiles').update({ avatar_url: avatarUrl }).eq('id', session.user.id);
    if (error) throw error;
    await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const reloadProfile = useCallback(() => loadProfile(session?.user?.id), [session, loadProfile]);

  const completePasswordReset = useCallback(async (newPassword) => {
    if (!session?.user?.id) return;
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) throw authError;
    const { error } = await supabase.from('ddok_profiles').update({ must_change_password: false }).eq('id', session.user.id);
    if (error) throw error;
    await loadProfile(session.user.id);
  }, [session, loadProfile]);

  return {
    session,
    user: session?.user || null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateNickname,
    updateAvatar,
    reloadProfile,
    completePasswordReset,
  };
}
