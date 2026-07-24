-- ============================================================================
-- 마이그레이션: 함께 질문/미션 수정·삭제, 공유된 AI 질문 노트에 답변 남기기
-- Supabase 대시보드 → SQL Editor에 이 파일만 붙여넣어 실행하세요.
-- ============================================================================

-- 1) 누가 만들었는지 기록해야 수정/삭제 권한을 줄 수 있음
alter table public.ddok_group_questions add column if not exists created_by uuid references public.ddok_profiles(id) on delete set null;
alter table public.ddok_group_missions add column if not exists created_by uuid references public.ddok_profiles(id) on delete set null;

-- 2) insert 정책을 created_by = auth.uid() 를 요구하도록 교체
drop policy if exists "ddok members can add group questions" on public.ddok_group_questions;
create policy "ddok members can add group questions"
  on public.ddok_group_questions for insert
  to authenticated
  with check (public.ddok_is_group_member(group_id) and created_by = auth.uid());

drop policy if exists "ddok members can add group missions" on public.ddok_group_missions;
create policy "ddok members can add group missions"
  on public.ddok_group_missions for insert
  to authenticated
  with check (public.ddok_is_group_member(group_id) and created_by = auth.uid());

-- 3) 작성자 본인 또는 모임장이 수정/삭제 가능
create policy "ddok creator or group owner can update group questions"
  on public.ddok_group_questions for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.ddok_groups g where g.id = group_id and g.owner_id = auth.uid())
  );

create policy "ddok creator or group owner can delete group questions"
  on public.ddok_group_questions for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.ddok_groups g where g.id = group_id and g.owner_id = auth.uid())
  );

create policy "ddok creator or group owner can update group missions"
  on public.ddok_group_missions for update
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.ddok_groups g where g.id = group_id and g.owner_id = auth.uid())
  );

create policy "ddok creator or group owner can delete group missions"
  on public.ddok_group_missions for delete
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.ddok_groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- 4) 공유된 개인 AI 질문 노트에 다른 멤버가 답변을 남길 수 있는 테이블
create table if not exists public.ddok_question_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.ddok_questions(id) on delete cascade,
  user_id uuid not null references public.ddok_profiles(id) on delete cascade,
  text text not null,
  updated_at timestamptz not null default now(),
  unique (question_id, user_id)
);

alter table public.ddok_question_answers enable row level security;

create index if not exists ddok_question_answers_question_idx on public.ddok_question_answers(question_id);

create policy "ddok members can read answers to shared questions"
  on public.ddok_question_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.ddok_questions q
      where q.id = question_id and q.shared_group_id is not null and public.ddok_is_group_member(q.shared_group_id)
    )
  );

create policy "ddok members can write their own answer to shared questions"
  on public.ddok_question_answers for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.ddok_questions q
      where q.id = question_id and q.shared_group_id is not null and public.ddok_is_group_member(q.shared_group_id)
    )
  );

create policy "ddok members can update their own answer to shared questions"
  on public.ddok_question_answers for update
  to authenticated
  using (user_id = auth.uid());

create policy "ddok members can delete their own answer to shared questions"
  on public.ddok_question_answers for delete
  to authenticated
  using (user_id = auth.uid());
