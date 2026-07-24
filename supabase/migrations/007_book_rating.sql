-- ============================================================================
-- 마이그레이션: 책 별점 (0.5점 단위, 5점 만점)
-- Supabase 대시보드 → SQL Editor에 이 파일만 붙여넣어 실행하세요.
-- ============================================================================

alter table public.ddok_books add column if not exists rating numeric(2,1);

alter table public.ddok_books drop constraint if exists ddok_books_rating_check;
alter table public.ddok_books add constraint ddok_books_rating_check
  check (rating is null or (rating >= 0.5 and rating <= 5.0 and (rating * 2) = round(rating * 2)));
