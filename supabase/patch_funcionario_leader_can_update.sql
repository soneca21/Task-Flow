-- Patch: permite que Líder/Admin atualize funcionários (além do próprio usuário).
-- Execute no Supabase SQL Editor.

alter table public.funcionario enable row level security;

drop policy if exists funcionario_update on public.funcionario;

create policy funcionario_update on public.funcionario
  for update using (
    auth.role() = 'authenticated'
    and (coalesce(auth.jwt()->'user_metadata'->>'role', '') in ('admin','lider') or user_id = auth.uid())
  )
  with check (
    auth.role() = 'authenticated'
    and (coalesce(auth.jwt()->'user_metadata'->>'role', '') in ('admin','lider') or user_id = auth.uid())
  );

