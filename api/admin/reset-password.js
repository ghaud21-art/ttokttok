// 관리자 전용 — 비밀번호를 잊은 사용자에게 임시 비밀번호를 발급하고,
// 다음 로그인 시 새 비밀번호를 설정하도록 강제한다.
import crypto from 'crypto';
import { getSupabaseAdmin, requireAdmin } from '../_lib/adminAuth.js';

function generateTempPassword() {
  // 헷갈리기 쉬운 문자(0/O, 1/l/I 등)를 제외한 12자리 임시 비밀번호
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i += 1) out += chars[bytes[i] % chars.length];
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { user, isAdmin } = await requireAdmin(req);
    if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
    if (!isAdmin) { res.status(403).json({ error: 'forbidden' }); return; }

    const { userId } = req.body || {};
    if (!userId) { res.status(400).json({ error: 'userId is required' }); return; }

    const tempPassword = generateTempPassword();
    const supabaseAdmin = getSupabaseAdmin();

    // email_confirm도 함께 true로 처리 — 이메일 인증을 안 한 사용자는 비밀번호가 맞아도
    // "Email not confirmed"로 로그인이 막히는데, 관리자가 도와주는 상황에서는 이 확인
    // 절차가 의미가 없으므로 리셋과 함께 바로 풀어준다.
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      email_confirm: true,
    });
    if (authError) { res.status(500).json({ error: authError.message }); return; }

    const { error: profileError } = await supabaseAdmin
      .from('ddok_profiles')
      .update({ must_change_password: true })
      .eq('id', userId);
    if (profileError) { res.status(500).json({ error: profileError.message }); return; }

    res.status(200).json({ tempPassword });
  } catch (err) {
    res.status(500).json({ error: err.message || 'unknown_error' });
  }
}
