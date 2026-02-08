
-- 익명(Guest) 및 모든 유저가 자신의 예측 결과(status, rank, prize 등)를 
-- 업데이트 할 수 있도록 허용하는 정책입니다.
-- (ResultProcessor가 클라이언트 사이드에서 이 업데이트를 수행함)

create policy "Enable update for anon" on "public"."predictions"
as permissive for update
to anon
using (true)
with check (true);
