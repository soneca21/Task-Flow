-- Promote a user to admin (DEV/SQL Editor only)
--
-- This requires running with a role that can update `auth.users` (service role / SQL Editor).
-- Replace the UUID below with the user's `auth.uid()` (you can copy it from "Meu Perfil").
--
-- After running, the user must log out and log in again to refresh the JWT.

do $$
declare
  target_user uuid := '00000000-0000-0000-0000-000000000000';
begin
  update auth.users
     set raw_user_meta_data = jsonb_set(
       coalesce(raw_user_meta_data, '{}'::jsonb),
       '{role}',
       to_jsonb('admin'::text),
       true
     )
   where id = target_user;

  update public.funcionario
     set nivel_acesso = 'admin'
   where user_id = target_user;
end $$;

