-- ============================================================================
-- 똑똑 (독서 기록 웹 앱) — Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 실행하세요.
--
-- 다른 앱과 같은 Supabase 프로젝트를 함께 쓰는 경우를 대비해, 이 앱이 만드는
-- 모든 테이블 / 함수 / 트리거 / Storage 버킷 이름 앞에 `ddok_` 접두사를 붙였습니다.
-- 기존 프로젝트에 이미 있는 테이블(예: profiles, records 등)과 이름이 겹치지 않아
-- 안전하게 같이 쓸 수 있어요. (단, auth.users 테이블은 프로젝트 전체가 공유하므로
-- 이미 가입된 계정이 있다면 그대로 로그인해서 쓸 수 있습니다.)
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- ddok_profiles : auth.users 1:1, 닉네임 보관 (이 앱 전용 프로필)
-- ----------------------------------------------------------------------------
create table if not exists public.ddok_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '독서가',
  is_admin boolean not null default false,
  ai_uses_count int not null default 0,
  ai_unlimited boolean not null default false,
  avatar_url text not null default '',
  created_at timestamptz not null default now()
);

alter table public.ddok_profiles enable row level security;

create policy "ddok profiles are readable by any signed-in user"
  on public.ddok_profiles for select
  to authenticated
  using (true);

create policy "ddok users can update their own profile"
  on public.ddok_profiles for update
  to authenticated
  using (id = auth.uid());

-- is_admin / ai_uses_count / ai_unlimited는 클라이언트가 직접 못 바꾸게 컬럼 단위로 권한을 뺀다.
-- (행 단위 정책만으로는 "본인 프로필이니 아무 컬럼이나 수정 가능"이 되어버림 —
-- 그러면 누구나 자기 자신을 관리자로 만들거나 사용 횟수를 조작할 수 있음)
revoke update (is_admin, ai_uses_count, ai_unlimited) on public.ddok_profiles from authenticated;

-- 관리자 여부 확인 헬퍼 (다른 정책에서 재사용)
create or replace function public.ddok_is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select is_admin from public.ddok_profiles where id = auth.uid()), false);
$$;

-- ----------------------------------------------------------------------------
-- ddok_app_settings : 앱 전역 설정 (싱글턴 1행) — 지금은 AI 기능 on/off만 관리
-- ----------------------------------------------------------------------------
create table if not exists public.ddok_app_settings (
  id boolean primary key default true check (id),
  ai_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.ddok_app_settings (id, ai_enabled) values (true, true)
  on conflict (id) do nothing;

alter table public.ddok_app_settings enable row level security;

create policy "ddok signed-in users can read app settings"
  on public.ddok_app_settings for select
  to authenticated
  using (true);

create policy "ddok admins can update app settings"
  on public.ddok_app_settings for update
  to authenticated
  using (public.ddok_is_admin());

-- 회원가입 시 자동으로 ddok_profiles 행 생성 (닉네임은 signUp 시 options.data.nickname 으로 전달)
create or replace function public.ddok_handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.ddok_profiles (id, nickname)
  values (new.id, coalesce(new.raw_user_meta_data->>'nickname', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ddok_on_auth_user_created on auth.users;
create trigger ddok_on_auth_user_created
  after insert on auth.users
  for each row execute function public.ddok_handle_new_user();

-- ----------------------------------------------------------------------------
-- ddok_books : 개인 서재 (비공개, owner만 접근)
-- ----------------------------------------------------------------------------
create table if not exists public.ddok_books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.ddok_profiles(id) on delete cascade,
  title text not null,
  author text default '',
  genre text not null default '미분류',
  total_pages int not null default 0,
  current_page int not null default 0,
  status text not null default 'reading' check (status in ('reading', 'done', 'want')),
  cover_url text default '',
  rating numeric(2,1) check (rating is null or (rating >= 0.5 and rating <= 5.0 and (rating * 2) = round(rating * 2))),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ddok_books enable row level security;

create policy "ddok owner can manage own books"
  on public.ddok_books for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- ddok_page_logs : 진행률 슬라이더로 페이지를 앞으로 넘길 때마다 남기는 기록
-- (연간기록의 "이 달에 읽은 페이지" 집계용)
-- ----------------------------------------------------------------------------
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

create index if not exists ddok_books_owner_idx on public.ddok_books(owner_id);

-- ----------------------------------------------------------------------------
-- ddok_records : 인용구 / 인사이트
-- ----------------------------------------------------------------------------
create table if not exists public.ddok_records (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.ddok_books(id) on delete cascade,
  owner_id uuid not null references public.ddok_profiles(id) on delete cascade,
  type text not null check (type in ('quote', 'insight')),
  text text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.ddok_records enable row level security;

create policy "ddok owner can manage own records"
  on public.ddok_records for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists ddok_records_book_idx on public.ddok_records(book_id);
create index if not exists ddok_records_owner_idx on public.ddok_records(owner_id);
create index if not exists ddok_records_tags_idx on public.ddok_records using gin(tags);

-- ----------------------------------------------------------------------------
-- ddok_questions : AI 성찰 질문 + "나의 생각" (나의 독서 노트)
-- ----------------------------------------------------------------------------
create table if not exists public.ddok_questions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.ddok_books(id) on delete cascade,
  owner_id uuid not null references public.ddok_profiles(id) on delete cascade,
  question text not null,
  my_thought text not null,
  created_at timestamptz not null default now()
);

alter table public.ddok_questions enable row level security;

create policy "ddok owner can manage own questions"
  on public.ddok_questions for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists ddok_questions_book_idx on public.ddok_questions(book_id);

-- ----------------------------------------------------------------------------
-- ddok_missions : AI 실천 미션 + 완료 아카이브
-- ----------------------------------------------------------------------------
create table if not exists public.ddok_missions (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.ddok_books(id) on delete cascade,
  owner_id uuid not null references public.ddok_profiles(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.ddok_missions enable row level security;

create policy "ddok owner can manage own missions"
  on public.ddok_missions for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create index if not exists ddok_missions_book_idx on public.ddok_missions(book_id);

-- ----------------------------------------------------------------------------
-- ddok_groups : 함께읽기 (초대코드로 참여하는 공유 공간)
-- ----------------------------------------------------------------------------
create table if not exists public.ddok_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  book_title text default '',
  book_author text default '',
  invite_code text not null unique default substr(md5(random()::text || clock_timestamp()::text), 1, 6),
  owner_id uuid not null references public.ddok_profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ddok_groups enable row level security;

create table if not exists public.ddok_group_members (
  group_id uuid not null references public.ddok_groups(id) on delete cascade,
  user_id uuid not null references public.ddok_profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.ddok_group_members enable row level security;

create table if not exists public.ddok_group_questions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ddok_groups(id) on delete cascade,
  text text not null,
  created_by uuid references public.ddok_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ddok_group_questions enable row level security;

create table if not exists public.ddok_group_answers (
  id uuid primary key default gen_random_uuid(),
  group_question_id uuid not null references public.ddok_group_questions(id) on delete cascade,
  user_id uuid not null references public.ddok_profiles(id) on delete cascade,
  text text not null,
  updated_at timestamptz not null default now(),
  unique (group_question_id, user_id)
);

alter table public.ddok_group_answers enable row level security;

create table if not exists public.ddok_group_missions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.ddok_groups(id) on delete cascade,
  text text not null,
  created_by uuid references public.ddok_profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ddok_group_missions enable row level security;

create table if not exists public.ddok_group_mission_done (
  group_mission_id uuid not null references public.ddok_group_missions(id) on delete cascade,
  user_id uuid not null references public.ddok_profiles(id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (group_mission_id, user_id)
);

alter table public.ddok_group_mission_done enable row level security;

-- membership helper (avoids RLS recursion issues across policies)
create or replace function public.ddok_is_group_member(gid uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.ddok_group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

-- 그룹 생성자는 자동으로 멤버가 됨
create or replace function public.ddok_handle_new_group()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.ddok_group_members (group_id, user_id) values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists ddok_on_group_created on public.ddok_groups;
create trigger ddok_on_group_created
  after insert on public.ddok_groups
  for each row execute function public.ddok_handle_new_group();

-- 초대코드로 그룹 참여
create or replace function public.ddok_join_group(code text)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  gid uuid;
begin
  select id into gid from public.ddok_groups where invite_code = code;
  if gid is null then
    raise exception '초대코드를 찾을 수 없어요.';
  end if;
  insert into public.ddok_group_members (group_id, user_id) values (gid, auth.uid())
  on conflict do nothing;
  return gid;
end;
$$;

-- ddok_groups 정책
create policy "ddok members can read their groups"
  on public.ddok_groups for select
  to authenticated
  using (public.ddok_is_group_member(id));

create policy "ddok authenticated users can create groups"
  on public.ddok_groups for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "ddok owner can update group"
  on public.ddok_groups for update
  to authenticated
  using (owner_id = auth.uid());

create policy "ddok owner can delete group"
  on public.ddok_groups for delete
  to authenticated
  using (owner_id = auth.uid());

-- ddok_group_members 정책
create policy "ddok members can see other members of their groups"
  on public.ddok_group_members for select
  to authenticated
  using (public.ddok_is_group_member(group_id));

create policy "ddok users can leave a group"
  on public.ddok_group_members for delete
  to authenticated
  using (user_id = auth.uid());

-- (참여는 ddok_join_group() RPC를 통해서만 — security definer로 insert)

-- ddok_group_questions 정책
create policy "ddok members can read group questions"
  on public.ddok_group_questions for select
  to authenticated
  using (public.ddok_is_group_member(group_id));

create policy "ddok members can add group questions"
  on public.ddok_group_questions for insert
  to authenticated
  with check (public.ddok_is_group_member(group_id) and created_by = auth.uid());

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

-- ddok_group_answers 정책
create policy "ddok members can read answers in their groups"
  on public.ddok_group_answers for select
  to authenticated
  using (
    exists (
      select 1 from public.ddok_group_questions q
      where q.id = group_question_id and public.ddok_is_group_member(q.group_id)
    )
  );

create policy "ddok members can write their own answer"
  on public.ddok_group_answers for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.ddok_group_questions q
      where q.id = group_question_id and public.ddok_is_group_member(q.group_id)
    )
  );

create policy "ddok members can update their own answer"
  on public.ddok_group_answers for update
  to authenticated
  using (user_id = auth.uid());

-- ddok_group_missions 정책
create policy "ddok members can read group missions"
  on public.ddok_group_missions for select
  to authenticated
  using (public.ddok_is_group_member(group_id));

create policy "ddok members can add group missions"
  on public.ddok_group_missions for insert
  to authenticated
  with check (public.ddok_is_group_member(group_id) and created_by = auth.uid());

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

-- ddok_group_mission_done 정책
create policy "ddok members can read mission completion in their groups"
  on public.ddok_group_mission_done for select
  to authenticated
  using (
    exists (
      select 1 from public.ddok_group_missions m
      where m.id = group_mission_id and public.ddok_is_group_member(m.group_id)
    )
  );

create policy "ddok members can toggle their own mission completion"
  on public.ddok_group_mission_done for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.ddok_group_missions m
      where m.id = group_mission_id and public.ddok_is_group_member(m.group_id)
    )
  );

create policy "ddok members can remove their own mission completion"
  on public.ddok_group_mission_done for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 개인 기록/질문/미션/독서현황을 함께읽기 모임에 공유하기 (여러 모임 동시 공유 가능)
-- item_type + item_id로 대상을 가리키는 범용 테이블 하나로 record/question/mission/book
-- 네 가지를 모두 처리한다. (ddok_groups, ddok_is_group_member 정의 이후에 와야 하므로
-- 파일 뒷부분에 위치)
-- ----------------------------------------------------------------------------
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

-- 책 제목을 그대로 복사해두어 다른 멤버가 공유된 항목을 볼 때도 표시할 수 있게 함
-- (ddok_books는 owner만 조회 가능한 RLS라 다른 멤버가 조인해서 제목을 못 읽기 때문)
alter table public.ddok_records add column if not exists book_title text not null default '';
alter table public.ddok_questions add column if not exists book_title text not null default '';
alter table public.ddok_missions add column if not exists book_title text not null default '';

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

-- 멤버 독서 현황판: 지금 읽고 있는 책을 모임에 공유
create policy "ddok members can view shared books"
  on public.ddok_books for select
  to authenticated
  using (exists (
    select 1 from public.ddok_shares s
    where s.item_type = 'book' and s.item_id = ddok_books.id and public.ddok_is_group_member(s.group_id)
  ));

-- ----------------------------------------------------------------------------
-- ddok_question_answers : 공유된 개인 AI 질문 노트에 다른 멤버가 남기는 답변
-- ----------------------------------------------------------------------------
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

create policy "ddok members can update their own answer to shared questions"
  on public.ddok_question_answers for update
  to authenticated
  using (user_id = auth.uid());

create policy "ddok members can delete their own answer to shared questions"
  on public.ddok_question_answers for delete
  to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Storage : 책 표지 이미지 버킷 (ddok-covers — 다른 앱의 버킷과 겹치지 않도록 이름 지정)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ddok-covers', 'ddok-covers', true)
on conflict (id) do nothing;

create policy "ddok anyone can view cover images"
  on storage.objects for select
  using (bucket_id = 'ddok-covers');

create policy "ddok signed-in users can upload cover images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ddok-covers');

create policy "ddok owners can update their own cover images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'ddok-covers' and owner = auth.uid());

create policy "ddok owners can delete their own cover images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'ddok-covers' and owner = auth.uid());
