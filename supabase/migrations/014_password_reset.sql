-- ============================================================================
-- 마이그레이션: 관리자 비밀번호 리셋 + 다음 로그인 시 새 비밀번호 설정 강제
-- Supabase 대시보드 → SQL Editor에 이 파일만 붙여넣어 실행하세요.
-- ============================================================================

alter table public.ddok_profiles add column if not exists must_change_password boolean not null default false;
