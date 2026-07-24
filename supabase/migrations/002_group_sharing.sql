-- ============================================================================
-- 마이그레이션: 개인 기록/AI 질문/AI 미션을 함께읽기 모임에 공유하는 기능
-- 이미 supabase/schema.sql을 한 번 실행한 프로젝트라면, 전체를 다시 실행하지 말고
-- 이 파일만 SQL Editor에 붙여넣어 실행하세요. (schema.sql에도 동일 내용이 포함되어
-- 있어서, 앞으로 새로 프로젝트를 만들 때는 schema.sql 한 번만 실행하면 됩니다.)
-- ============================================================================

alter table public.ddok_records add column if not exists shared_group_id uuid references public.ddok_groups(id) on delete set null;
alter table public.ddok_questions add column if not exists shared_group_id uuid references public.ddok_groups(id) on delete set null;
alter table public.ddok_missions add column if not exists shared_group_id uuid references public.ddok_groups(id) on delete set null;

-- 책 제목을 그대로 복사해두어 다른 멤버가 공유된 항목을 볼 때도 표시할 수 있게 함
-- (ddok_books는 owner만 조회 가능한 RLS라 다른 멤버가 조인해서 제목을 못 읽기 때문)
alter table public.ddok_records add column if not exists book_title text not null default '';
alter table public.ddok_questions add column if not exists book_title text not null default '';
alter table public.ddok_missions add column if not exists book_title text not null default '';

-- 기존에 이미 저장된 행들에도 현재 책 제목을 채워 넣기 (owner 본인 것만 RLS로 갱신 가능하므로
-- 이 UPDATE는 각 사용자가 로그인한 세션에서 실행해도 자기 데이터만 채워짐 — 관리자 SQL Editor에서
-- 실행하면 service_role 권한으로 전체 사용자 데이터가 채워집니다)
update public.ddok_records r set book_title = b.title from public.ddok_books b where r.book_id = b.id and r.book_title = '';
update public.ddok_questions q set book_title = b.title from public.ddok_books b where q.book_id = b.id and q.book_title = '';
update public.ddok_missions m set book_title = b.title from public.ddok_books b where m.book_id = b.id and m.book_title = '';

create index if not exists ddok_records_shared_group_idx on public.ddok_records(shared_group_id);
create index if not exists ddok_questions_shared_group_idx on public.ddok_questions(shared_group_id);
create index if not exists ddok_missions_shared_group_idx on public.ddok_missions(shared_group_id);

create policy "ddok members can view records shared to their group"
  on public.ddok_records for select
  to authenticated
  using (shared_group_id is not null and public.ddok_is_group_member(shared_group_id));

create policy "ddok members can view questions shared to their group"
  on public.ddok_questions for select
  to authenticated
  using (shared_group_id is not null and public.ddok_is_group_member(shared_group_id));

create policy "ddok members can view missions shared to their group"
  on public.ddok_missions for select
  to authenticated
  using (shared_group_id is not null and public.ddok_is_group_member(shared_group_id));
