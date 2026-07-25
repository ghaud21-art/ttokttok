-- ============================================================================
-- 마이그레이션: 관리자 권한 + AI 사용량 제한 + 전역 AI on/off 설정
-- Supabase 대시보드 → SQL Editor에 이 파일만 붙여넣어 실행하세요.
-- ============================================================================

alter table public.ddok_profiles add column if not exists is_admin boolean not null default false;
alter table public.ddok_profiles add column if not exists ai_uses_count int not null default 0;

-- 클라이언트가 직접 못 바꾸게 컬럼 단위로 권한을 뺀다 (서버의 service role만 변경 가능)
revoke update (is_admin, ai_uses_count) on public.ddok_profiles from authenticated;

create or replace function public.ddok_is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select coalesce((select is_admin from public.ddok_profiles where id = auth.uid()), false);
$$;

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

-- ============================================================================
-- 마지막으로, 본인 계정을 관리자로 지정하세요 (이메일 주소를 본인 것으로 바꿔서 실행):
--
-- update public.ddok_profiles set is_admin = true
--   where id = (select id from auth.users where email = '본인이메일@example.com');
-- ============================================================================
