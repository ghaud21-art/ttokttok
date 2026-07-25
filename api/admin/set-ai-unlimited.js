// 관리자 전용 — 특정 사용자에게 AI 무제한 권한 부여/해제 (관리자 권한 자체는 주지 않음)
import { getSupabaseAdmin, requireAdmin } from '../_lib/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { user, isAdmin } = await requireAdmin(req);
    if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
    if (!isAdmin) { res.status(403).json({ error: 'forbidden' }); return; }

    const { userId, unlimited } = req.body || {};
    if (!userId) { res.status(400).json({ error: 'userId is required' }); return; }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('ddok_profiles').update({ ai_unlimited: !!unlimited }).eq('id', userId);

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'unknown_error' });
  }
}
