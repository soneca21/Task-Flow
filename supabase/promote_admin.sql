-- Promover usuario a admin (execute no Supabase SQL Editor com Service Role)
-- Troque o email abaixo pelo email do usuario alvo.

update auth.users
set raw_user_meta_data = jsonb_set(
  coalesce(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'::jsonb,
  true
)
where email = 'wesley.sony5@gmail.com';

-- Opcional: confirme o resultado
select id, email, raw_user_meta_data
from auth.users
where email = 'wesley.sony5@gmail.com';
