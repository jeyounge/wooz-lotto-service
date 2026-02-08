
-- "public" 역할에 권한을 주면, 익명(anon)과 로그인 유저(authenticated) 모두 포함됩니다.
-- 기존에 부분적으로 적용된 정책이 있다면 삭제하고, 전체 허용으로 다시 만듭니다.

drop policy if exists "Enable update for anon" on "public"."predictions";
drop policy if exists "Enable update for all" on "public"."predictions";

create policy "Enable update for all" on "public"."predictions"
as permissive for update
to public
using (true)
with check (true);
