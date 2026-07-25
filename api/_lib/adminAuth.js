// 서버 전용 — SUPABASE_SERVICE_ROLE_KEY로 RLS를 우회하는 관리자 클라이언트와,
// 요청의 Authorization 헤더로 호출자를 검증하는 헬퍼. 절대 클라이언트에 노출하지 않는다.
import { createClient } from '@supabase/supabase-js';

let cached = null;

export function getSupabaseAdmin() {
  if (cached) return cached;
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY (또는 VITE_SUPABASE_URL)가 설정되지 않았습니다.');
  }
  cached = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  return cached;
}

export async function getAuthedUser(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

export async function requireAdmin(req) {
  const user = await getAuthedUser(req);
  if (!user) return { user: null, isAdmin: false };
  const supabaseAdmin = getSupabaseAdmin();
  const { data } = await supabaseAdmin.from('ddok_profiles').select('is_admin').eq('id', user.id).maybeSingle();
  return { user, isAdmin: !!data?.is_admin };
}
