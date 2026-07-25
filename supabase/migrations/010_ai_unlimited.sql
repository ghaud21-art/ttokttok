-- ============================================================================
-- 마이그레이션: 사용자별 AI 무제한 권한 (관리자 권한 없이 AI만 무제한)
-- Supabase 대시보드 → SQL Editor에 이 파일만 붙여넣어 실행하세요.
-- 반드시 009_admin_ai_limits.sql을 먼저 실행한 뒤에 실행하세요.
-- ============================================================================

alter table public.ddok_profiles add column if not exists ai_unlimited boolean not null default false;

-- 클라이언트가 직접 못 바꾸게 컬럼 단위로 권한을 뺀다 (서버의 service role만 변경 가능)
revoke update (ai_unlimited) on public.ddok_profiles from authenticated;
