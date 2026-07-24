-- ============================================================================
-- 마이그레이션: 멤버 독서 현황판 (지금 읽고 있는 책을 함께읽기 모임에 공유)
-- Supabase 대시보드 → SQL Editor에 이 파일만 붙여넣어 실행하세요.
-- ============================================================================

alter table public.ddok_books add column if not exists shared_group_id uuid references public.ddok_groups(id) on delete set null;

create index if not exists ddok_books_shared_group_idx on public.ddok_books(shared_group_id);

create policy "ddok members can view books shared to their group"
  on public.ddok_books for select
  to authenticated
  using (shared_group_id is not null and public.ddok_is_group_member(shared_group_id));
