-- 1. profiles 테이블의 외래키 제약조건 수정 (유저 삭제시 프로필도 같이 삭제)
-- 기존 제약조건 이름을 모를 수 있으므로, 제약조건을 삭제하고 다시 만듭니다.
-- 보통 이름은 "profiles_id_fkey" 같은 식입니다.

alter table "public"."profiles"
drop constraint if exists "profiles_id_fkey";

alter table "public"."profiles"
add constraint "profiles_id_fkey"
foreign key ("id")
references "auth"."users" ("id")
on delete cascade;

-- 2. predictions 테이블의 외래키 제약조건 수정 (유저 삭제시 예측기록도 같이 삭제 - 선택사항)
-- 예측 기록을 남기고 싶다면 'set null'을, 지우고 싶다면 'cascade'를 씁니다.
-- 보통은 깔끔하게 지우는 게 좋습니다.

alter table "public"."predictions"
drop constraint if exists "predictions_user_id_fkey";

alter table "public"."predictions"
add constraint "predictions_user_id_fkey"
foreign key ("user_id")
references "auth"."users" ("id")
on delete cascade;
