-- ============================================================================
-- 마이그레이션: 기록/질문/미션/독서현황을 여러 모임에 동시에 공유
-- 기존에는 shared_group_id 컬럼 하나로 한 모임에만 공유할 수 있었는데,
-- 이제 ddok_shares 테이블로 여러 모임에 동시 공유할 수 있게 바꿉니다.
-- Supabase 대시보드 → SQL Editor에 이 파일만 붙여넣어 실행하세요.
-- ============================================================================

-- 1) 기존 shared_group_id 기반 정책 제거
drop policy if exists "ddok members can view records shared to their group" on public.ddok_records;
drop policy if exists "ddok members can view questions shared to their group" on public.ddok_questions;
drop policy if exists "ddok members can view missions shared to their group" on public.ddok_missions;
drop policy if exists "ddok members can view books shared to their group" on public.ddok_books;
drop policy if exists "ddok members can read answers to shared questions" on public.ddok_question_answers;
drop policy if exists "ddok members can write their own answer to shared questions" on public.ddok_question_answers;

-- 2) 기존 shared_group_id 컬럼/인덱스 제거 (더 이상 사용하지 않음)
drop index if exists ddok_records_shared_group_idx;
drop index if exists ddok_questions_shared_group_idx;
drop index if exists ddok_missions_shared_group_idx;
drop index if exists ddok_books_shared_group_idx;
alter table public.ddok_records drop column if exists shared_group_id;
alter table public.ddok_questions drop column if exists shared_group_id;
alter table public.ddok_missions drop column if exists shared_group_id;
alter table public.ddok_books drop column if exists shared_group_id;

-- 3) 여러 모임에 동시 공유 가능한 범용 테이블
create table if not exists public.ddok_shares (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('record', 'question', 'mission', 'book')),
  item_id uuid not null,
  group_id uuid not null references public.ddok_groups(id) on delete cascade,
  owner_id uuid not null references public.ddok_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (item_type, item_id, group_id)
);

alter table public.ddok_shares enable row level security;

create index if not exists ddok_shares_item_idx on public.ddok_shares(item_type, item_id);
create index if not exists ddok_shares_group_idx on public.ddok_shares(group_id);

create policy "ddok owner can view own shares"
  on public.ddok_shares for select
  to authenticated
  using (owner_id = auth.uid());

create policy "ddok members can view shares for their groups"
  on public.ddok_shares for select
  to authenticated
  using (public.ddok_is_group_member(group_id));

create policy "ddok owner can add shares"
  on public.ddok_shares for insert
  to authenticated
  with check (owner_id = auth.uid() and public.ddok_is_group_member(group_id));

create policy "ddok owner can remove shares"
  on public.ddok_shares for delete
  to authenticated
  using (owner_id = auth.uid());

-- 4) 새 정책: ddok_shares를 근거로 조회 허용
create policy "ddok members can view shared records"
  on public.ddok_records for select
  to authenticated
  using (exists (
    select 1 from public.ddok_shares s
    where s.item_type = 'record' and s.item_id = ddok_records.id and public.ddok_is_group_member(s.group_id)
  ));

create policy "ddok members can view shared questions"
  on public.ddok_questions for select
  to authenticated
  using (exists (
    select 1 from public.ddok_shares s
    where s.item_type = 'question' and s.item_id = ddok_questions.id and public.ddok_is_group_member(s.group_id)
  ));

create policy "ddok members can view shared missions"
  on public.ddok_missions for select
  to authenticated
  using (exists (
    select 1 from public.ddok_shares s
    where s.item_type = 'mission' and s.item_id = ddok_missions.id and public.ddok_is_group_member(s.group_id)
  ));

create policy "ddok members can view shared books"
  on public.ddok_books for select
  to authenticated
  using (exists (
    select 1 from public.ddok_shares s
    where s.item_type = 'book' and s.item_id = ddok_books.id and public.ddok_is_group_member(s.group_id)
  ));

create policy "ddok members can read answers to shared questions"
  on public.ddok_question_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.ddok_shares s
      where s.item_type = 'question' and s.item_id = question_id and public.ddok_is_group_member(s.group_id)
    )
  );

create policy "ddok members can write their own answer to shared questions"
  on public.ddok_question_answers for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.ddok_shares s
      where s.item_type = 'question' and s.item_id = question_id and public.ddok_is_group_member(s.group_id)
    )
  );
