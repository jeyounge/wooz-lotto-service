
-- 'predictions' 테이블과 'profiles' 테이블을 연결하는 '외래키(Foreign Key)'가 없어서 에러가 났습니다.
-- 아래 코드를 실행하면 두 테이블이 연결되어, 닉네임을 가져올 수 있게 됩니다.

alter table "public"."predictions"
add constraint "predictions_user_id_fkey"
foreign key ("user_id")
references "public"."profiles" ("id")
on delete set null; 

-- 혹시 이미 존재한다는 에러가 나면 무시하셔도 됩니다.
-- 이 명령어가 실행되면 Supabase가 자동으로 스키마 캐시를 갱신합니다.
