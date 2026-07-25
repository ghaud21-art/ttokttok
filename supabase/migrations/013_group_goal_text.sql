-- ============================================================================
-- 마이그레이션: 모임 독서 목표를 권수(숫자)가 아닌 자유 텍스트로 변경
-- (예: "매일 10분씩 읽기") — Supabase 대시보드 → SQL Editor에 이 파일만 실행하세요.
-- 반드시 012_group_features.sql을 먼저 실행한 뒤에 실행하세요.
-- ============================================================================

alter table public.ddok_group_goals add column if not exists goal_text text not null default '';
alter table public.ddok_group_goals drop column if exists target_books;
