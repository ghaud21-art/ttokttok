// 관리자 전용 — 계정 완전 삭제 (되돌릴 수 없음, FK cascade로 프로필/책/기록도 함께 삭제됨)
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

    const { userId } = req.body || {};
    if (!userId) { res.status(400).json({ error: 'userId is required' }); return; }
    if (userId === user.id) { res.status(400).json({ error: 'cannot_delete_self' }); return; }

    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) { res.status(500).json({ error: error.message }); return; }
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || 'unknown_error' });
  }
}
