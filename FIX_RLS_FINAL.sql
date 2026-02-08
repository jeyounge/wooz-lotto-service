
-- RLS 완전 초기화 및 전체 개방 (디버깅용)

-- 1. RLS 활성화 확인 (혹시 꺼져있으면 켭니다 - 보통 켜져있어야 정책이 먹힘)
alter table "public"."predictions" enable row level security;

-- 2. 기존 정책 싹 삭제 (충돌 방지)
drop policy if exists "Enable insert for anon" on "public"."predictions";
drop policy if exists "Enable update for anon" on "public"."predictions";
drop policy if exists "Enable update for all" on "public"."predictions";
drop policy if exists "Enable read for all" on "public"."predictions";
drop policy if exists "Enable delete for all" on "public"."predictions";
drop policy if exists "ALL_ACCESS_POLICY" on "public"."predictions";

-- 3. 통합 정책 생성 (Select, Insert, Update, Delete 모두 허용)
create policy "ALL_ACCESS_POLICY" on "public"."predictions"
as permissive
for all 
to public
using (true)
with check (true);

-- 4. lotto_history 등 다른 테이블도 혹시 모르니 읽기 허용
create policy "Read history" on "public"."lotto_history"
as permissive for select to public using (true);
