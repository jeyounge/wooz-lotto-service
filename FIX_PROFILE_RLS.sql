-- profiles 테이블에 대한 Insert 정책 추가 (본인 아이디로만 가능)
create policy "Users can insert their own profile" on "public"."profiles"
as permissive for insert
to authenticated
with check (auth.uid() = id);

-- (참고) 혹시 Select나 Update 정책이 없다면 같이 추가해야 합니다.
create policy "Users can view their own profile" on "public"."profiles"
as permissive for select
to public
using (true); -- 닉네임은 공개해도 되면 public, 아니면 authenticated

create policy "Users can update their own profile" on "public"."profiles"
as permissive for update
to authenticated
using (auth.uid() = id);
