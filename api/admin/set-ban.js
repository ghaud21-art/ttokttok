// 관리자 전용 — 계정 정지/정지 해제
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

    const { userId, ban } = req.body || {};
    if (!userId) { res.status(400).json({ error: 'userId is required' }); return; }
    if (userId === user.id) { res.status(400).json({ error: 'cannot_ban_self' }); return; }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: ban ? '876000h' : 'none', // 876000h ≈ 100년 (사실상 영구), 'none'으로 해제
    });

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'unknown_error' });
  }
}
