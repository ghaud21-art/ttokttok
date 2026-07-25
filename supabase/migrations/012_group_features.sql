-- ============================================================================
-- 마이그레이션: 함께읽기 모임 랭킹 + 멤버 강퇴 + 모임 독서 목표 + 질문 댓글
-- Supabase 대시보드 → SQL Editor에 이 파일만 붙여넣어 실행하세요.
-- ============================================================================

-- 멤버 강퇴: 본인 탈퇴에 더해 모임장이 다른 멤버를 내보낼 수 있게 확장
drop policy if exists "ddok users can leave a group" on public.ddok_group_members;
create policy "ddok users can leave or be kicked from a group"
  on public.ddok_group_members for delete
  to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.ddok_groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- 모임 랭킹: 멤버별 완독 권수/페이지수 집계만 반환 (개별 책 정보는 노출하지 않음)
create or replace function public.ddok_group_ranking(gid uuid)
returns table (
  user_id uuid,
  nickname text,
  avatar_url text,
  books_month int,
  books_year int,
  books_total int,
  pages_month int
)
language sql
security definer set search_path = public
stable
as $$
  select
    m.user_id,
    p.nickname,
    p.avatar_url,
    count(*) filter (
      where b.status = 'done' and date_trunc('month', b.finished_at) = date_trunc('month', now())
    )::int as books_month,
    count(*) filter (
      where b.status = 'done' and date_trunc('year', b.finished_at) = date_trunc('year', now())
    )::int as books_year,
    count(*) filter (where b.status = 'done')::int as books_total,
    coalesce((
      select sum(pl.pages_delta) from public.ddok_page_logs pl
      where pl.owner_id = m.user_id and date_trunc('month', pl.created_at) = date_trunc('month', now())
    ), 0)::int as pages_month
  from public.ddok_group_members m
  join public.ddok_profiles p on p.id = m.user_id
  left join public.ddok_books b on b.owner_id = m.user_id
  where m.group_id = gid and public.ddok_is_group_member(gid)
  group by m.user_id, p.nickname, p.avatar_url;
$$;

-- 모임 독서 목표 (월별, 공동 설정)
create table if not exists public.ddok_group_goals (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ddok_groups(id) on delete cascade,
  year int not null,
  month int not null,
  target_books int not null check (target_books > 0),
  updated_by uuid references public.ddok_profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (group_id, year, month)
);

alter table public.ddok_group_goals enable row level security;

create policy "ddok members can read group goals"
  on public.ddok_group_goals for select
  to authenticated
  using (public.ddok_is_group_member(group_id));

create policy "ddok members can set group goals"
  on public.ddok_group_goals for insert
  to authenticated
  with check (public.ddok_is_group_member(group_id) and updated_by = auth.uid());

create policy "ddok members can update group goals"
  on public.ddok_group_goals for update
  to authenticated
  using (public.ddok_is_group_member(group_id));

-- 함께 질문에 대한 자유 댓글 (질문마다 여러 개 남길 수 있는 짧은 코멘트)
create table if not exists public.ddok_group_question_comments (
  id uuid primary key default gen_random_uuid(),
  group_question_id uuid not null references public.ddok_group_questions(id) on delete cascade,
  user_id uuid not null references public.ddok_profiles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.ddok_group_question_comments enable row level security;

create index if not exists ddok_group_question_comments_q_idx on public.ddok_group_question_comments(group_question_id);

create policy "ddok members can read question comments"
  on public.ddok_group_question_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.ddok_group_questions q
      where q.id = group_question_id and public.ddok_is_group_member(q.group_id)
    )
  );

create policy "ddok members can add question comments"
  on public.ddok_group_question_comments for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.ddok_group_questions q
      where q.id = group_question_id and public.ddok_is_group_member(q.group_id)
    )
  );

create policy "ddok users can delete their own question comments"
  on public.ddok_group_question_comments for delete
  to authenticated
  using (user_id = auth.uid());
