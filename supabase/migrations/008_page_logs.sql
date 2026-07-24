-- ============================================================================
-- 마이그레이션: 페이지 진행 기록 (연간기록의 "이 달에 읽은 페이지" 집계용)
-- Supabase 대시보드 → SQL Editor에 이 파일만 붙여넣어 실행하세요.
-- ============================================================================

create table if not exists public.ddok_page_logs (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.ddok_books(id) on delete cascade,
  owner_id uuid not null references public.ddok_profiles(id) on delete cascade,
  pages_delta int not null check (pages_delta > 0),
  created_at timestamptz not null default now()
);

alter table public.ddok_page_logs enable row level security;

create policy "ddok owner can manage own page logs"
  on public.ddok_page_logs for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists ddok_page_logs_owner_idx on public.ddok_page_logs(owner_id);
create index if not exists ddok_page_logs_created_idx on public.ddok_page_logs(created_at);
