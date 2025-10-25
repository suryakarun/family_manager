create or replace function public.get_family_members_with_email(fam_id uuid)
returns table (
  family_member_id uuid,
  user_id uuid,
  profile_id uuid,
  full_name text,
  email text,
  role text
)
language sql
security definer
set search_path = public, auth
as $$
  select
    fm.id           as family_member_id,
    fm.user_id      as user_id,
    p.id            as profile_id,   -- profiles.id == auth.users.id
    p.full_name,
    u.email,
    fm.role
  from public.family_members fm
  join public.profiles p on p.id = fm.user_id     -- OK: fm.user_id -> profiles.id
  join auth.users u      on u.id = p.id           -- FIX: join on p.id, not p.user_id
  where fm.family_id = fam_id;
$$;

revoke all on function public.get_family_members_with_email(uuid) from public;
grant execute on function public.get_family_members_with_email(uuid) to anon, authenticated;
