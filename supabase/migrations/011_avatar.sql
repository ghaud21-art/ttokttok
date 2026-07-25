-- ============================================================================
-- 마이그레이션: 프로필 사진 (마이페이지)
-- Supabase 대시보드 → SQL Editor에 이 파일만 붙여넣어 실행하세요.
-- ============================================================================

alter table public.ddok_profiles add column if not exists avatar_url text not null default '';
