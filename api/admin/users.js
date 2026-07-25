// 관리자 전용 — 전체 가입자 목록 (auth.users + ddok_profiles + 등록 책 수)
import { getSupabaseAdmin, requireAdmin } from '../_lib/adminAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { user, isAdmin } = await requireAdmin(req);
    if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
    if (!isAdmin) { res.status(403).json({ error: 'forbidden' }); return; }

    const supabaseAdmin = getSupabaseAdmin();

    const [{ data: authList, error: authError }, { data: profiles }, { data: bookRows }] = await Promise.all([
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      supabaseAdmin.from('ddok_profiles').select('id, nickname, is_admin, ai_uses_count'),
      supabaseAdmin.from('ddok_books').select('owner_id'),
    ]);

    if (authError) {
      res.status(500).json({ error: authError.message });
      return;
    }

    const profileById = {};
    (profiles || []).forEach((p) => { profileById[p.id] = p; });

    const bookCountById = {};
    (bookRows || []).forEach((b) => { bookCountById[b.owner_id] = (bookCountById[b.owner_id] || 0) + 1; });

    const users = (authList?.users || [])
      .map((u) => ({
        id: u.id,
        email: u.email,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at,
        banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        nickname: profileById[u.id]?.nickname || '',
        isAdmin: !!profileById[u.id]?.is_admin,
        aiUsesCount: profileById[u.id]?.ai_uses_count || 0,
        bookCount: bookCountById[u.id] || 0,
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message || 'unknown_error' });
  }
}
