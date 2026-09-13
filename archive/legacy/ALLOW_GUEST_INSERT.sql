-- 1. predictions 테이블의 user_id가 필수(Not Null)라면 Null 허용으로 변경해야 합니다.
alter table "public"."predictions" alter column "user_id" drop not null;

-- 2. 비로그인(anon) 유저도 Insert 할 수 있도록 권한 부여
create policy "Enable insert for anon" on "public"."predictions"
as permissive for insert
to anon
with check (true);

-- (참고) 만약 이미 insert 정책이 있다면, 아래처럼 기존 정책을 수정하거나 추가해야 합니다.
-- Supabase Dashboard -> Table Editor -> predictions -> RLS Policies 에서 확인 가능
