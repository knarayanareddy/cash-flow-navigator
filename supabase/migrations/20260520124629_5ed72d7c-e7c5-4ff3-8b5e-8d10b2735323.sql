-- Make set_updated_at a SECURITY INVOKER with locked search_path
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user must stay SECURITY DEFINER (it inserts into profiles
-- from the auth.users trigger), but revoke direct execute from API roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;