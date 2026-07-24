-- ============================================================================
-- 똑똑 (독서 기록 웹 앱) — Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- profiles : auth.users 1:1, 닉네임 보관
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '독서가',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are readable by any signed-in user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid());

-- 회원가입 시 자동으로 profiles 행 생성 (닉네임은 signUp 시 options.data.nickname 으로 전달)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- books : 개인 서재 (비공개, owner만 접근)
-- ----------------------------------------------------------------------------
create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  author text default '',
  genre text not null default '미분류',
  total_pages int not null default 0,
  current_page int not null default 0,
  status text not null default 'reading' check (status in ('reading', 'done', 'want')),
  cover_url text default '',
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.books enable row level security;

create policy "owner can manage own books"
  on public.books for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists books_owner_idx on public.books(owner_id);

-- ----------------------------------------------------------------------------
-- records : 인용구 / 인사이트
-- ----------------------------------------------------------------------------
create table if not exists public.records (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('quote', 'insight')),
  text text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.records enable row level security;

create policy "owner can manage own records"
  on public.records for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists records_book_idx on public.records(book_id);
create index if not exists records_owner_idx on public.records(owner_id);
create index if not exists records_tags_idx on public.records using gin(tags);

-- ----------------------------------------------------------------------------
-- questions : AI 성찰 질문 + "나의 생각" (나의 독서 노트)
-- ----------------------------------------------------------------------------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  my_thought text not null,
  created_at timestamptz not null default now()
);

alter table public.questions enable row level security;

create policy "owner can manage own questions"
  on public.questions for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists questions_book_idx on public.questions(book_id);

-- ----------------------------------------------------------------------------
-- missions : AI 실천 미션 + 완료 아카이브
-- ----------------------------------------------------------------------------
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.missions enable row level security;

create policy "owner can manage own missions"
  on public.missions for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists missions_book_idx on public.missions(book_id);

-- ----------------------------------------------------------------------------
-- groups : 함께읽기 (초대코드로 참여하는 공유 공간)
-- ----------------------------------------------------------------------------
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  book_title text default '',
  book_author text default '',
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 6),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.groups enable row level security;

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

create table if not exists public.group_questions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.group_questions enable row level security;

create table if not exists public.group_answers (
  id uuid primary key default gen_random_uuid(),
  group_question_id uuid not null references public.group_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  text text not null,
  updated_at timestamptz not null default now(),
  unique (group_question_id, user_id)
);

alter table public.group_answers enable row level security;

create table if not exists public.group_missions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.group_missions enable row level security;

create table if not exists public.group_mission_done (
  group_mission_id uuid not null references public.group_missions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (group_mission_id, user_id)
);

alter table public.group_mission_done enable row level security;

-- membership helper (avoids RLS recursion issues across policies)
create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- 그룹 생성자는 자동으로 멤버가 됨
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id) values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_group_created on public.groups;
create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();

-- 초대코드로 그룹 참여
create or replace function public.join_group(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  gid uuid;
begin
  select id into gid from public.groups where invite_code = code;
  if gid is null then
    raise exception '초대코드를 찾을 수 없어요.';
  end if;
  insert into public.group_members (group_id, user_id) values (gid, auth.uid())
  on conflict do nothing;
  return gid;
end;
$$;

-- groups 정책
create policy "members can read their groups"
  on public.groups for select
  to authenticated
  using (public.is_group_member(id));

create policy "authenticated users can create groups"
  on public.groups for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "owner can update/delete group"
  on public.groups for update
  to authenticated
  using (owner_id = auth.uid());

create policy "owner can delete group"
  on public.groups for delete
  to authenticated
  using (owner_id = auth.uid());

-- group_members 정책
create policy "members can see other members of their groups"
  on public.group_members for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "users can leave a group"
  on public.group_members for delete
  to authenticated
  using (user_id = auth.uid());

-- (참여는 join_group() RPC를 통해서만 — security definer로 insert)

-- group_questions 정책
create policy "members can read group questions"
  on public.group_questions for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "members can add group questions"
  on public.group_questions for insert
  to authenticated
  with check (public.is_group_member(group_id));

-- group_answers 정책
create policy "members can read answers in their groups"
  on public.group_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.group_questions q
      where q.id = group_question_id and public.is_group_member(q.group_id)
    )
  );

create policy "members can write their own answer"
  on public.group_answers for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.group_questions q
      where q.id = group_question_id and public.is_group_member(q.group_id)
    )
  );

create policy "members can update their own answer"
  on public.group_answers for update
  to authenticated
  using (user_id = auth.uid());

-- group_missions 정책
create policy "members can read group missions"
  on public.group_missions for select
  to authenticated
  using (public.is_group_member(group_id));

create policy "members can add group missions"
  on public.group_missions for insert
  to authenticated
  with check (public.is_group_member(group_id));

-- group_mission_done 정책
create policy "members can read mission completion in their groups"
  on public.group_mission_done for select
  to authenticated
  using (
    exists (
      select 1 from public.group_missions m
      where m.id = group_mission_id and public.is_group_member(m.group_id)
    )
  );

create policy "members can toggle their own mission completion"
  on public.group_mission_done for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.group_missions m
      where m.id = group_mission_id and public.is_group_member(m.group_id)
    )
  );

create policy "members can remove their own mission completion"
  on public.group_mission_done for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Storage : 책 표지 이미지 버킷
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do nothing;

create policy "anyone can view cover images"
  on storage.objects for select
  using (bucket_id = 'covers');

create policy "signed-in users can upload cover images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'covers');

create policy "owners can update/delete their own cover images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'covers' and owner = auth.uid());

create policy "owners can delete their own cover images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'covers' and owner = auth.uid());
